/**
 * Lightweight SMTP mailer using raw sockets (no npm dependency).
 * Supports STARTTLS and AUTH LOGIN, which covers most providers
 * (Gmail app passwords, Brevo, SendGrid, Mailgun, generic SMTP).
 *
 * We avoid adding nodemailer to keep the dependency tree small.
 */

import { connect } from 'node:net';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';
import type { AdminSettings } from '@/lib/settings';

type MailOpts = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
};

function base64(s: string) {
  return Buffer.from(s).toString('base64');
}

async function readLine(sock: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk: Buffer) => {
      buf += chunk.toString('utf8');
      const nl = buf.indexOf('\r\n');
      if (nl !== -1) {
        sock.removeListener('data', onData);
        resolve(buf.slice(0, nl));
      }
    };
    sock.on('data', onData);
    sock.on('error', reject);
    sock.on('close', () => reject(new Error('SMTP connection closed unexpectedly')));
  });
}

async function readAll(sock: NodeJS.ReadableStream, timeout = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => {
      sock.removeAllListeners('data');
      resolve(buf);
    }, timeout);
    const onData = (chunk: Buffer) => {
      buf += chunk.toString('utf8');
      // Multi-line responses: keep reading until a line starts with "NNN " (not "NNN-")
      const lines = buf.split('\r\n');
      for (const line of lines) {
        if (/^\d{3} /.test(line)) {
          clearTimeout(timer);
          sock.removeListener('data', onData);
          resolve(buf);
          return;
        }
      }
    };
    sock.on('data', onData);
    sock.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

async function send(sock: NodeJS.WritableStream & NodeJS.ReadableStream, cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    sock.write(cmd + '\r\n', 'utf8', (err?: Error | null) => {
      if (err) return reject(err);
    });
    readAll(sock).then(resolve).catch(reject);
  });
}

function buildMime(from: string, to: string, subject: string, text: string, html?: string): string {
  const boundary = `=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Date: ${new Date().toUTCString()}`,
  ];

  if (html) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    return [
      ...headers,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      text,
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      html,
      `--${boundary}--`,
    ].join('\r\n');
  }

  headers.push('Content-Type: text/plain; charset=utf-8');
  return [...headers, '', text].join('\r\n');
}

/**
 * Send an email using the SMTP settings stored in admin_settings.
 * Returns null on success, or an error string.
 */
export async function sendMail(settings: AdminSettings, opts: MailOpts): Promise<string | null> {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure } = settings;
  if (!smtp_host || !smtp_user || !smtp_pass || !smtp_from) {
    return 'SMTP is not configured. Ask the admin to set it up in Settings.';
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve('SMTP connection timed out'), 15000);

    const finish = (err: string | null) => {
      clearTimeout(timeout);
      resolve(err);
    };

    const run = async (sock: any) => {
      try {
        await readAll(sock, 3000); // greeting
        let resp = await send(sock, `EHLO localhost`);

        // STARTTLS on port 587 / non-465
        if (!smtp_secure && resp.includes('STARTTLS')) {
          await send(sock, 'STARTTLS');
          const upgraded: TLSSocket = await new Promise((res, rej) => {
            const tls = tlsConnect({ socket: sock, servername: smtp_host }, () => res(tls));
            tls.on('error', rej);
          });
          sock = upgraded;
          await send(sock, `EHLO localhost`);
        }

        // AUTH LOGIN
        let auth = await send(sock, 'AUTH LOGIN');
        if (!auth.startsWith('334')) { finish(`SMTP AUTH rejected: ${auth}`); return; }
        auth = await send(sock, base64(smtp_user));
        if (!auth.startsWith('334')) { finish(`SMTP username rejected: ${auth}`); return; }
        auth = await send(sock, base64(smtp_pass));
        if (!auth.startsWith('235')) { finish(`SMTP password rejected: ${auth}`); return; }

        const mailFrom = await send(sock, `MAIL FROM:<${smtp_from}>`);
        if (!mailFrom.startsWith('250')) { finish(`MAIL FROM rejected: ${mailFrom}`); return; }

        const rcptTo = await send(sock, `RCPT TO:<${opts.to}>`);
        if (!rcptTo.startsWith('250')) { finish(`RCPT TO rejected: ${rcptTo}`); return; }

        const dataCmd = await send(sock, 'DATA');
        if (!dataCmd.startsWith('354')) { finish(`DATA rejected: ${dataCmd}`); return; }

        const body = buildMime(smtp_from, opts.to, opts.subject, opts.textBody, opts.htmlBody);
        const dataEnd = await send(sock, body + '\r\n.');
        if (!dataEnd.startsWith('250')) { finish(`Message rejected: ${dataEnd}`); return; }

        await send(sock, 'QUIT').catch(() => {});
        sock.destroy?.();
        finish(null);
      } catch (e: any) {
        finish(`SMTP error: ${e.message ?? e}`);
      }
    };

    if (smtp_secure || smtp_port === 465) {
      const sock = tlsConnect({ host: smtp_host, port: smtp_port, servername: smtp_host }, () => run(sock));
      sock.on('error', (e) => finish(`SMTP TLS error: ${e.message}`));
    } else {
      const sock = connect(smtp_port, smtp_host, () => run(sock));
      sock.on('error', (e) => finish(`SMTP error: ${e.message}`));
    }
  });
}

/** Build the OTP email body for participants. */
export function otpEmailBody(code: string, eventTitle: string, personName: string, expiryMin: number) {
  const text = `Hi ${personName},\n\nYour one-time login code for "${eventTitle}" is:\n\n  ${code}\n\nThis code expires in ${expiryMin} minutes and works only once.\n\nIf you did not request this, you can ignore this email.\n\n– Event Splitter`;

  const html = `
<!doctype html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#fff7e8;padding:30px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:2px solid #1b1f2a;border-radius:18px;padding:28px;box-shadow:6px 6px 0 #1b1f2a;">
    <h2 style="margin:0 0 4px;color:#1b1f2a;font-size:22px;">Your login code</h2>
    <p style="color:#6b6455;margin:0 0 18px;">For <strong>${eventTitle}</strong></p>
    <div style="font:800 36px Georgia,serif;letter-spacing:0.3em;padding:16px;background:#fff3c4;border:2px dashed #1b1f2a;border-radius:12px;text-align:center;color:#1b1f2a;">
      ${code}
    </div>
    <p style="margin:18px 0 0;color:#6b6455;font-size:14px;">
      Hi ${personName}, use this code within <strong>${expiryMin} minutes</strong>. It works only once.<br>
      If you didn't request this, ignore this email.
    </p>
  </div>
</body>
</html>`.trim();

  return { text, html };
}

/** Build the OTP email body sent to the ADMIN when a participant requests or needs a code. */
export function otpEmailForAdmin(code: string, eventTitle: string, personName: string, personEmail: string, expiryMin: number) {
  const text = `Hi Admin,\n\nParticipant "${personName}" (${personEmail}) has requested a login OTP code for "${eventTitle}":\n\n  OTP CODE: ${code}\n\nThis code is valid for ${expiryMin} minutes and can only be used once.\nPlease share this code with ${personName} to allow them into the event.\n\n– Event Splitter`;

  const html = `
<!doctype html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#fff7e8;padding:30px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border:2px solid #1b1f2a;border-radius:18px;padding:28px;box-shadow:6px 6px 0 #1b1f2a;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#d9381e;margin-bottom:6px;">Admin Login Code Alert</div>
    <h2 style="margin:0 0 4px;color:#1b1f2a;font-size:22px;">Participant Login Request</h2>
    <p style="color:#6b6455;margin:0 0 16px;font-size:14px;">
      <strong>${personName}</strong> (<code>${personEmail}</code>) is signing in to <strong>${eventTitle}</strong>.
    </p>
    <div style="font:800 36px Georgia,serif;letter-spacing:0.3em;padding:16px;background:#fff3c4;border:2px dashed #1b1f2a;border-radius:12px;text-align:center;color:#1b1f2a;margin-bottom:16px;">
      ${code}
    </div>
    <p style="margin:0;color:#6b6455;font-size:13px;line-height:1.6;">
      This code expires in <strong>${expiryMin} minutes</strong> and works only once.<br>
      Share this code with <strong>${personName}</strong> to allow them to enter the event.
    </p>
  </div>
</body>
</html>`.trim();

  return { text, html };
}

/** Send a test email to verify SMTP configuration. Returns error string or null if successful. */
export async function testSmtpConnection(settings: AdminSettings, to: string): Promise<string | null> {
  const text = `Hello from Event Splitter!\n\nYour SMTP configuration is working correctly.\n\nServer: ${settings.smtp_host}:${settings.smtp_port}\nSender: ${settings.smtp_from}\nSecurity: ${settings.smtp_secure ? 'SSL/TLS' : 'STARTTLS'}\nTimestamp: ${new Date().toISOString()}\n\nYou can now send OTP login codes reliably!`;

  const html = `
<!doctype html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#fff7e8;padding:30px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:2px solid #1b1f2a;border-radius:18px;padding:26px;box-shadow:6px 6px 0 #1b1f2a;">
    <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:#2e7d32;color:#fff;font-weight:700;font-size:12px;margin-bottom:12px;">✅ SMTP Connected</div>
    <h2 style="margin:0 0 8px;color:#1b1f2a;font-size:22px;">Test email successful!</h2>
    <p style="color:#6b6455;margin:0 0 16px;font-size:14px;">
      Your Event Splitter email service is configured and ready to dispatch OTP codes.
    </p>
    <div style="font-size:13px;background:#fbf1da;padding:12px 14px;border-radius:10px;border:1px solid #e8dcc4;color:#1b1f2a;">
      <div><strong>Host:</strong> ${settings.smtp_host}:${settings.smtp_port}</div>
      <div><strong>Sender:</strong> ${settings.smtp_from}</div>
      <div><strong>Mode:</strong> ${settings.smtp_secure ? 'SSL/TLS (Port 465)' : 'STARTTLS (Port 587)'}</div>
    </div>
  </div>
</body>
</html>`.trim();

  return sendMail(settings, {
    to,
    subject: 'Event Splitter – SMTP Test Successful',
    textBody: text,
    htmlBody: html,
  });
}
