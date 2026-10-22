/**
 * Equal-split + settlement math. Everything is integer paise, so there is no
 * floating point drift. If the total does not divide evenly, the leftover paise
 * are spread one each over the first people (ordered by id) so shares always sum
 * exactly to the total.
 */

export type Person = { id: string; name: string; emoji?: string };
export type Exp = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  amount: number; // paise
  paidBy: string; // person id
  addedBy?: string;
};
export type PersonBalance = {
  id: string;
  name: string;
  emoji?: string;
  paid: number;
  share: number;
  balance: number; // >0 gets money back, <0 owes
};
export type Settlement = { from: string; to: string; amount: number };
export type DayPayer = { id: string; name: string; amount: number };
export type DaySummary = { date: string; total: number; items: Exp[]; payers: DayPayer[] };
export type EventSummary = {
  total: number;
  count: number;
  people: PersonBalance[];
  settlements: Settlement[];
  days: DaySummary[]; // oldest first
};

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function summarize(people: Person[], expenses: Exp[]): EventSummary {
  const n = people.length;
  const paid = new Map<string, number>(people.map((p) => [p.id, 0]));
  let total = 0;

  for (const e of expenses) {
    if (!Number.isInteger(e.amount) || e.amount <= 0) throw new Error('Invalid amount');
    const cur = paid.get(e.paidBy);
    if (cur === undefined) throw new Error(`Unknown payer ${e.paidBy}`);
    paid.set(e.paidBy, cur + e.amount);
    total += e.amount;
  }

  const base = n ? Math.floor(total / n) : 0;
  const remainder = n ? total - base * n : 0;
  const stable = [...people].sort((a, b) => cmp(a.id, b.id));
  const shareOf = new Map(stable.map((p, i) => [p.id, base + (i < remainder ? 1 : 0)]));

  const balances: PersonBalance[] = people.map((p) => {
    const pd = paid.get(p.id)!;
    const share = shareOf.get(p.id)!;
    return { id: p.id, name: p.name, emoji: p.emoji, paid: pd, share, balance: pd - share };
  });

  // Greedy minimal-transfer settlement: biggest debtor pays biggest creditor.
  const byAmt = (a: { id: string; amt: number }, b: { id: string; amt: number }) =>
    b.amt - a.amt || cmp(a.id, b.id);
  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ id: b.id, amt: b.balance })).sort(byAmt);
  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ id: b.id, amt: -b.balance })).sort(byAmt);
  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const x = Math.min(debtors[i].amt, creditors[j].amt);
    settlements.push({ from: debtors[i].id, to: creditors[j].id, amount: x });
    debtors[i].amt -= x;
    creditors[j].amt -= x;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }

  // Day-by-day totals and who paid on each day.
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const dayMap = new Map<string, Exp[]>();
  for (const e of expenses) {
    const list = dayMap.get(e.date);
    if (list) list.push(e);
    else dayMap.set(e.date, [e]);
  }
  const days: DaySummary[] = [...dayMap.entries()]
    .sort(([a], [b]) => cmp(a, b))
    .map(([date, items]) => {
      const per = new Map<string, number>();
      let dayTotal = 0;
      for (const e of items) {
        per.set(e.paidBy, (per.get(e.paidBy) ?? 0) + e.amount);
        dayTotal += e.amount;
      }
      const payers = [...per.entries()]
        .map(([id, amount]) => ({ id, name: nameOf.get(id) ?? 'Unknown', amount }))
        .sort((a, b) => b.amount - a.amount || cmp(a.id, b.id));
      return { date, total: dayTotal, items, payers };
    });

  return { total, count: expenses.length, people: balances, settlements, days };
}
