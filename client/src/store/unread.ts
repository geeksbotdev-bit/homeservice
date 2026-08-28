import { useEffect, useState } from 'react';
import { chat } from '../services/api';
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

export async function refreshUnread() {
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
