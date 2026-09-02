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

### File: `frontend/src/components/dashboard/CustomerDashboard.tsx` — the Service History tab

#### Line 143
```tsx
/*Comment : "history" is Hero Feature 6 (Digital Service & Maintenance History) - its own tab, separate from "appointments" which mixes upcoming bookings with reminders. */
const [activeTab, setActiveTab] = useState<"garage" | "diagnostics" | "appointments" | "history">("garage");
```
**If this goes missing or moves elsewhere:** removing `"history"` from the union type breaks every `activeTab === "history"` check elsewhere in the file at compile time (TypeScript narrows the type and rejects the comparison) — the tab becomes unreachable and the file won't build, not just silently hide.

#### Lines 784–811 — the tab's data
```tsx
{/*Comment : Tab 4: Service History - Hero Feature 6 (Digital Service & Maintenance History). Every COMPLETED appointment across ALL of the customer's vehicles, newest first, showing exactly what the spec calls for: work description, parts cost, labor cost. Unlike the Vehicle Health modal's history section, this one isn't scoped to a single vehicle - it's the customer's full maintenance record in one place. */}
{activeTab === "history" && (
  <div className="space-y-3">
    {(() => {
      /*Comment : Keep only finished work orders. Primary sort: an appointment with an unread message jumps to the top, so a reply you haven't seen yet is never buried in an otherwise-chronological list - "cars with new message shown at top", as requested. Everything else still reads newest-first, matching "viewable chronologically" from the spec. */
      const completedLogs = appointments
        .filter((a) => a.status === "COMPLETED")
        .sort((a, b) => {
          const aIsNew = hasNewMessage(findActivity(latestActivity, a.appointmentId), user?.userId);
          const bIsNew = hasNewMessage(findActivity(latestActivity, b.appointmentId), user?.userId);
          if (aIsNew !== bIsNew) return aIsNew ? -1 : 1;
          return new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime();
        });
```
**If this goes missing or moves elsewhere:** delete the `activeTab === "history"` guard and the whole block tries to render unconditionally, using `appointments`/`latestActivity`/`user` before they're guaranteed populated on first paint. Delete just the sort's new-message comparison (keep the date sort) and the feature silently degrades to pure chronological order — nothing crashes, but "message-first" sorting from the later message-badge round quietly stops working, which is the kind of regression that's easy to miss in review since the tab still renders fine.

#### Lines 812–826 — the compact card
```tsx
/*Comment : One compact card per completed appointment - just enough to identify it at a glance (date, vehicle, technician, invoice status). The full breakdown (parts bill + mechanic's notes + costs) lives one click away in the Expand modal instead of being dumped onto the card itself. */
return completedLogs.map((a) => {
  const isNew = hasNewMessage(findActivity(latestActivity, a.appointmentId), user?.userId);
  return (
  <div
    key={a.appointmentId}
    className={`p-5 rounded-2xl bg-zinc-900/60 border shadow-lg ${isNew ? "border-rose-500/40" : "border-zinc-800"}`}
  >
```
**If this goes missing or moves elsewhere:** without the `key={a.appointmentId}`, React would warn and potentially misassign state across re-renders when the list reorders (which it does, on every new message) — cards could visually "jump" to the wrong entry's data mid-interaction, a subtle bug that's easy to miss until someone's chat badge shows on the wrong vehicle.

#### Lines 827–834 — the new-message tag
```tsx
{/*Comment : Same "new message" signal as the badge on the Messages button elsewhere - here it doubles as the reason this card floated to the top of the list. */}
{isNew && (
  <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
    ! New Message
  </span>
)}
```
**If this goes missing or moves elsewhere:** the sort-to-top behavior from the block above would still work, but silently — a customer would see their appointments reorder for no visible reason, with no indication *why* one card jumped to the top. The sort and the visible reason for it are two separate blocks; removing this one breaks the "show, don't just do" half of the feature.

#### Lines 847–853 — the Expand button
```tsx
{/*Comment : Opens the full breakdown - parts bill, mechanic's notes, cost summary - in its own modal, closed only via the ✕ in its corner. */}
<button
  onClick={() => setDetailAppointment(a)}
  className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors"
>
```
**If this goes missing or moves elsewhere:** `AppointmentDetailModal` and its rich content (parts bill, linked diagnosis, mechanic's notes, cost footer) would still exist and still work correctly if opened another way, but there'd be no UI path into it from Service History at all — the deep-dive view becomes unreachable dead code from this tab.

---

### File: `frontend/src/lib/serviceLog.ts` *(new file)* — the parts-list / customer-request / mechanic-notes text convention

The schema gives `APPOINTMENT` exactly one `service_description TEXT` column — no `PARTS` table exists or was added (11/12-table budget). This file defines one plain-text layout inside that single column, agreed on by every reader/writer of it, so a structured "bill" and two separate authors' notes can all live in one field without a schema change.

#### Lines 1–13 — the format itself and why it exists
```ts
/*Comment : Shared helper for everything packed into APPOINTMENT's one service_description TEXT column - no new table/column exists or is being added, per the 11/12-table budget. Three different things now share this one field: the customer's original request (written at booking time), the mechanic's narrative write-up, and the itemized parts list (Hero Feature 6). Bug this fixes: the mechanic's save used to overwrite the customer's note entirely, since both were just writing raw text into the same column. Now all three are kept as separate, clearly-marked sections within that one string, and buildServiceDescription always carries the customer's original request forward untouched - the mechanic can add to the field, never erase what the customer wrote. */
```
**If this goes missing or moves elsewhere:** this is a comment-only block (the `PartLine`/`ParsedServiceLog` interfaces and the three marker constants sit right below it) — losing just the comment costs nothing at runtime, only the explanation of *why* three unrelated concerns share one database column, which the next person touching this file will need in order not to reintroduce the original overwrite bug.

#### Lines 18–41 — `buildServiceDescription`
```ts
/*Comment : Combines all three pieces into the one string that actually gets stored. customerRequest should always be whatever was already on the appointment (parsed back out via parseServiceDescription) - callers must pass it through unchanged, not leave it blank, or the customer's note is lost exactly the way this fix is meant to prevent. Empty sections are omitted rather than written out blank, so an appointment with no customer note doesn't end up with a dangling "Customer Request:" header. */
export function buildServiceDescription(customerRequest: string, narrative: string, parts: PartLine[]): string {
```
**If this goes missing or moves elsewhere:** every caller (booking a new appointment, saving a mechanic's update) breaks at compile time — this is the only function that produces the string the backend actually stores, so its removal isn't a partial regression, it's a total build failure across both dashboards.

#### Lines 46–91 — `parseServiceDescription`
```ts
/*Comment : The reverse of buildServiceDescription. Backward-compatible on purpose: a record saved before this fix existed (or before the parts-list feature existed) has neither marker at all - in that case the whole string is treated as work-log content, exactly how it used to be read, so nothing already in the database breaks or gets misparsed. */
export function parseServiceDescription(raw: string | undefined | null): ParsedServiceLog {
```
**If this goes missing or moves elsewhere:** every display surface that reads `service_description` (both dashboards' cards, the update modal's prefill, `AppointmentDetailModal`, the Vehicle Health modal's history section) would show the raw marker text literally — customers and mechanics would see `Customer Request:\nMechanic's Notes:\nParts Replaced:\n- Brake Pads | 45.00` as one unformatted blob instead of clean, separated sections.

#### Lines 101–103 — `sumParts`
```ts
/*Comment : Sum of a parts list's costs - unchanged, still what gets sent to the backend as partsCost. */
export function sumParts(parts: PartLine[]): number {
```
**If this goes missing or moves elsewhere:** the mechanic's "Parts Total" and "Calculated Invoice Total" displays break at compile time, and — more importantly — nothing would compute the real `partsCost` sent to the backend on save, so every newly completed appointment's parts cost would silently be `undefined`/`NaN` instead of the sum of what was actually itemized.

---

### File: `frontend/src/components/dashboard/MechanicDashboard.tsx` — the itemized parts-list billing UI

#### Line 51 — replacing the single number field
```tsx
/*Comment : "parts" replaces the old single partsCost number - the mechanic now builds an itemized list (name + cost per row, like adding poll options) instead of typing one aggregate figure. serviceDescription here holds ONLY the free-text narrative; the two are combined into one string right before the request goes out, via buildServiceDescription. */
const [statusForm, setStatusForm] = useState({
```
**If this goes missing or moves elsewhere:** every row-management helper (`addPartRow`/`removePartRow`/`updatePartRow`) and the whole "Parts Replaced" UI block reference `statusForm.parts` — removing this field breaks the entire itemized-billing form at compile time, not just the comment's context.

#### Line 47 — the customer-request bug fix's actual state
```tsx
/*Comment : The customer's original request, parsed out of the currently-open appointment - shown to the mechanic read-only for context, and carried forward unedited on save. This is the actual fix: it used to just live in the same field as the mechanic's own notes, so saving overwrote it; now it's tracked separately from statusForm and never touched by anything the mechanic types. */
const [viewingCustomerRequest, setViewingCustomerRequest] = useState("");
```
**If this goes missing or moves elsewhere:** this reintroduces the original bug. `handleUpdateStatus` passes `viewingCustomerRequest` into `buildServiceDescription` as the customer-request section; without this state, that call would need a literal `""` instead, and the customer's original note would be silently erased on the mechanic's very next save — exactly the failure this whole file exists to prevent.

#### Lines 84–93 — prefilling on reopen
```tsx
/*Comment : Reopening an appointment (e.g. it was already saved as IN_PROGRESS and the mechanic is coming back to finish it) needs to split its stored service_description back apart, so any parts already logged last time show up as editable rows again instead of being lost. */
const handleOpenUpdateModal = (appt: Appointment) => {
  setSelectedAppointment(appt);
  const parsed = parseServiceDescription(appt.serviceDescription);
  setViewingCustomerRequest(parsed.customerRequest);
```
**If this goes missing or moves elsewhere:** reopening a partially-completed work order (saved once as IN_PROGRESS, coming back to finish it) would show an empty parts list and an empty narrative box even though real data exists on the appointment — the mechanic would either re-type everything (risking duplicate/inconsistent parts) or, worse, save over the existing data with a now-incomplete version.

#### Lines 99–111 — row management
```tsx
/*Comment : Row-management for the parts list - append a blank row, remove one by index, or edit one field of one row. Kept as three small focused helpers rather than one do-everything function, so each button's onClick stays a one-liner. */
const addPartRow = () => {
```
**If this goes missing or moves elsewhere:** the "+ Add Part" button, each row's ✕ remove button, and every keystroke in a part-name/cost input all call one of these three functions directly — removing them breaks the entire parts-list UI's interactivity at compile time.

#### Line 126 — the actual fix, applied at save time
```tsx
/*Comment : viewingCustomerRequest is passed through unedited - this is the actual bug fix. The mechanic's narrative + itemized parts rows get combined with it, never in place of it, so the customer's original words survive this save exactly as they were, no matter what the mechanic writes here. partsCost is still computed as the sum of the itemized rows. */
const combinedDescription = buildServiceDescription(viewingCustomerRequest, statusForm.serviceDescription, statusForm.parts);
```
**If this goes missing or moves elsewhere:** this single line is where the customer-request-preservation bug was actually fixed. Reverting it to `buildServiceDescription(statusForm.serviceDescription, statusForm.parts)` (the old two-argument shape) would fail to compile against the current `serviceLog.ts` signature — and if someone "fixed" the compile error by passing `""` for the first argument instead of `viewingCustomerRequest`, the bug would silently return.

#### Lines 566–572 — showing it back to the mechanic
```tsx
{/*Comment : Read-only - shown for context so the mechanic can see what was actually asked for, but there's no input here for it. It gets carried forward automatically on save (see handleUpdateStatus); editing the customer's own words isn't something this form offers. */}
{viewingCustomerRequest && (
  <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-1">
```
**If this goes missing or moves elsewhere:** the fix itself (line 126) still works — the customer's note still survives the save — but the mechanic filling out the form loses visibility into what was originally asked for, which was the whole point of surfacing it here in the first place.

#### Lines 587–632 — the itemized bill builder
```tsx
{/*Comment : Parts Replaced - the itemized bill builder. Each row is one line item (part name + its cost); "Add Part" appends a blank row the same way adding a poll option would. Parts Total below is computed live from these rows, not typed in separately. */}
<div className="space-y-1.5">
```
**If this goes missing or moves elsewhere:** this is the core of Hero Feature 6's mechanic-side UI — without it, there'd be no way to itemize parts at all, and the feature would regress to the pre-session single "Parts Cost ($)" number field it replaced.

#### Line 658 — the live total
```tsx
{/*Comment : Grand total now sums the live Parts Total (from the rows above) with Labor Cost - matches exactly what gets sent to the backend as partsCost + laborCost. */}
```
**If this goes missing or moves elsewhere:** comment-only above the total display — no runtime effect if just the comment is lost, but if the underlying `sumParts(statusForm.parts) + Number(statusForm.laborCost)` expression were changed to reference the old (now-removed) `statusForm.partsCost`, it would fail to compile, since that field no longer exists on the form's type.

---

### File: `frontend/src/components/AppointmentDetailModal.tsx` *(new file)* — the "Expand" detail view

#### Lines 10 & 15 — what this modal is and its optional diagnosis link
```tsx
/*Comment : The problem report this appointment was booked against, if any - optional because plenty of appointments (routine maintenance, an oil change) are booked directly with no prior AI diagnosis behind them. */
problemReport?: ProblemReport;
...
/*Comment : The "Expand" view for a completed service - full itemized parts bill on the left, the mechanic's full written notes on the right (however long they are, no character limit), and the parts/labor/total cost summary pinned at the bottom. Closes only via the ✕ in its own top-right corner, matching every other modal in this app. */
export function AppointmentDetailModal({ appointment, problemReport, onClose }: AppointmentDetailModalProps) {
```
**If this goes missing or moves elsewhere:** making `problemReport` required instead of optional would break every call site that doesn't have a linked diagnosis to pass (most appointments don't) — TypeScript would reject those calls at compile time, not just fail to show the section gracefully.

#### Line 17 — the split that fixes the customer/mechanic conflation
```tsx
/*Comment : customerRequest and narrative are two genuinely different pieces of text now, not one shared field that the mechanic's save used to clobber - what the customer originally asked for when booking, versus what the mechanic actually wrote once the work was done. */
const { customerRequest, narrative, parts } = parseServiceDescription(appointment.serviceDescription);
```
**If this goes missing or moves elsewhere:** every section below that destructures `customerRequest`, `narrative`, or `parts` would throw a `ReferenceError` the moment this modal renders — since the whole modal's content depends on this one parse call, the entire "Expand" view would crash rather than degrade partially.

#### Lines 35–42 — the customer's original request, shown first
```tsx
{/*Comment : The customer's own original request, shown up front and full-width - separate from and above the parts/notes columns below, so it's never confused with what the mechanic wrote. */}
{customerRequest && (
```
**If this goes missing or moves elsewhere:** the modal would still show what the mechanic did and what it cost, but a customer opening it to remember *why* they booked in the first place would find nothing — the modal degrades from "everything about this visit" to "just the invoice."

#### Lines 46–79 — the linked AI diagnosis
```tsx
{/*Comment : "The problem for which the customer took the vehicle for" - the original symptom report that led to this appointment, plus whatever the AI diagnosis found, if this appointment was booked against one. Distinct from "Your Original Request" above: that's the note typed into the booking form itself, this is the separate problem-report flow (Hero Feature 4) that may have happened first. */}
{problemReport && (
```
**If this goes missing or moves elsewhere:** this is the section added specifically in response to "elaborate the problem expansion... add the problem for which the customer took the vehicle for" — removing it reverts the modal to showing only booking notes and completed work, with no trace of the original AI diagnosis that may have prompted the visit at all.

#### Lines 89–123 — parts bill / legacy fallback / notes columns
```tsx
{/*Comment : Two columns - parts bill on the left, mechanic's notes on the right. Stacks to one column on narrow screens since side-by-side stops being readable there. */}
<div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
...
/*Comment : Appointments completed before this feature existed have a real partsCost but no itemized text to parse - say so plainly instead of showing a misleading empty list. */
...
{/*Comment : "Small box" for the mechanic's written notes - scrolls internally if it runs long (they'll typically write a few hundred characters), but nothing here truncates or hard-caps the text itself. */}
```
**If this goes missing or moves elsewhere:** without the legacy-fallback branch specifically, an appointment completed *before* the itemized-parts feature existed (real `partsCost`, but no parsed `parts` array) would show a blank "No parts were used" message — technically false and actively misleading, since parts genuinely were billed, just not in the new itemized format.

#### Line 136 — the authoritative cost footer
```tsx
{/*Comment : Cost summary footer - always reads from the appointment's real, authoritative partsCost/laborCost/totalAmount fields (never the parsed text), so it's correct even for older records with no itemized parts list to show above. */}
```
**If this goes missing or moves elsewhere:** if the footer were changed to sum the *parsed* parts list instead of reading `appointment.partsCost` directly, it would show `$0.00` for every legacy record with a real cost but no itemized breakdown — silently wrong billing information, which is exactly why this footer deliberately never touches the parsed data.

---

### Removed: "Mark as Paid" (built, then reverted)

For one round, `appointmentService.markInvoicePaid`, a matching controller/route/frontend button, and `invoiceRepo.updateStatus` existed here to let a mechanic flip an invoice from `PENDING` to `PAID`, so the "Complete" group (see Feature 7 below) would have something to show. The user's team owns Hero Feature 8 (Invoicing & Payment Tracking) separately, so all of it was removed again — confirmed gone via a live `404` check against the endpoint. The grouping logic itself was untouched: it still reads `invoiceStatus` passively, so it's ready for whatever Feature 8 eventually does to that field; until then "Complete" stays correctly, not-brokenly, empty.

---

## Hero Feature 7 — Customer–Mechanic Communication

### File: `backend/src/repositories/conversationRepo.js`

The `createMessage`/`findAllByAppointmentId` methods here predate this session (already scaffolded). Two methods were added this session:

#### Lines 22–27 — fetching one just-sent message back
```js
/**
 * Fetch a single message by its own id, with sender name/role joined -
 * used right after createMessage() so the API can hand back the exact
 * row it just inserted instead of re-fetching the whole thread.
 */
async findById(executor, conversationId) {
```
**If this goes missing or moves elsewhere:** `conversationService.sendMessage` calls this immediately after insert to build its response — without it, `sendMessage` would need to re-fetch the entire thread just to find the one new row, or fail to compile against a method that no longer exists.

#### Lines ~89–113 — `findLatestByAppointmentIds` (the badge/sort data source)
```js
/**
 * For a given set of appointment ids, return each one's single latest
 * message (sent_at + sender_id) - used to power "new message" badges and
 * sort-to-top ordering without fetching every full thread. Appointments
 * with no messages at all simply don't appear in the result.
 */
async findLatestByAppointmentIds(executor, appointmentIds) {
```
**If this goes missing or moves elsewhere:** the entire message-badge/sort-to-top system (both dashboards) depends on this single aggregate query — removing it breaks `conversationService.getLatestActivityForUser` at compile time, which cascades to every "!" badge and every "new message sorts first" ordering across the whole app going silently absent (falling back to whatever the `.find()` returns when the array it searches is always empty: nothing ever "isNew").

---

### File: `backend/src/services/conversationService.js` *(new file)*

#### Lines 15–33 — the authorization guard
```js
/*Comment : Shared guard used by both getMessages and sendMessage. Loads the appointment and confirms the caller is one of its two actual participants - the customer who owns its vehicle, or the mechanic assigned to it - never just "any customer/mechanic in the workshop". Matches the feature's own name: Customer-Mechanic Communication, not Workshop-Wide Communication. */
async assertParticipant(appointmentId, userPrincipal) {
```
**If this goes missing or moves elsewhere:** this is the entire security boundary for chat. Without it, `getMessages`/`sendMessage` would need their own duplicate (and easy-to-get-subtly-wrong) copies of the same tenant + participant checks, or — if simply deleted with no replacement — any authenticated user in the workshop could read or post into any appointment's conversation, a real cross-customer privacy break.

#### Lines 36–40 — reading a thread
```js
/*Comment : Returns the full message thread for one appointment, oldest first (already sorted that way by the repo query) - exactly what the chat modal renders top-to-bottom. */
async getMessages(appointmentId, userPrincipal) {
```
**If this goes missing or moves elsewhere:** `conversationController.getMessages` calls this directly — removing it breaks the GET endpoint at compile time, which breaks both the chat modal's initial load and its background poll (see `AppointmentChatModal.tsx` below), since both go through this same call.

#### Lines 43–59 — sending a message
```js
/*Comment : Saves one new message on the thread and hands back the saved row (with sender name/role already joined) so the frontend can show it immediately without a second round trip. */
async sendMessage(appointmentId, content, userPrincipal) {
```
**If this goes missing or moves elsewhere:** the POST endpoint breaks at compile time; more subtly, if the empty-content check inside this function (`if (!content || !content.trim())`) were removed instead of the whole function, a customer or mechanic could post empty/whitespace-only messages that clutter the thread with nothing readable.

#### Lines 61–75 — the badge/sort data source, server-side
```js
/*Comment : Powers the "new message" badges and sort-to-top ordering. Deliberately takes NO appointment ids from the caller - it derives the caller's own appointment set the exact same way appointmentService.getAppointments already does (by role), so there's no way to ask about someone else's thread by just passing a different id. Zero new tables/columns: this is one aggregate read against the existing conversation table. */
async getLatestActivityForUser(userPrincipal) {
```
**If this goes missing or moves elsewhere:** if this were rewritten to accept a client-supplied list of appointment ids instead of deriving them server-side, it would open a real authorization hole — a malicious client could probe for the latest-message timestamp of appointments that aren't theirs, leaking *when* someone messaged even without reading the content.

#### Lines 78–90 — response shaping
```js
/*Comment : Helper - reshapes the raw SQL row (snake_case-derived aliases) into the flat DTO shape the frontend's Message type expects, same pattern as appointmentService.formatAppointmentResponse. */
formatMessageResponse(row) {
```
**If this goes missing or moves elsewhere:** both `getMessages` and `sendMessage` call this to build their responses — without it, the frontend's `Message` type (`conversationId`, `senderName`, `senderRole`, etc.) wouldn't match what the API actually returns, breaking every consumer of message data at the TypeScript boundary or, worse, silently at runtime if the mismatch isn't caught.

---

### File: `backend/src/controllers/conversationController.js` *(new file)*

#### Lines 9–17 — GET messages
```js
/*Comment : GET /api/appointments/:id/messages - loads the thread for one appointment. Also the endpoint the frontend's background poll hits every ~1.5s while a chat modal is open. */
async getMessages(req, res, next) {
```
**If this goes missing or moves elsewhere:** the route registration in `appointmentRoutes.js` references `conversationController.getMessages` directly — removing this method breaks the whole file's `require` at server boot, not just this one endpoint.

#### Lines 20–28 — POST a message
```js
/*Comment : POST /api/appointments/:id/messages - sends one message onto the thread. Body is just { content }; sender is always taken from the authenticated token, never from the request body, so nobody can post as someone else. */
async sendMessage(req, res, next) {
```
**If this goes missing or moves elsewhere:** if `sender` were ever taken from `req.body` instead of `req.user.userId`, a malicious client could post messages that appear to come from someone else entirely — this comment documents a real, deliberate security decision, not just an implementation note.

#### Lines 31–39 — GET latest activity
```js
/*Comment : GET /api/appointments/messages/latest - one row per appointment the caller is party to that has at least one message, with just its latest sent_at + sender. The dashboards poll this occasionally to know which "Messages" buttons deserve a new-message badge and which appointments should sort to the top of their group. */
async getLatestActivity(req, res, next) {
```
**If this goes missing or moves elsewhere:** both dashboards' `loadData()` calls this on every load — removing it would make `api.getLatestMessageActivity()` 404, which (since the frontend wraps that call in `.catch(() => [])`) would silently disable every badge/sort feature rather than crash, making the regression easy to miss without dedicated testing.

---

### File: `backend/src/routes/appointmentRoutes.js` — message routes

#### Lines 18–19 — the latest-activity route, deliberately ordered first
```js
/*Comment : Registered BEFORE the /:id routes on purpose - it's a literal two-segment path (/messages/latest), not an appointment id, and putting explicit routes ahead of param routes avoids any ambiguity about match order as this file grows. */
router.get('/messages/latest', (req, res, next) => conversationController.getLatestActivity(req, res, next));
```
**If this goes missing or moves elsewhere:** moving this line below `/:id` and `/:id/messages` wouldn't actually break matching today (Express matches by segment count, and `/messages/latest` is a two-segment path that doesn't collide with `/:id/messages`'s literal second segment) — but the comment documents *why* it's placed defensively first, and removing the route entirely breaks the badge/sort system exactly as described above.

#### Lines 21–25 — the appointment-scoped message routes
```js
/*Comment : Hero Feature 7 (Customer-Mechanic Communication) - nested under the appointment it belongs to, matching the PDF's "Appointment Hub" framing. No requireRole() here on purpose: both CUSTOMER and MECHANIC are allowed in, but conversationService itself checks that the caller is THIS appointment's own customer or mechanic, not just any workshop member with that role. */
router.get('/:id/messages', (req, res, next) => conversationController.getMessages(req, res, next));
router.post('/:id/messages', (req, res, next) => conversationController.sendMessage(req, res, next));
```
**If this goes missing or moves elsewhere:** removing these two lines takes down chat entirely — every "Messages" button in both dashboards would call a 404'd endpoint. Adding `requireRole('CUSTOMER')` or `requireRole('MECHANIC')` here instead of leaving both roles open would break chat for one side of every conversation, since a mechanic and a customer both need access to the same thread.

---

### File: `frontend/src/lib/api.ts` — client-side message endpoints

#### Lines 172–180 — the `Message` type
```ts
/*Comment : One row from the CONVERSATION table (Hero Feature 7), already joined with the sender's name/role on the backend so the chat UI never has to look that up separately. */
export interface Message {
```
**If this goes missing or moves elsewhere:** every consumer of message data (`AppointmentChatModal`, the unread-tracker's `LatestActivity` comparisons) would fail to compile — this is the single source of truth for what a message object looks like on the frontend.

#### Lines 183–189 — the `LatestActivity` type
```ts
/*Comment : One row per appointment that has at least one message - just enough to know "did something new happen here since I last looked", without fetching every thread in full. */
export interface LatestActivity {
```
**If this goes missing or moves elsewhere:** `unreadTracker.ts`'s `hasNewMessage`/`findActivity` functions are typed against this interface — removing it breaks the entire badge/sort system at compile time, not just the type-checking convenience.

#### Lines 395–400 — `getMessages`
```ts
/*Comment : Hero Feature 7 - fetches one appointment's message thread. This is also what the chat modal's background poll calls repeatedly while it's open. */
async getMessages(appointmentId: number): Promise<Message[]> {
```
**If this goes missing or moves elsewhere:** `AppointmentChatModal`'s `loadMessages` function calls this on mount, on every poll tick, and after every send — removing it breaks the chat modal at compile time, not just one code path within it.

#### Lines 402–407 — `sendMessage`
```ts
/*Comment : Hero Feature 7 - posts one new message onto an appointment's thread. */
async sendMessage(appointmentId: number, content: string): Promise<Message> {
```
**If this goes missing or moves elsewhere:** the chat modal's send box's `onSubmit` handler calls this directly — without it, the "send" button in every chat thread across both dashboards stops working.

#### Lines 410–415 — `getLatestMessageActivity`
```ts
/*Comment : One call covering every appointment the caller is party to - powers the "new message" badges and the sort-to-top ordering, without fetching each thread individually. */
async getLatestMessageActivity(): Promise<LatestActivity[]> {
```
**If this goes missing or moves elsewhere:** both dashboards' `loadData()` functions call this — since it's wrapped in `.catch(() => [])` at every call site, removing it wouldn't crash anything, it would just make every badge and every "new message sorts first" ordering permanently inert, workshop-wide, with no visible error anywhere.

---

### File: `frontend/src/components/AppointmentChatModal.tsx` *(new file)* — the shared chat UI

#### Lines 10–13 — the realtime strategy
```tsx
/*Comment : Hero Feature 7's chosen realtime behavior - "faster polling", not WebSockets (which the spec explicitly defers). Every 1.5s the open modal quietly re-asks the backend for this appointment's thread, so a reply shows up within a couple seconds without needing a live push connection. */
const POLL_INTERVAL_MS = 1500;
```
**If this goes missing or moves elsewhere:** every reference to `POLL_INTERVAL_MS` below (the `setInterval` call) would fail to compile without this constant — the chat would either not poll at all (stuck showing whatever loaded on open) or need a magic number reintroduced with no explanation of why 1.5s was chosen over, say, 5s or 30s.

#### Lines 14–19 — why this component is shared, and its minimal prop shape
```tsx
/*Comment : Only the fields actually used here are required, so this same modal works from both CustomerDashboard's and MechanicDashboard's own Appointment shape without them needing to agree on anything extra. */
appointment: Pick<Appointment, "appointmentId" | "vehicleInfo">;
...
/*Comment : Shared by both the customer and mechanic dashboards - one component, so the two sides of the same "Customer-Mechanic Communication" feature can't drift out of sync with each other. */
export function AppointmentChatModal({ appointment, onClose }: AppointmentChatModalProps) {
```
**If this goes missing or moves elsewhere:** widening the `appointment` prop to require the *full* `Appointment` type instead of the `Pick`'d subset would still compile today (both dashboards pass full appointments), but would make the component needlessly coupled to fields it doesn't use — a smaller, unrelated change elsewhere in the `Appointment` type could then force unnecessary edits here.

#### Lines 30–41 — the single source of truth for loading + marking seen
```tsx
/*Comment : Single place that actually talks to the backend - called once on open, again after every send, and repeatedly by the poll timer below. Errors are swallowed here on purpose: a background refresh failing shouldn't pop an alert over someone's shoulder while they're mid-conversation. */
const loadMessages = async () => {
  try {
    const list = await api.getMessages(appointment.appointmentId);
    setMessages(list);
    /*Comment : Marks the thread "seen" on every successful load, not just once when the modal opens - so a message that arrives mid-conversation (caught by the poll below) is also counted as read, since it was genuinely just displayed to the user. */
    markSeen(appointment.appointmentId);
```
**If this goes missing or moves elsewhere:** moving `markSeen` to only fire once on mount (instead of on every successful load) would reintroduce a real bug: a message that arrives while the modal is already open and being polled would be genuinely displayed to the user, but never marked seen — so its "!" badge would incorrectly reappear the next time they view their appointment list, even though they already read it.

#### Lines 47–51 — the poll lifecycle
```tsx
/*Comment : Background auto-refresh. Starts the moment this modal mounts, stops (clearInterval) the moment it unmounts - so closing the chat really does stop the polling, nothing keeps running for a thread nobody is looking at. */
const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
return () => clearInterval(interval);
```
**If this goes missing or moves elsewhere:** losing the `clearInterval` cleanup specifically (not the whole block) would leak a timer per opened-then-closed chat modal — over a long session with many appointments checked, this would accumulate into multiple simultaneous polling loops hitting the backend for threads nobody is even looking at anymore.

#### Line 53 — auto-scroll
```tsx
/*Comment : Keeps the newest message in view as the list grows, the same way any chat app auto-scrolls instead of leaving you stranded at the top. */
```
**If this goes missing or moves elsewhere:** comment-only above a `useEffect` that scrolls to `bottomRef` — losing it costs nothing at runtime, but losing the effect itself (not just the comment) would leave a long conversation stuck scrolled to the top on every new message, forcing the user to manually scroll down each time.

---

### File: `frontend/src/components/dashboard/CustomerDashboard.tsx` — chat wiring, booking note preservation, AI diagnosis code

#### Line 139 — the badge/sort data in state
```tsx
/*Comment : Latest-message info for every appointment this customer is party to - drives both the "!" badge on Messages buttons and the "new message sorts to top" ordering, everywhere appointments are listed. */
const [latestActivity, setLatestActivity] = useState<LatestActivity[]>([]);
```
**If this goes missing or moves elsewhere:** every `hasNewMessage(findActivity(latestActivity, ...))` call across the file (Tab 3's cards, Tab 4's cards) would fail to compile — the entire badge/sort system on the customer's side is anchored to this one state variable.

#### Line 152 — which chat thread is open
```tsx
/*Comment : Which appointment's message thread is open right now, if any - Hero Feature 7. Same "store the object, not just the id" reasoning as healthVehicle above, so AppointmentChatModal has what it needs (appointmentId, vehicleInfo for its header) the instant it opens. */
const [chatAppointment, setChatAppointment] = useState<Appointment | null>(null);
```
**If this goes missing or moves elsewhere:** every "Messages" button's `onClick={() => setChatAppointment(a)}` and the modal's conditional render (`{chatAppointment && <AppointmentChatModal .../>}`) fail to compile — chat becomes entirely unreachable from the customer's side.

#### Line 280 — the booking-time bug fix
```tsx
/*Comment : Wraps the customer's own note in the same "Customer Request:" marker buildServiceDescription uses everywhere else, from the moment the appointment is created. That's what lets it survive later - when the mechanic saves their own write-up, they parse this back out and carry it forward untouched, instead of it just being raw text a second raw-text save can blindly overwrite. */
const initialDescription = buildServiceDescription(bookForm.serviceDescription, "", []);
```
**If this goes missing or moves elsewhere:** reverting this to send `bookForm.serviceDescription` raw (unwrapped) would mean brand-new appointments never get the `"Customer Request:"` marker at all — when a mechanic later completes the work, `parseServiceDescription` would treat the customer's entire original note as unmarked legacy text, and the mechanic's own save would overwrite it, silently reintroducing the exact bug Feature 6's fix addressed.

#### Line 306 — the "customer notes only" simplification
```tsx
/*Comment : Only the customer's own note belongs on this quick-glance card - the mechanic's write-up is a separate concern that lives in the Service History "Expand" detail view instead, so this list never shows the customer text mixed in with (or worse, replaced by) the mechanic's. */
const { customerRequest } = parseServiceDescription(a.serviceDescription);
```
**If this goes missing or moves elsewhere:** destructuring `narrative` back in here and rendering it alongside `customerRequest` (as an earlier revision briefly did) would put the mechanic's notes back on the Appointments & Reminders card — the exact thing the user asked to be removed from that specific view.

#### Line 343 — the badge on the Messages button
```tsx
{/*Comment : Opens this appointment's message thread - Hero Feature 7. The red "!" badge appears only when the latest message is from the other participant and hasn't been marked seen yet on this browser. */}
```
**If this goes missing or moves elsewhere:** comment-only above the button; the badge's actual logic (`isNew && <span>...</span>`) sits a few lines below and would need to be removed separately to actually disable the visual indicator.

#### Line 1103 — the AI Diagnosis Code field
```tsx
{/*Comment : Optional - lets the customer type the code (report id) from an AI Diagnosis they already discussed with the mechanic in chat, so this appointment gets linked back to that diagnosis. The backend verifies it's a real report and actually belongs to this customer before accepting it - typing the wrong number just gets a clear error, not a silent mismatch. */}
```
**If this goes missing or moves elsewhere:** without this field, `bookForm.reportId` goes back to being permanently `undefined` (its state was never otherwise settable) — every appointment would book with no diagnosis link, and `AppointmentDetailModal`'s "The Problem This Visit Was For" section would never have anything to show, for any appointment, ever.

#### Line 154 — the Expand modal's state
```tsx
/*Comment : Which Service History entry's "Expand" detail view is open right now, if any - the itemized parts bill + mechanic's notes + cost summary. */
const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
```
**If this goes missing or moves elsewhere:** the Service History tab's "Expand" buttons and the `AppointmentDetailModal` render both depend on this state — removing it makes the detail view entirely unreachable, collapsing Feature 6 back to just the compact card with no way to see the full breakdown.

---

### File: `backend/src/services/appointmentService.js` — validating the AI Diagnosis Code

#### Lines 79–92
```js
/*Comment : Validates the optional AI-diagnosis code the customer typed into the booking form. This field used to be dead code (nothing in the UI ever set it), so it was never actually exercised by real user input before - now that a customer types a raw report id by hand, it has to be checked properly: does a report with that id even exist, is it in this workshop, and (for a customer booking their own appointment) does it actually belong to THEM. Without this, a typo or someone else's number would silently link the appointment to the wrong diagnosis. */
let verifiedReportId = null;
if (reportId) {
  const report = await problemReportRepo.findById(null, reportId);
  ...
}
```
**If this goes missing or moves elsewhere:** without this validation, a customer typing any number (a typo, or deliberately someone else's report id) would create a real foreign-key link from their appointment to a diagnosis they have no relationship to — the FK constraint would still require the *id* to exist somewhere, but would happily point at another customer's or even another workshop's report, since nothing checked ownership before this block was added.

---

### File: `frontend/src/components/dashboard/MechanicDashboard.tsx` — chat wiring, grouping, badges, request-appointment

#### Line 49 — which chat thread is open (mechanic side)
```tsx
/*Comment : Which appointment's message thread is open right now, if any - Hero Feature 7, mirrors the same state/component CustomerDashboard uses, so both sides of the conversation share one implementation. */
const [chatAppointment, setChatAppointment] = useState<Appointment | null>(null);
```
**If this goes missing or moves elsewhere:** same failure mode as the customer-side equivalent — every "Messages" button on the mechanic's work-order cards and the modal render both depend on this state.

#### Line 40 — badge/sort data (mechanic side)
```tsx
/*Comment : Same "who has an unread message" data source CustomerDashboard uses - one shared endpoint, so both sides of a conversation agree on what counts as new. */
const [latestActivity, setLatestActivity] = useState<LatestActivity[]>([]);
```
**If this goes missing or moves elsewhere:** the mechanic's badges and grouped-sort ordering both fail to compile without it — and if it existed but were populated from a *different* endpoint than the customer's side uses, the two dashboards could disagree about what "new" means for the same conversation, an inconsistency that would be confusing rather than crash-worthy.

#### Line 183 — the shared work-order card, and what "Complete" deliberately doesn't do
```tsx
/*Comment : Renders one work-order card - shared across all three Not Completed / Pending / Complete groups below. Same red "!" badge convention as CustomerDashboard's Messages button. "Complete" reads invoiceStatus passively (it's just PENDING vs PAID data already on the appointment) - there's deliberately no action here to change it. Marking an invoice paid belongs to hero feature 8 (payment status of invoices sent to customer), which is a separate piece of work. */
const renderAppointmentCard = (a: Appointment) => {
```
**If this goes missing or moves elsewhere:** this is the single card renderer reused by all three `CollapsibleGroup`s below — removing it collapses the entire grouped-queue UI, not just one group's cards.

#### Line 212 — the badge
```tsx
{/*Comment : Same badge convention as the customer's side - a red "!" when the latest message is from the other participant and hasn't been marked seen on this browser yet. */}
```
**If this goes missing or moves elsewhere:** comment-only above the badge span; removing the actual `isNew && <span>...</span>` markup (not just this comment) would leave the mechanic with no visual cue that a customer replied, even though the underlying "new message" detection and sort-to-top ordering would still work correctly.

#### Line 398 — the shared 3-category grouping
```tsx
/*Comment : Same 3-category grouping as the customer's side, using the identical shared helper - Not Completed (still needs work), Pending (done, unpaid), Complete (done, paid) - so both dashboards agree on what each bucket means. */
const { notCompleted, pending, complete } = groupAppointments(appointments, latestActivity, user?.userId);
```
**If this goes missing or moves elsewhere:** the three `CollapsibleGroup` sections below all destructure from this one call — removing it breaks the entire "Assigned Service Queue" tab's structure, reverting it to needing a flat, ungrouped list rewritten from scratch.

#### Lines 471–479 — the two-option replacement for the removed chat-before-appointment attempt
```tsx
{/*Comment : Two options per case, gated on resolved status - not chat (that idea's been dropped; it needed an appointment that a fresh diagnosis doesn't have yet). Request Appointment only shows while the case is still OPEN - once resolved there's nothing left to ask the customer to book. */}
{r.status === "OPEN" && (
  <button
    onClick={() => handleRequestAppointment(r.reportId)}
```
**If this goes missing or moves elsewhere:** without the `r.status === "OPEN"` guard specifically, "Request Appointment" would keep showing on already-resolved diagnostic cases, inviting a mechanic to send a customer a booking reminder for something that's already been handled — a confusing, redundant nudge rather than a crash.

#### Lines 587–632, 658 — parts-list billing UI (mechanic side)
See the identical entries under Feature 6 above — this UI lives in this same file and its impact analysis is unchanged; not duplicated here to avoid drift between two copies of the same note.

#### Line 688 — the chat modal render
```tsx
{/*Comment : Hero Feature 7's chat modal, same shared component and same "only mounted while a chat is open" rule as CustomerDashboard, so the poll timer never runs for a thread nobody is looking at. */}
```
**If this goes missing or moves elsewhere:** comment-only above `{chatAppointment && <AppointmentChatModal .../>}` — removing the conditional itself (not just the comment) would either mount the modal permanently (crashing on a `null` appointment) or never mount it at all, depending on which half of the guard were lost.

---

### File: `frontend/src/lib/appointmentGroups.ts` *(new file)* — the shared grouping/sorting rule

#### Lines 4–24
```ts
/*Comment : The 3-category grouping used on both the customer's and mechanic's appointment lists - same rules, same sort order, shared in one place so the two dashboards can't quietly drift apart on what "Pending" means. */
export interface GroupedAppointments {
...
/*Comment : Not Completed = anything still in progress (SCHEDULED/IN_PROGRESS) or CANCELLED - work that isn't finished, so there's no bill to speak of yet. Pending = finished work whose invoice hasn't been paid. Complete = finished work that's been paid. Within each group, an appointment with an unread message jumps to the top - "cars with new messages shown at top", as requested - and ties break by most recent first. */
export function groupAppointments(
```
**If this goes missing or moves elsewhere:** both dashboards' three `CollapsibleGroup` sections call this one function — removing it breaks both files at compile time simultaneously. If instead of being removed it were *duplicated* (one copy per dashboard, editable independently), the two sides could drift — e.g. one dashboard could start treating `CANCELLED` as its own group while the other still folds it into "Not Completed," and nobody would notice until a customer and their mechanic saw a different picture of the same appointment.

---

### File: `frontend/src/components/CollapsibleGroup.tsx` *(new file)*

#### Line 14
```tsx
/*Comment : One collapsible section - a click-to-toggle header showing the group's name and how many items are in it, with its cards underneath. Used identically by both dashboards for the Not Completed / Pending / Complete grouping, so all three groups behave the same way everywhere instead of each screen reinventing its own expand/collapse. */
export function CollapsibleGroup({ title, count, accentClass, defaultOpen = true, children }: CollapsibleGroupProps) {
```
**If this goes missing or moves elsewhere:** six call sites total (three groups × two dashboards) depend on this one component — removing it breaks both `CustomerDashboard.tsx` and `MechanicDashboard.tsx` at compile time at once, not just one screen's grouping UI.

---

### File: `frontend/src/lib/unreadTracker.ts` *(new file)* — browser-local read-state

#### Lines 1–5 — the deliberate trade-off
```ts
/*Comment : "Have I seen this appointment's latest message" tracking, kept entirely in the browser (localStorage) rather than the database - there's no read-state column anywhere in the schema, and adding one is a real schema change. The trade-off, on purpose: this is per-browser, not synced across devices. Checking messages on your phone won't clear the badge on your laptop. Wrapped in try/catch throughout since localStorage can throw (private browsing, storage disabled, etc.) and a badge feature should never be able to crash the dashboard. */
```
**If this goes missing or moves elsewhere:** comment-only, documenting a real architectural decision (no schema change, at the cost of no cross-device sync) — losing it costs nothing at runtime, but the next person "fixing" the cross-device gap without reading this would likely reach straight for a schema change that wasn't supposed to happen for this feature.

#### Line 7 — `markSeen`
```ts
/*Comment : Records "I have now seen everything on this thread up to this moment" - called by AppointmentChatModal every time it successfully loads messages, not just once on open, so a reply that arrives while you're already sitting in the modal still gets marked seen. */
export function markSeen(appointmentId: number): void {
```
**If this goes missing or moves elsewhere:** `AppointmentChatModal`'s `loadMessages` calls this directly — removing it breaks the chat modal at compile time, and (if it existed but silently did nothing) badges would never clear even after a thread is genuinely read, making the "!" indicator permanently, uselessly stuck on.

#### Line 24 — `hasNewMessage`
```ts
/*Comment : True only when the latest message on this thread (a) exists, (b) wasn't sent by the current user themselves (you don't need a badge for your own message), and (c) arrived after the last time this browser marked the thread seen. */
export function hasNewMessage(activity: LatestActivity | undefined, currentUserId: number | undefined): boolean {
```
**If this goes missing or moves elsewhere:** every badge and every sort-to-top comparison across both dashboards and the Service History tab calls this one function — removing condition (b) specifically (without removing the function) would cause a customer's own just-sent message to show a badge on their own button, which would look like a bug even though nothing actually crashed.

#### Line 36 — `findActivity`
```ts
/*Comment : Small convenience wrapper so callers don't have to juggle a raw LatestActivity[] array everywhere - looks up one appointment's activity by id, or undefined if that appointment has no messages at all yet. */
export function findActivity(activity: LatestActivity[], appointmentId: number): LatestActivity | undefined {
```
**If this goes missing or moves elsewhere:** every `hasNewMessage(findActivity(latestActivity, a.appointmentId), ...)` call site (both dashboards, Service History) would need its own inline `.find()` instead — not a crash if removed cleanly, but a guaranteed source of copy-paste drift the moment one call site's inline version diverges from another's.

---

### Removed: chat-before-an-appointment-exists (attempted, then replaced)

For one round, "Shop Diagnostic Cases" had a "Chat with Customer" button gated on whether an appointment already existed for that diagnosis — showing a disabled, tooltip-explained lock otherwise. This hit a real, unavoidable wall: `conversation.appointment_id` is `NOT NULL` in the schema, so chat genuinely cannot exist before an appointment does, and a fresh AI diagnosis has none yet. Rather than force a fake placeholder appointment into existence just to unlock chat (with real, confusing side effects on the customer's own appointment list), it was replaced with `problemReportService.requestAppointmentReminder` — see `backend/src/services/problemReportService.js:239` and `backend/src/routes/problemReportRoutes.js:16` above — a real `REMINDER` row instead, gated on `report.status === "OPEN"` in `MechanicDashboard.tsx:471`.
