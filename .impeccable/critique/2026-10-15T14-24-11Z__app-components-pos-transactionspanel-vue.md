---
target: pos transaction panel
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\ASUS\\Documents\\BrewspotCode\\client\\app\\components\\pos\\TransactionsPanel.vue"
target_fingerprint: "sha256:47c011b652cd6ecc52f089c4525413e8adc7e288f2e3ce49c42eaf45836cf425"
target_path: "C:\\Users\\ASUS\\Documents\\BrewspotCode\\client\\app\\components\\pos\\TransactionsPanel.vue"
timestamp: 2026-10-15T14-24-11Z
slug: app-components-pos-transactionspanel-vue
---
Method: dual-agent (A: design review sub-agent · B: detector/browser sub-agent)

## Design Health Score: 25/40 (Acceptable)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Fetched once on open, no refresh or timestamp; empty state promises live updates |
| 2 | Match system / real world | 2 | "Print Z-reading" is really an X-reading (print only, resets nothing); receipt no. not searchable |
| 3 | User control and freedom | 3 | Escape steps back from detail; header X and scrim tap discard drill-down and filters |
| 4 | Consistency and standards | 3 | CSV uses receipt numbers while screen uses UUID |
| 5 | Error prevention | 2 | Print enabled with 0 sales, no confirm; Export ignores active filter |
| 6 | Recognition over recall | 2 | Search only UUID + staff, not receipt no. or amount |
| 7 | Flexibility and efficiency | 2 | No search shortcut, no amount search, no prev/next in detail |
| 8 | Aesthetic and minimalist | 4 | Calm, brand-correct, tabular numerals |
| 9 | Error recovery | 3 | Specific copy + retry; success:false leaves a blank body |
| 10 | Help and documentation | 2 | Gross (includes voids) and Z-reading unexplained |

## Design specificity
Authored for a cafe counter: hour chart doubles as filter, hour-grouped ledger, "Sales already charged are safe", cash received/change. Detector clean on source (0). Browser overlay: 2 nested-cards hits on modal header/footer bands (false positive), Inter overused (app-level), width/height transition from BranchAvailabilityPanel.vue:426 global CSS (out of scope).

## Priority issues
- [P0] Totals include voided sales (PosDeviceService.php transactions(): sum over all statuses; hour bars, group totals, average, Z-reading too). Fix: server returns net/void_count/void_total; Net as hero, voids excluded from bars and subtotals, breakdown on Z-reading. -> harden
- [P1] Sale lookup by receipt number fails: search covers UUID + staff only; row aria-label reads 36-char UUID and omits voided status. Fix: search receipt no., UUID, staff, amount; show receipt no. as secondary text under the UUID. -> clarify
- [P1] No focus trap: Tab from Print Z-reading leaves the dialog; page behind not inert; focus not restored to Transactions button. -> harden/audit
- [P2] Stale data with a live promise: no refresh/timestamp. -> harden
- [P2] Export/Print semantics: export ignores filter, CSV quotes unescaped, Z-reading unconfirmed and resets nothing. -> clarify

## Persona red flags
Alex: no / shortcut, no amount or receipt search, no next/prev, export ignores filter.
Sam: no trap, background not inert, row label omits VOIDED, no live announce on "No sales match", focus not restored on close.
Casey: hour bars 37px wide at 752px and ~17px at 375px with run-together labels; X beside All sales; scrim tap closes; ~2.5 ledger rows visible on mobile.

## Minor
Any non-completed status (incl. pending) struck through; voided detail Total unstruck and no void who/when; chart extends to current hour after close; branch name truncates on mobile; placeholder #8A6E64 on #FBF7F2 ~4.4:1; CSV date locale-dependent.

## Questions
Should the hero be net cash for the drawer, by payment method? Lookup tool or close-out tool? Should Z-reading be manager-gated?
