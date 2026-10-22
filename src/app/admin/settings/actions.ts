'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-admin';
import { getSettings, updateSettings } from '@/lib/settings';
import { sendMail, testSmtpConnection } from '@/lib/mailer';
import { field, isEmail } from '@/lib/validate';
import { go } from '@/lib/nav';

export async function saveOtpSettings(fd: FormData): Promise<void> {
  await requireAdmin();
  const otpRequired = fd.get('otp_required') === 'true';
  const adminNotifyEmail = field(fd, 'admin_notify_email').toLowerCase();

  if (adminNotifyEmail && !isEmail(adminNotifyEmail)) {
    go('/admin/settings', { err: 'Please enter a valid admin notification email address.' });
  }

  const res = await updateSettings({
    otp_required: otpRequired,
    admin_notify_email: adminNotifyEmail,
  });

  if (res.error) {
    go('/admin/settings', { err: `Could not save OTP settings: ${res.error}` });
  }

  go('/admin/settings', {
    msg: otpRequired
      ? 'OTP login enabled. Users will need the 6-digit code received on your admin email.'
      : 'OTP login disabled. Users can now sign in using their email and event password only.',
  });
}

export async function saveSmtpSettings(fd: FormData): Promise<void> {
  await requireAdmin();
  const smtpHost = field(fd, 'smtp_host');
  const smtpPort = parseInt(field(fd, 'smtp_port') || '587', 10);
  const smtpUser = field(fd, 'smtp_user');
  const smtpPass = String(fd.get('smtp_pass') ?? '');
  const smtpFrom = field(fd, 'smtp_from');
  const smtpSecure = fd.get('smtp_secure') === 'true';

  if (!smtpHost && !smtpUser && !smtpPass && !smtpFrom) {
    // Clearing settings
    await updateSettings({
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_pass: '',
      smtp_from: '',
      smtp_secure: false,
    });
    go('/admin/settings', { msg: 'SMTP configuration cleared.' });
  }

  if (!smtpHost) go('/admin/settings', { err: 'SMTP host is required (e.g., smtp.gmail.com).' });
  if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    go('/admin/settings', { err: 'SMTP port must be a valid port number (e.g., 587 or 465).' });
  }
  if (!smtpUser) go('/admin/settings', { err: 'SMTP username/email is required.' });
  if (!smtpPass) go('/admin/settings', { err: 'SMTP password or App Password is required.' });
  if (!smtpFrom) go('/admin/settings', { err: 'Sender / From address is required.' });

  const res = await updateSettings({
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: smtpUser,
    smtp_pass: smtpPass,
    smtp_from: smtpFrom,
    smtp_secure: smtpSecure,
  });

  if (res.error) {
    go('/admin/settings', { err: `Could not save SMTP settings: ${res.error}` });
  }

  go('/admin/settings', { msg: 'SMTP configuration saved successfully! You can test it below.' });
}

export async function sendTestEmailAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const to = field(fd, 'test_email').toLowerCase();
  if (!isEmail(to)) {
    go('/admin/settings', { err: 'Please enter a valid recipient email address for testing.' });
  }

  const settings = await getSettings();
  if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass || !settings.smtp_from) {
    go('/admin/settings', { err: 'Please configure and save your SMTP settings first.' });
  }

  const err = await testSmtpConnection(settings, to);
  if (err) {
    go('/admin/settings', { err: `Failed to send test email: ${err}` });
  }

  go('/admin/settings', { msg: `Test email sent successfully to ${to}! Please check your inbox or spam folder.` });
}
