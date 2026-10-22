import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Backdrop } from '@/components/Backdrop';
import { getAdmin } from '@/lib/auth-admin';
import { AdminLoginForm } from './AdminLoginForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Organiser sign-in',
  description: 'Sign in to create events, manage people, issue one-time codes and export reports.',
  robots: { index: false },
};

export default async function AdminLogin() {
  if (await getAdmin()) redirect('/admin');
  return (
    <>
      <Backdrop theme="twirl" />
      <main className="wrap" style={{ maxWidth: 520 }}>
        <p><Link href="/">← All events</Link></p>
        <div className="card">
          <h1 style={{ fontSize: '2.2rem' }}>Organiser sign-in</h1>
          <p className="muted">Only the confirmed administrator email can manage events.</p>
          <AdminLoginForm />
        </div>
      </main>
    </>
  );
}
