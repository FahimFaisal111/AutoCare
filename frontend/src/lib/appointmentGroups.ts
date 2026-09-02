import { Appointment, LatestActivity } from "@/lib/api";
import { hasNewMessage, findActivity } from "@/lib/unreadTracker";

/*Comment : The 3-category grouping used on both the customer's and mechanic's appointment lists - same rules, same sort order, shared in one place so the two dashboards can't quietly drift apart on what "Pending" means. */

export interface GroupedAppointments {
  notCompleted: Appointment[];
  pending: Appointment[];
  complete: Appointment[];
}

/*Comment : Not Completed = anything still in progress (SCHEDULED/IN_PROGRESS) or CANCELLED - work that isn't finished, so there's no bill to speak of yet. Pending = finished work whose invoice hasn't been paid. Complete = finished work that's been paid. Within each group, an appointment with an unread message jumps to the top - "cars with new messages shown at top", as requested - and ties break by most recent first. */
export function groupAppointments(
  appointments: Appointment[],
  latestActivity: LatestActivity[],
  currentUserId: number | undefined
): GroupedAppointments {
  const byNewMessageThenDate = (a: Appointment, b: Appointment) => {
    const aIsNew = hasNewMessage(findActivity(latestActivity, a.appointmentId), currentUserId);
    const bIsNew = hasNewMessage(findActivity(latestActivity, b.appointmentId), currentUserId);
    if (aIsNew !== bIsNew) {
      return aIsNew ? -1 : 1;
    }
    return new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime();
  };

  const notCompleted = appointments.filter((a) => a.status !== "COMPLETED").sort(byNewMessageThenDate);
  const pending = appointments
    .filter((a) => a.status === "COMPLETED" && a.invoiceStatus !== "PAID")
    .sort(byNewMessageThenDate);
  const complete = appointments
    .filter((a) => a.status === "COMPLETED" && a.invoiceStatus === "PAID")
    .sort(byNewMessageThenDate);

  return { notCompleted, pending, complete };
}
