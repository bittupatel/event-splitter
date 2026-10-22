import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/auth-admin';
import { getMemberSession } from '@/lib/session';
import { loadEventBundle } from '@/lib/event-data';
import { buildReportHtml } from '@/lib/report';
import { isUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admin = await getAdmin();
  const member = !admin ? await getMemberSession(id) : null;
  if (!admin && !member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bundle = await loadEventBundle(id);
  if (!bundle) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const slug = bundle.event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'event';
  const inline = new URL(req.url).searchParams.get('inline') === '1';
  return new NextResponse(buildReportHtml(bundle), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // The report is static HTML+SVG: lock it down so previews can never run script.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      'Cache-Control': 'no-store',
      ...(inline ? {} : { 'Content-Disposition': `attachment; filename="${slug}-report.html"` }),
    },
  });
}
