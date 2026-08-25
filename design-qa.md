# Design QA — «ЖИВОТНОЕ: кассовый бой»

## Evidence

- Source visual truth: `/workspace/scratch/d2f962780b2c/generated_images/zhivotnoe-reserve-drum-mockup-1440x1024.png` (1440 × 1024).
- Normalized comparison target: `qa-target-reserve-normalized.png` (1348 × 926).
- Final implementation: `qa-implementation-v5.jpg` (1348 × 926, CSS viewport 1348 × 926, device scale factor 1).
- Focused animation state: `qa-flow-v5.jpg` (1348 × 926, step 3 of 8).
- Final state shown: base inputs, no debt confirmed, two completed months; cumulative reserve `+106 700 ₽`, latest month `+53 350 ₽`.

## Visual comparison

The implementation preserves the selected industrial machine direction: five editable brass input plates, seven aligned cash-flow chambers, three explicit red expense drains, an isolated physical pull lever, a green pipe into a large horizontal reserve drum, and a central cumulative counter. Editable values and all seven flow values now sit inside real recessed plate assets under a separate smoky convex-glass asset, with optical glow, depth, and reflections. The cumulative counter uses individual mechanical wheels inside a shared recessed bezel.

The financial reading order is unambiguous: `revenue → variables → contribution → fixed → operating cash before debt → leasing and credit → net cash → cumulative reserve`. Wider overlapping connector assets form one continuous conduit. After a run, the full route remains visibly completed and replays a staggered semantic afterglow; red chambers repeat the expense-drain cue and the reserve glass repeats the receipt cue. The reserve states both the number of recorded months and the latest-month result. Empty debt fields remain unknown and do not record a month.

## Interaction verification

- Default unknown debt: pulling the lever leaves reserve and month count at zero and shows `МЕСЯЦ НЕ ЗАПИСАН`.
- No-debt base month: formula resolves to `855 000 − 421 650 = 433 350 − 380 000 = 53 350 − 0 = 53 350`.
- Repeated lever pull: reserve changes `0 → 53 350 → 106 700`, while latest month stays `+53 350 ₽`.
- Stress state at 20 checks/day: operating cash becomes `−91 100 ₽`; a recorded stress month subtracts that amount from the existing reserve.
- Mid-flow capture confirms actual banknote and expense assets move through the chambers while the lever remains physically pulled; the baseline conduit remains visible throughout.
- Application console: no errors or warnings from `terminal.local`; browser-extension transport messages were excluded.
- `npm test`: passed, including the production build and rendered HTML metadata check.
- `npm run lint`: no errors; only framework recommendations for deliberate raster `<img>` assets.

## Iteration history

### Iteration 1 — blocked

- [P1] Header and reserve counter clipped at the captured desktop height.
- [P1] The lever bay competed with the flow machine and overlapped the previous layout.
- Fix: rebuilt the scene around a fixed machine canvas, isolated the lever bay, reduced heading scale, and centered the reserve drum.

### Iteration 2 — blocked

- [P1] A single-month reserve looked like another monthly subtotal, so accumulation was not proven visually.
- [P1] The destination of variable, fixed, and debt outflows was not explicit.
- [P2] Cash bundles were sparse and visually unbalanced.
- Fix: added `НАКОПЛЕНО · N МЕС.`, a separate latest-month line, a two-month oracle, labeled three expense drains, and distributed cash bundles across the reservoir.

### Iteration 3 — passed for cumulative logic

- P0: none.
- P1: none.
- P2: none.
- [P3] Narrow mobile behavior uses intentional horizontal scrolling to preserve the machine’s legibility; it was not included in the desktop screenshot comparison.
- [P3] Raster cash assets intentionally use native `<img>` elements and therefore retain non-blocking framework performance warnings.

### Iteration 4 — blocked

- [P1] Independent visual QA found that the seven monthly values still read as sharp HTML text placed above generic plates.
- [P1] Connector progression disappeared after the run, so the completed route was not persistently legible.
- [P2] The accumulator had too few visible bundles and did not make physical accumulation obvious.
- Fix: introduced a dedicated transparent smoky-glass asset for every editable and monthly display, widened the real connector assets into a continuous conduit, persisted completed-route state, added a staggered 5.6-second route replay, and increased reserve bundles.

### Iteration 5 — passed

- P0: none.
- P1: none.
- Independent visual QA confirmed that physical readout integration and persistent-route failures are resolved.
- [P2] Supporting captions remain intentionally small and subordinate to the investor-facing values.
- [P3] The final render retains more operational microcopy than the cleaner reference illustration because the calculator must remain editable and auditable.

## Final gate

- Visual hierarchy: passed.
- Financial order and debt gate: passed.
- Cumulative reserve behavior: passed.
- Animation semantics: passed.
- Physical readout integration: passed.
- Persistent completed route: passed.
- Lever collision/cropping: passed.
- Build and browser verification: passed.

final result: passed
