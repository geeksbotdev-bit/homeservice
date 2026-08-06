import { useEffect, useState } from 'react';
import { chat } from '../services/api';

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
