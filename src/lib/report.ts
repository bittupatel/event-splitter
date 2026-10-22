import { barChartSvg, donutSvg, esc, pairChartSvg } from '@/lib/charts';
import { fmtDate, fmtDay, fmtINR } from '@/lib/money';
import type { EventBundle } from '@/lib/event-data';

/** Standalone, print-ready HTML report. No scripts, no external assets. */
export function buildReportHtml(b: EventBundle, generatedAt = new Date()): string {
  const { event, summary: s } = b;
  const name = new Map(s.people.map((p) => [p.id, `${p.emoji ?? ''} ${p.name}`.trim()]));
  const n = s.people.length;
  const share = n ? s.people[0]?.share ?? 0 : 0;
  const when = event.ends_on && event.ends_on !== event.starts_on
    ? `${fmtDate(event.starts_on)} – ${fmtDate(event.ends_on)}`
    : fmtDate(event.starts_on);

  const dailyChart = barChartSvg(
    s.days.map((d) => ({ label: fmtDay(d.date).replace(/^\w+, /, ''), value: d.total })),
    'Spending per day',
  );
  const pairChart = pairChartSvg(
    s.people.map((p) => ({ label: p.name, a: p.paid, b: p.share })),
    'Paid versus fair share',
    ['Paid', 'Fair share'],
  );
  const donut = donutSvg(s.people.map((p) => ({ label: p.name, value: p.paid })), 'Who paid how much');

  const settleRows = s.settlements.length
    ? s.settlements
        .map(
          (t) =>
            `<tr><td><strong>${esc(name.get(t.from) ?? '?')}</strong></td><td class="arrow"><span class="badge-pay">pays →</span></td><td><strong>${esc(name.get(t.to) ?? '?')}</strong></td><td class="num font-bold"><strong>${esc(fmtINR(t.amount))}</strong></td></tr>`,
        )
        .join('')
    : `<tr><td colspan="4" class="muted">Everyone is settled up. Nothing to transfer.</td></tr>`;

  const settleCards = s.settlements.length
    ? `<div class="settle-grid">${s.settlements
        .map(
          (t) =>
            `<div class="settle-card">
              <div class="settle-flow">
                <span class="pill pill-debtor">${esc(name.get(t.from) ?? '?')}</span>
                <span class="settle-arrow">pays →</span>
                <span class="pill pill-creditor">${esc(name.get(t.to) ?? '?')}</span>
              </div>
              <div class="settle-val">${esc(fmtINR(t.amount))}</div>
            </div>`,
        )
        .join('')}</div>`
    : `<p class="muted">Everyone is settled up! No transfers needed.</p>`;

  const personRows = s.people
    .map((p) => {
      const cls = p.balance > 0 ? 'pos' : p.balance < 0 ? 'neg' : '';
      const label = p.balance > 0 ? `gets back ${fmtINR(p.balance)}` : p.balance < 0 ? `owes ${fmtINR(-p.balance)}` : 'settled';

      const owes = s.settlements.filter((t) => t.from === p.id);
      const gets = s.settlements.filter((t) => t.to === p.id);
      let actionHtml = '';
      if (owes.length > 0) {
        actionHtml = `<span class="neg">Pays ` + owes.map((t) => `<strong>${esc(fmtINR(t.amount))}</strong> to ${esc(name.get(t.to) ?? '?')}`).join('; ') + `</span>`;
      } else if (gets.length > 0) {
        actionHtml = `<span class="pos">Collects ` + gets.map((t) => `<strong>${esc(fmtINR(t.amount))}</strong> from ${esc(name.get(t.from) ?? '?')}`).join('; ') + `</span>`;
      } else {
        actionHtml = `<span class="muted">All settled</span>`;
      }

      return `<tr><td><strong>${esc(name.get(p.id) ?? '')}</strong></td><td>${actionHtml}</td><td class="num">${esc(fmtINR(p.paid))}</td><td class="num">${esc(fmtINR(p.share))}</td><td class="num ${cls}">${esc(label)}</td></tr>`;
    })
    .join('');

  const dayBlocks = [...s.days]
    .map((d) => {
      const payers = d.payers.map((p) => `${esc(p.name)} ${esc(fmtINR(p.amount))}`).join(' · ');
      const items = d.items
        .map(
          (i) =>
            `<tr><td>${esc(i.title)}</td><td>${esc(name.get(i.paidBy) ?? '?')}</td><td class="num">${esc(fmtINR(i.amount))}</td></tr>`,
        )
        .join('');
      return `<section class="day"><header><h3>${esc(fmtDay(d.date))}</h3><div class="daytotal">${esc(fmtINR(d.total))}</div></header><p class="muted">Paid by: ${payers}</p><table><thead><tr><th>Item</th><th>Paid by</th><th class="num">Amount</th></tr></thead><tbody>${items}</tbody></table></section>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(event.title)} – Expense report</title>
<style>
:root{--ink:#1b1f2a;--cream:#fff7e8;--card:#fffdf8;--line:#e8dcc4;--vermilion:#d9381e;--marigold:#f2a900;--leaf:#2e7d32;--muted:#6b6455}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:24px 18px 60px}
.hero{background:linear-gradient(120deg,var(--vermilion),var(--marigold) 55%,var(--leaf));color:#fff;border-radius:22px;padding:28px 26px;margin-bottom:22px}
.hero h1{margin:0 0 4px;font:700 34px/1.1 Georgia,"Times New Roman",serif}.hero p{margin:0;opacity:.95}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:22px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}
.card .k{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}.card .v{font:700 26px Georgia,serif;margin-top:4px}
h2{font:700 22px Georgia,serif;margin:30px 0 10px}h3{margin:0;font-size:16px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--line)}th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:#fbf1da}
tr:last-child td{border-bottom:0}.num{text-align:right;font-variant-numeric:tabular-nums}.arrow{color:var(--muted);text-align:center}
.pos{color:var(--leaf);font-weight:600}.neg{color:var(--vermilion);font-weight:600}.muted{color:var(--muted)}
.chart{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px;margin-bottom:12px;color:var(--ink)}.chart svg{display:block;width:100%;height:auto}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.day{margin-bottom:16px}.day header{display:flex;justify-content:space-between;align-items:baseline}.daytotal{font:700 20px Georgia,serif}.day p{margin:2px 0 8px}
.settle-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-bottom:14px}
.settle-card{background:var(--card);border:2px solid var(--line);border-radius:14px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center}
.settle-flow{display:flex;align-items:center;gap:6px;font-size:14px}
.pill{padding:3px 8px;border-radius:999px;font-size:12px;font-weight:700;display:inline-block}
.pill-debtor{background:#ffebe8;color:var(--vermilion);border:1px solid #ffd2cc}
.pill-creditor{background:#e8f5e9;color:var(--leaf);border:1px solid #c8e6c9}
.settle-arrow{font-weight:700;color:var(--muted);font-size:12px}
.settle-val{font:700 18px Georgia,serif;color:var(--ink)}
.badge-pay{background:#fff3c4;border:1px solid #ebd59b;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;color:var(--ink)}
footer{margin-top:34px;font-size:12px;color:var(--muted);text-align:center}
@media(max-width:700px){.two{grid-template-columns:1fr}.hero h1{font-size:27px}}
@media print{body{background:#fff}.day,.chart,.card,.settle-card{break-inside:avoid}.hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="wrap">
<div class="hero"><h1>${esc(event.title)}</h1><p>${esc(when)}${event.tagline ? ` · ${esc(event.tagline)}` : ''}</p></div>
<div class="cards">
<div class="card"><div class="k">Total spent</div><div class="v">${esc(fmtINR(s.total))}</div></div>
<div class="card"><div class="k">People</div><div class="v">${n}</div></div>
<div class="card"><div class="k">Fair share each</div><div class="v">${esc(fmtINR(share))}</div></div>
<div class="card"><div class="k">Items · Days</div><div class="v">${s.count} · ${s.days.length}</div></div>
</div>

<h2>Who needs to pay whom (Settlement plan)</h2>
<p class="muted">Minimal-transfer settlements: largest debtors pay largest creditors so everyone settles in the fewest transfers.</p>
${settleCards}
<table>
  <thead>
    <tr>
      <th>Who Pays</th>
      <th class="arrow">Action</th>
      <th>Who Receives</th>
      <th class="num">Amount to Pay</th>
    </tr>
  </thead>
  <tbody>${settleRows}</tbody>
</table>

<h2>Charts</h2>
<div class="chart">${dailyChart}</div>
<div class="two"><div class="chart">${pairChart}</div><div class="chart">${donut}</div></div>

<h2>Each person & settlement status</h2>
<table><thead><tr><th>Person</th><th>What they need to do</th><th class="num">Paid</th><th class="num">Fair share</th><th class="num">Balance</th></tr></thead><tbody>${personRows}</tbody></table>

<h2>Day by day</h2>
${dayBlocks || '<p class="muted">No expenses recorded yet.</p>'}
<footer>Fair share = total ÷ ${n} people. Shares are exact to the paisa; any leftover paise are spread one each.<br>Generated ${esc(generatedAt.toISOString().slice(0, 16).replace('T', ' '))} UTC · Event Splitter</footer>
</div></body></html>`;
}
