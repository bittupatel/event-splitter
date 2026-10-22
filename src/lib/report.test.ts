import { describe, expect, it } from 'vitest';
import { buildBundle } from './event-data';
import { buildReportHtml } from './report';
import type { EventRow, ExpenseRow, ParticipantRow } from './types';

const event: EventRow = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Lantern <b>Night</b>',
  tagline: null,
  theme: 'lantern',
  starts_on: '2026-10-20',
  ends_on: null,
  is_live: true,
  created_at: '2026-10-01T00:00:00Z',
};
const mk = (id: string, name: string): ParticipantRow => ({
  id, event_id: event.id, display_name: name, email: `${name.toLowerCase()}@x.test`, emoji: '🎉', note: null,
});
const people = ['Rekha', 'Arun', 'Rahul', 'Nikita', 'Viren'].map((n) => mk(n, n));
const exp = (id: string, title: string, paise: number, by: string): ExpenseRow => ({
  id, event_id: event.id, spent_on: '2026-10-20', title, amount_paise: paise, paid_by: by, added_by: 'admin', created_at: '',
});

describe('buildReportHtml', () => {
  const html = buildReportHtml(
    buildBundle(event, people, [exp('1', 'Pizza', 40000, 'Arun'), exp('2', '<script>alert(1)</script>', 3500, 'Rahul')]),
    new Date('2026-10-20T10:00:00Z'),
  );

  it('contains totals, share and settlements', () => {
    expect(html).toContain('₹435');
    expect(html).toContain('₹87');
    expect(html).toContain('pays →');
    expect(html).toContain('₹52');
  });

  it('includes SVG charts and is fully self-contained', () => {
    expect((html.match(/<svg/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('escapes user content', () => {
    expect(html).not.toContain('<b>Night</b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
