import { db } from '@/lib/supabase/admin';
import { adminEmails } from '@/lib/auth-admin';

export type AdminSettings = {
  otp_required: boolean;
  admin_notify_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_secure: boolean;
};

const DEFAULTS: AdminSettings = {
  otp_required: true,
  admin_notify_email: '',
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  smtp_from: '',
  smtp_secure: true,
};

/** Fetch the single-row admin settings. Never null. */
export async function getSettings(): Promise<AdminSettings> {
  const { data } = await db()
    .from('admin_settings')
    .select('otp_required,admin_notify_email,smtp_host,smtp_port,smtp_user,smtp_pass,smtp_from,smtp_secure')
    .eq('id', 1)
    .maybeSingle();
  return (data as AdminSettings | null) ?? DEFAULTS;
}

/** Upsert admin settings. Only the supplied keys are changed. */
export async function updateSettings(patch: Partial<AdminSettings>): Promise<{ error?: string }> {
  const { error } = await db()
    .from('admin_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1);
  return error ? { error: error.message } : {};
}

/** True when the SMTP fields have been filled in. */
export function smtpReady(s: AdminSettings): boolean {
  return Boolean(s.smtp_host && s.smtp_user && s.smtp_pass && s.smtp_from);
}

/** Resolves the email address where admin OTPs and notifications should be sent. */
export async function getAdminNotificationEmail(settings?: AdminSettings): Promise<string> {
  const s = settings ?? (await getSettings());
  if (s.admin_notify_email && s.admin_notify_email.trim()) {
    return s.admin_notify_email.trim();
  }
  const configured = adminEmails();
  return configured[0] ?? '';
}

