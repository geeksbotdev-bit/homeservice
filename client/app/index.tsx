import { Redirect } from 'expo-router';
import { isAuthed, isPro } from '../src/services/client';

// App entry — if a valid session is stored, go straight into the app;
// otherwise start at Welcome. (A stale token self-heals: the first API call
// returns 401 and the app bounces back to Welcome.)
export default function Index() {
  if (isAuthed()) return <Redirect href={isPro() ? '/(pro)' : '/(tabs)'} />;
  return <Redirect href="/(auth)/welcome" />;
}
