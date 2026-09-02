import { LatestActivity } from "@/lib/api";

/*Comment : "Have I seen this appointment's latest message" tracking, kept entirely in the browser (localStorage) rather than the database - there's no read-state column anywhere in the schema, and adding one is a real schema change. The trade-off, on purpose: this is per-browser, not synced across devices. Checking messages on your phone won't clear the badge on your laptop. Wrapped in try/catch throughout since localStorage can throw (private browsing, storage disabled, etc.) and a badge feature should never be able to crash the dashboard. */

const STORAGE_PREFIX = "autocare_last_seen_appt_";

/*Comment : Records "I have now seen everything on this thread up to this moment" - called by AppointmentChatModal every time it successfully loads messages, not just once on open, so a reply that arrives while you're already sitting in the modal still gets marked seen. */
export function markSeen(appointmentId: number): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + appointmentId, new Date().toISOString());
  } catch {
    // Storage unavailable - badges just won't clear this session, not fatal.
  }
}

function getLastSeen(appointmentId: number): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + appointmentId);
  } catch {
    return null;
  }
}

/*Comment : True only when the latest message on this thread (a) exists, (b) wasn't sent by the current user themselves (you don't need a badge for your own message), and (c) arrived after the last time this browser marked the thread seen. */
export function hasNewMessage(activity: LatestActivity | undefined, currentUserId: number | undefined): boolean {
  if (!activity || !currentUserId || activity.lastSenderId === currentUserId) {
    return false;
  }
  const lastSeen = getLastSeen(activity.appointmentId);
  if (!lastSeen) {
    return true;
  }
  return new Date(activity.lastMessageAt).getTime() > new Date(lastSeen).getTime();
}

/*Comment : Small convenience wrapper so callers don't have to juggle a raw LatestActivity[] array everywhere - looks up one appointment's activity by id, or undefined if that appointment has no messages at all yet. */
export function findActivity(activity: LatestActivity[], appointmentId: number): LatestActivity | undefined {
  return activity.find((a) => a.appointmentId === appointmentId);
}
