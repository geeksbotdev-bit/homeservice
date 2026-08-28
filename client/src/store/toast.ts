// Tiny global toast bus. Any code calls showToast(...); the <Toaster/> mounted
// at the app root renders it as a banner that slides in from the top.
export interface ToastMsg { id: number; title: string; body: string; bookingId?: string }

const listeners = new Set<(t: ToastMsg) => void>();
let seq = 0;

export function showToast(title: string, body: string, bookingId?: string) {
  const t: ToastMsg = { id: ++seq, title, body, bookingId };
  listeners.forEach((l) => l(t));
}

export function subscribeToast(fn: (t: ToastMsg) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
