import { describe, expect, it } from 'vitest';
import { summarize } from './settle';
import { parseRupeesToPaise } from './money';

const names = ['Rekha', 'Arun', 'Rahul', 'Nikita', 'Viren'];
const people = names.map((n) => ({ id: n, name: n }));

describe('summarize', () => {
  it('handles the Pizza + Mazza example: ₹435 / 5 = ₹87 each', () => {
    const s = summarize(people, [
      { id: '1', date: '2026-10-20', title: 'Pizza', amount: 40000, paidBy: 'Arun' },
      { id: '2', date: '2026-10-20', title: 'Mazza', amount: 3500, paidBy: 'Rahul' },
    ]);
    expect(s.total).toBe(43500);
    expect(s.people.every((p) => p.share === 8700)).toBe(true);

    const bal = Object.fromEntries(s.people.map((p) => [p.id, p.balance]));
    expect(bal.Arun).toBe(31300); // gets ₹313
    expect(bal.Rahul).toBe(-5200); // owes ₹52
    expect(bal.Rekha).toBe(-8700);

    expect(s.settlements).toHaveLength(4);
    const sorted = [...s.settlements].sort((a, b) => a.from.localeCompare(b.from));
    expect(sorted).toEqual([
      { from: 'Nikita', to: 'Arun', amount: 8700 },
      { from: 'Rahul', to: 'Arun', amount: 5200 },
      { from: 'Rekha', to: 'Arun', amount: 8700 },
      { from: 'Viren', to: 'Arun', amount: 8700 },
    ]);

    expect(s.days).toHaveLength(1);
    expect(s.days[0].total).toBe(43500);
    expect(s.days[0].payers.map((p) => [p.name, p.amount])).toEqual([
      ['Arun', 40000],
      ['Rahul', 3500],
    ]);
  });

  it('keeps shares summing to the total when it does not divide evenly', () => {
    const three = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
    const s = summarize(three, [{ id: '1', date: '2026-01-01', title: 'x', amount: 100, paidBy: 'a' }]);
    expect(s.people.reduce((t, p) => t + p.share, 0)).toBe(100);
    expect(s.people.reduce((t, p) => t + p.balance, 0)).toBe(0);
    const moved = s.settlements.reduce((t, x) => t + x.amount, 0);
    const owed = s.people.filter((p) => p.balance > 0).reduce((t, p) => t + p.balance, 0);
    expect(moved).toBe(owed);
  });

  it('settles to zero for every person after transfers', () => {
    const s = summarize(people, [
      { id: '1', date: '2026-01-01', title: 'a', amount: 123457, paidBy: 'Rekha' },
      { id: '2', date: '2026-01-02', title: 'b', amount: 9999, paidBy: 'Viren' },
      { id: '3', date: '2026-01-02', title: 'c', amount: 50001, paidBy: 'Nikita' },
    ]);
    const net = new Map(s.people.map((p) => [p.id, p.balance]));
    for (const t of s.settlements) {
      net.set(t.from, net.get(t.from)! + t.amount);
      net.set(t.to, net.get(t.to)! - t.amount);
    }
    expect([...net.values()].every((v) => v === 0)).toBe(true);
    expect(s.days.map((d) => d.date)).toEqual(['2026-01-01', '2026-01-02']);
  });

  it('returns an empty, balanced summary with no expenses', () => {
    const s = summarize(people, []);
    expect(s.total).toBe(0);
    expect(s.settlements).toEqual([]);
  });

  it('rejects an unknown payer and bad amounts', () => {
    expect(() => summarize(people, [{ id: '1', date: '2026-01-01', title: 'x', amount: 100, paidBy: 'ghost' }])).toThrow();
    expect(() => summarize(people, [{ id: '1', date: '2026-01-01', title: 'x', amount: 0, paidBy: 'Arun' }])).toThrow();
  });
});

describe('parseRupeesToPaise', () => {
  it('parses valid amounts', () => {
    expect(parseRupeesToPaise('400')).toBe(40000);
    expect(parseRupeesToPaise('₹1,250.5')).toBe(125050);
    expect(parseRupeesToPaise('35.25')).toBe(3525);
  });
  it('rejects invalid amounts', () => {
    for (const bad of ['', '0', '-5', 'abc', '1.234', '1e5', '99999999999']) {
      expect(parseRupeesToPaise(bad)).toBeNull();
    }
  });
});
