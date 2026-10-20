import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, BACKEND_URL, Local_IP } from '@env';
import useAuthStore from '../stores/authStore';

// AppNavigator registers its navigationRef with this in onReady, so each
// screen change becomes a transaction named after its route.
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

// Trace headers go to our backend only, not RevenueCat, Google or Firebase.
// Same host choice as getBackendUrl in Helper.js.
const backendHost = BACKEND_URL
  ? BACKEND_URL.replace(/^https?:\/\//, '').split('/')[0]
  : `${Local_IP || 'localhost'}:3000`;

// The auth responses don't include the uuid, but the access token's userId
// claim is it. Read only, never verified: it's just a label on events.
const uuidFromToken = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(padded)).userId || null;
  } catch {
    return null;
  }
};

// Only the account's uuid, never the username or email. No uuid means no
// user rather than falling back to something personal.
const syncUser = ({ user, token }) => {
  const uuid = user ? user.uuid || uuidFromToken(token) : null;
  Sentry.setUser(uuid ? { id: uuid } : null);
};

// Call once, before the app registers, so errors thrown while the first
// screen renders are caught. An empty SENTRY_DSN (a fresh clone, CI) leaves
// Sentry off.
export const initSentry = () => {
  Sentry.init({
    dsn: SENTRY_DSN || undefined,
    enabled: Boolean(SENTRY_DSN),
    environment: __DEV__ ? 'development' : 'production',
    // release and dist are left to the SDK: it reads them from the native
    // build, the same values sentry-xcode.sh uploads source maps under.
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    tracePropagationTargets: [backendHost],
    integrations: [navigationIntegration],
    enableNativeFramesTracking: true,
  });

  // One subscription covers loadUser, signIn, updateUser and signOut.
  syncUser(useAuthStore.getState());
  useAuthStore.subscribe((state, prev) => {
    if (state.user !== prev.user || state.token !== prev.token) {
      syncUser(state);
    }
  });
};
