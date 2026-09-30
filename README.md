# Budget Tracker

A small client-side budget tracker with charts, category management, and PDF
export. No build step, no server — all data lives in your browser's
`localStorage`.

## Features

- **Transactions** — income and expenses with category, description, amount,
  and date; edit or delete any entry
- **Dashboard** — current balance, income/expense totals, and a comparison bar
  chart
- **Spending analysis** — category doughnut chart plus year-to-date totals per
  entry (grouped by description, e.g. "how much did I spend on Omnycard?"),
  with **This month / Year to date / All time** windows
- **Income sources** — expenses can be linked to the income source they were
  paid from ("Deduct from Income Source"); totals always derive from the
  transactions themselves, so linked expenses are never double-counted
- **Categories** — add, rename, and delete categories for both income and
  expense (built-ins included); a category in use by transactions is protected
  from deletion
- **Date-range filter** — narrow the history and totals to a From/To range
- **PDF export** — printable summary and transaction table with a preview
  dialog
- **Backup & restore** — the collapsible **Export/Import, Delete** section
  exports everything as a JSON backup, imports one with a confirmation, or
  deletes all data to start fresh; each button shows a hint on hover
- **Accessible UI** — keyboard-navigable category dropdown, modal focus traps
  with Escape to close, and ARIA labels/expanded states on toggles

## Running

No installation needed — open `index.html` directly in your browser.

## Project layout

- `app.js` — everything: pure logic (`computeTotals`,
  `summarizeByDescription`, `windowRange`, `formatMoney`, `filterByDateRange`,
  `generateID`) followed by the UI wiring
- `index.html`, `styles.css` — markup and styles

## Data model (localStorage)

- `transactions` — array of
  `{ id, type: "income" | "expense", category, description, amount, date, incomeSource? }`.
  `incomeSource` (an income category id) marks an expense as paid from that
  source; it is metadata only — every total is derived.
- `budgetCategories` — `{ income: [{id, name}], expense: [{id, name}] }`

To start fresh, use the **Delete** button in the **Export/Import, Delete**
section (it asks for confirmation first). To reset manually, clear these two
keys in your browser's dev tools.

An **Export** backup (`budget-tracker-backup-YYYY-MM-DD.json`) contains these
same two structures plus a small metadata header, so it can be **Import**ed on
another device to move your data with you.

## Notes

- Chart.js and jsPDF load from CDNs with pinned versions and SRI integrity
  hashes, so PDF export and charts need network access on first load.
