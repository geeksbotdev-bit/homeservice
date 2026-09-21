import { useEffect, useState } from 'react';
import { chat } from '../services/api';
import { isAuthed } from '../services/client';
import { showToast } from './toast';

// Per-conversation unread snapshot from the last poll (to detect NEW messages).
let prevUnread: Record<string, number> | null = null;

/**
 * Tiny global store for the Messages tab unread badge.
 * Any screen can call refreshUnread() (e.g. after reading a chat) and every
 * subscriber (the tab bar) updates immediately.
 */
let count = 0;
const listeners = new Set<(n: number) => void>();

/** Drop the badge + message history immediately on sign-out (no 8s lag). */
export function resetUnread() {
  count = 0;
  prevUnread = null;
  listeners.forEach((l) => l(count));
}

export async function refreshUnread() {
  // /conversations requires a token. The tab bar is mounted globally (including
  // over the auth flow, where hooks still run even though the bar is hidden), so
  // without this guard the poller 401s every 8s on the login screen.
  if (!isAuthed()) {
    count = 0;
    prevUnread = null; // so the next signed-in poll doesn't toast pre-existing unread
    listeners.forEach((l) => l(count));
    return;
  }
  try {
    const convos = await chat.conversations();
    count = convos.filter((c) => c.unread > 0).length; // # of conversations with unread
    // Toast for messages that arrived since the last poll (unread went up).
    // Skip the very first run so we don't toast pre-existing unread on launch.
    if (prevUnread) {
      for (const c of convos) {
        if (c.unread > (prevUnread[c.bookingId] ?? 0)) {
          showToast(c.name || 'New message', c.lastMessage || 'You have a new message', c.bookingId);
        }
      }
    }
    prevUnread = Object.fromEntries(convos.map((c) => [c.bookingId, c.unread]));
  } catch {
    count = 0;
  }
  listeners.forEach((l) => l(count));
}

export function useUnreadCount() {
  const [n, setN] = useState(count);
  useEffect(() => {
    listeners.add(setN);
    refreshUnread();
    // Poll so the badge updates when a new message arrives (live count).
    const t = setInterval(refreshUnread, 8000);
    return () => { listeners.delete(setN); clearInterval(t); };
  }, []);
  return n;
}
