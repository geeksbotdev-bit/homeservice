/**
 * Translation helpers for the places a string cannot pass through <Text>.
 *
 * The shared <Text> component translates its own children, which covers most of
 * the app. These helpers cover the rest:
 *   · TextInput placeholders and other props  → ph()
 *   · native dialogs                          → alertT()
 *   · toasts raised from logic, not JSX       → toastT()
 *
 * They read the live language from the store, so switching language in
 * Settings changes them on the next render / next call, exactly like <Text>.
 */
import { Alert, Platform, type AlertButton } from 'react-native';
import { translate, format, getLang } from './store/lang';
import { showToast } from './store/toast';

/** Translate a plain string outside React (props, helpers, services). */
export const tr = (s?: string | null): string => (s ? translate(s, getLang()) : '');

/** Placeholder text for an input. Reads better at the call site than tr(). */
export const ph = tr;

/** Translate a phrase that carries values: trf('{price} per {noun}', {...}). */
export const trf = (key: string, vars: Record<string, string | number>): string =>
  format(key, vars, getLang());

/**
 * Alert.alert with the title, message and button labels translated.
 *
 * react-native-web does not implement Alert, so on web this used to do nothing
 * at all — errors vanished and a failing button looked like a dead button. Web
 * falls back to the browser's own dialog, which also gives Cancel/OK a meaning.
 */
export function alertT(title: string, message?: string, buttons?: AlertButton[]) {
  const t = tr(title);
  const m = message ? tr(message) : undefined;

  if (Platform.OS === 'web') {
    const text = m ? `${t}\n\n${m}` : t;
    const cancel = buttons?.find((b) => b.style === 'cancel');
    const action = buttons?.find((b) => b.style !== 'cancel');
    try {
      // With two choices use confirm() so the destructive one can be declined.
      if (cancel && action) {
        if (window.confirm(text)) action.onPress?.();
        else cancel.onPress?.();
      } else {
        window.alert(text);
        action?.onPress?.();
      }
    } catch { /* no DOM (SSR / tests) */ }
    return;
  }

  Alert.alert(t, m, buttons?.map((b) => ({ ...b, text: b.text ? tr(b.text) : b.text })));
}

/** showToast with both lines translated. */
export function toastT(title: string, body = '', bookingId?: string) {
  showToast(tr(title), tr(body), bookingId);
}
