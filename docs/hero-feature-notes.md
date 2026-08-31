# Hero Feature Code Notes

Working notes for the features currently being built on `feature/vehicle-health-dashboard`:
**Hero Feature 3** (Vehicle Health Dashboard), **Hero Feature 6** (Digital Service & Maintenance History), **Hero Feature 7** (Customer–Mechanic Communication).

For every annotated block: the file it lives in, its line number(s), the code as written (with its `/*Comment : ... */`), and a note on what breaks if that block is deleted or relocated.

---

## Hero Feature 3 — Vehicle Health Dashboard

### File: `frontend/src/components/dashboard/CustomerDashboard.tsx`

#### Lines 49–50
```tsx
/*Comment : Rule 1 — Open issues hurt the most, especially urgent ones. Every problem report still sitting OPEN for this vehicle drags the score down; something the AI flagged as HIGH urgency costs more points than a LOW one, because it's riskier to leave sitting there unresolved. */
const openReports = reports.filter((r) => r.vehicleId === vehicleId && r.status === "OPEN");
```
**If this goes missing or moves elsewhere:** every later reference to `openReports` in this function (`.length`, `.forEach`, `.some`) throws `ReferenceError: openReports is not defined`. Since `computeVehicleHealth` runs synchronously while the modal renders, that exception takes down the *entire* health score render for that vehicle — not just the urgency penalty — so the customer sees a broken modal instead of a partial one. Moving it below its first use inside the same function hits the same failure via the `const` temporal dead zone.

#### Lines 66
```tsx
/*Comment : Rule 2 — Pending maintenance reminders count too, just less severely. These are routine, expected things (oil change due, inspection coming up) rather than active problems, so each one only costs a flat 5 points. */
const activeReminders = reminders.filter((rem) => rem.vehicleId === vehicleId && rem.status === "ACTIVE");
```
**If this goes missing or moves elsewhere:** same crash pattern as Rule 1 (`activeReminders` undefined below). Functionally, if it were quietly disabled instead of deleted, a vehicle with several overdue reminders would score as if nothing were pending — which directly contradicts hero feature 9 (Predictive Maintenance Reminders), the whole point of which is that overdue items should be visible and weighted.

#### Lines 76
```tsx
/*Comment : Rule 3 — How long it's been since the vehicle was actually serviced. A car with no service history yet, or one that hasn't seen a mechanic in a while, is more likely to be hiding problems — so the longer that gap gets, the more points come off. */
const completedLogs = appointments
  .filter((a) => a.vehicleId === vehicleId && a.status === "COMPLETED")
  .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
```
**If this goes missing or moves elsewhere:** same undefined-reference crash. Worth flagging separately from Rules 1 & 2: all three rules live inside one function with no isolation between them — a bug in any single rule takes the whole score (and by extension the whole modal, since it renders inline) down with it, not just that rule's contribution.

#### Line 97
```tsx
/*Comment : Clamp the final tally to a sane 0–100 range, then translate the raw number into a plain-English label and a color so the customer gets an "at a glance" verdict instead of having to interpret a bare percentage. */
score = Math.max(0, Math.min(100, Math.round(score)));
```
**If this goes missing or moves elsewhere:** a vehicle stacking enough penalties (multiple HIGH-urgency open reports + several overdue reminders + a stale service date) can drive `score` negative. The label banding below still resolves to "Critical" correctly (negative fails every `>=` check), but the displayed number becomes something like `-15%`, and the bar's `width: -15%` renders as a zero-width bar with a nonsensical label next to it — a visibly broken UI rather than a silent logic bug.

#### Line 137
```tsx
/*Comment : Which vehicle's Health Dashboard modal is open right now, if any. Storing the whole Vehicle object (not just its id) means the modal can render the vehicle's details instantly, with no extra lookup needed. */
const [healthVehicle, setHealthVehicle] = useState<Vehicle | null>(null);
```
**If this goes missing or moves elsewhere:** this is the single piece of state gating the entire feature. Every other feature-3 block references it (`healthVehicle && (...)`, `setHealthVehicle(v)`, `setHealthVehicle(null)`, `healthVehicle.vehicleId/.year/.make/...`). Delete or rename it and the file fails to compile — TypeScript will flag every one of those as an undefined identifier, not just runtime-fail.

#### Line 397
```tsx
/*Comment : Each card is a quick-glance vehicle profile — year, make/model, VIN, and odometer — with the Health Dashboard button below as the deep-dive entry point into that one vehicle's full story. */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```
**If this goes missing or moves elsewhere:** this line is comment-only — deleting just the comment has zero runtime effect, only a documentation loss (the next person editing the grid loses the "card = summary, button = deep dive" framing). If the `<div>` itself were deleted instead, the whole garage tab would stop rendering vehicle cards.

#### Line 427
```tsx
{/*Comment : Opens the full Health Dashboard modal for THIS specific vehicle — its score, its history, its open issues. */}
<button
  onClick={() => setHealthVehicle(v)}
  className="w-full py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
>
```
**If this goes missing or moves elsewhere:** if the `<button>` itself (not just the comment) were removed, the modal code would still exist and still work if triggered some other way, but there would be no UI path left for a customer to open it — hero feature 3 becomes dead code, invisible from the app.

#### Line 955
```tsx
{/*Comment : MODAL 4: Vehicle Health Dashboard — the customer's "everything about this one vehicle" view — profile info, the computed health score, open issues, service history, and upcoming reminders, all in one place. Only renders once a vehicle has been picked via the button above. */}
{healthVehicle && (
```
**If this goes missing or moves elsewhere:** if the `healthVehicle &&` guard is removed but the JSX below it is kept, the modal tries to render unconditionally against a possibly-`null` object — TypeScript's strict null checks reject the build outright; if that check were bypassed, it'd throw `Cannot read properties of null` at runtime on first page load, before any vehicle is even selected.

#### Line 972
```tsx
{/*Comment : Vehicle Profile — the car's basic identity: year/make/model, VIN, and current odometer, straight from its registration. */}
<div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
```
**If this goes missing or moves elsewhere:** the modal would still open, but with no header identifying *which* vehicle it's showing — score, issues, history, and reminders would all appear without the year/make/model/VIN/odometer context tying them together.

#### Line 989
```tsx
{/*Comment : Vehicle Health Score — runs the scoring rules above against this one vehicle's data and shows the result as a percentage, a color-coded bar, and a plain-English breakdown of exactly where points were lost (so the score never feels arbitrary). */}
{(() => {
  const health = computeVehicleHealth(healthVehicle.vehicleId, reports, appointments, reminders);
```
**If this goes missing or moves elsewhere:** this is the block that actually calls `computeVehicleHealth`. Remove it and the score/bar/breakdown UI disappears entirely — the modal degrades into a plain data viewer (profile + lists), losing the one part of hero feature 3 that isn't just a read-out of existing tables.

#### Line 1028
```tsx
{/*Comment : Open Problem Reports — every issue reported for this vehicle that hasn't been resolved yet, with the AI's urgency rating shown so the most pressing ones stand out immediately. */}
{(() => {
  const openReports = reports.filter(
```
**If this goes missing or moves elsewhere:** customers lose visibility into *why* the score dropped from inside the modal — they'd have to leave and go dig through the separate "AI Diagnostics" tab, defeating the "everything about this one vehicle in one place" purpose. This is also one of the four things the spec explicitly calls out for hero feature 3, so dropping it is a scope regression, not just a UX one.

#### Line 1077
```tsx
{/*Comment : Historical Service Logs — a chronological record of every appointment that's actually been completed on this vehicle: who worked on it, what was done, and what it cost. */}
{(() => {
  const serviceLogs = appointments
```
**If this goes missing or moves elsewhere:** the modal loses its record of completed work (technician, parts/labor cost, date) — another of the four spec-mandated sections gone, and it also breaks the implicit link to hero feature 6 (Digital Service & Maintenance History), since this is currently the only place that history surfaces per-vehicle rather than mixed in with all appointments.

#### Line 1126
```tsx
{/*Comment : Active Maintenance Reminders — upcoming, not-yet-due maintenance the system has flagged for this vehicle (mileage- or calendar-based), so routine upkeep never gets forgotten. */}
{(() => {
  const activeReminders = reminders.filter(
```
**If this goes missing or moves elsewhere:** the last of the four spec-mandated sections disappears — a customer viewing this modal would have no way to know an oil change or inspection is coming due without leaving to check the separate Appointments & Reminders tab.

---

## Hero Feature 6 — Digital Service & Maintenance History
*(not yet started — entries added here once work begins)*

## Hero Feature 7 — Customer–Mechanic Communication
*(not yet started — entries added here once work begins)*
