"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, Appointment, Message, ApiError } from "@/lib/api";
import { AlertMessage } from "@/components/AlertMessage";
import { markSeen } from "@/lib/unreadTracker";
import { MessageCircle, Send, Loader2 } from "lucide-react";

/*Comment : Hero Feature 7's chosen realtime behavior - "faster polling", not WebSockets (which the spec explicitly defers). Every 1.5s the open modal quietly re-asks the backend for this appointment's thread, so a reply shows up within a couple seconds without needing a live push connection. */
const POLL_INTERVAL_MS = 1500;

interface AppointmentChatModalProps {
  /*Comment : Only the fields actually used here are required, so this same modal works from both CustomerDashboard's and MechanicDashboard's own Appointment shape without them needing to agree on anything extra. */
  appointment: Pick<Appointment, "appointmentId" | "vehicleInfo">;
  onClose: () => void;
}

/*Comment : Shared by both the customer and mechanic dashboards - one component, so the two sides of the same "Customer-Mechanic Communication" feature can't drift out of sync with each other. */
export function AppointmentChatModal({ appointment, onClose }: AppointmentChatModalProps) {
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  /*Comment : Single place that actually talks to the backend - called once on open, again after every send, and repeatedly by the poll timer below. Errors are swallowed here on purpose: a background refresh failing shouldn't pop an alert over someone's shoulder while they're mid-conversation. */
  const loadMessages = async () => {
    try {
      const list = await api.getMessages(appointment.appointmentId);
      setMessages(list);
      /*Comment : Marks the thread "seen" on every successful load, not just once when the modal opens - so a message that arrives mid-conversation (caught by the poll below) is also counted as read, since it was genuinely just displayed to the user. */
      markSeen(appointment.appointmentId);
    } catch {
      // Quiet failure - see comment above.
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    /*Comment : Background auto-refresh. Starts the moment this modal mounts, stops (clearInterval) the moment it unmounts - so closing the chat really does stop the polling, nothing keeps running for a thread nobody is looking at. */
    const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.appointmentId]);

  /*Comment : Keeps the newest message in view as the list grows, the same way any chat app auto-scrolls instead of leaving you stranded at the top. */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isSending) return;

    setIsSending(true);
    setSendError("");
    try {
      await api.sendMessage(appointment.appointmentId, draft.trim());
      setDraft("");
      await loadMessages();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setSendError(apiErr.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
            <MessageCircle className="w-4 h-4 text-sky-400" />
            <span>Messages — {appointment.vehicleInfo}</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-sm font-bold">
            ✕
          </button>
        </div>

        {/*Comment : The thread itself - each bubble aligned right/highlighted for the current user's own messages, left/muted for the other participant's, same visual convention as every common chat app. */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">No messages yet — say hello.</p>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === user?.userId;
              return (
                <div key={m.conversationId} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${
                      isMine ? "bg-sky-500 text-zinc-950" : "bg-zinc-800 text-zinc-200"
                    }`}
                  >
                    <div className={`font-semibold mb-0.5 ${isMine ? "text-zinc-900/70" : "text-zinc-400"}`}>
                      {isMine ? "You" : m.senderName} · {m.senderRole}
                    </div>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    <div className={`text-[10px] mt-1 ${isMine ? "text-zinc-900/60" : "text-zinc-500"}`}>
                      {new Date(m.sentAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {sendError && (
          <div className="px-4 pb-1">
            <AlertMessage type="error" message={sendError} />
          </div>
        )}

        {/*Comment : Send box - Enter/click posts the message, then immediately re-fetches the thread so the sender sees their own message land without waiting for the next poll tick. */}
        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-zinc-800 p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            className="p-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
