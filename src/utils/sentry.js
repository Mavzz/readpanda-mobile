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

export const isSentryEnabled = Boolean(SENTRY_DSN);

// A bug report sent soon after an error is most likely about that error, so
// it gets linked to it. Memory only: after a relaunch nothing is linked.
const LINK_WINDOW_MS = 5 * 60 * 1000;
let lastError = null;

const trackLastError = (event) => {
  // Error events have no type; transactions and feedback do.
  if (!event.type) {
    lastError = { id: event.event_id, at: Date.now() };
  }
  return event;
};

export const recentEventId = () =>
  lastError && Date.now() - lastError.at < LINK_WINDOW_MS ? lastError.id : undefined;

const base64ToBytes = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// image is the picker's asset ({ base64, type }), or null. The email goes only
// into the report's contact email, never onto the Sentry user, so it stays
// off the reader's other events. Offline, the SDK keeps the report and sends
// it later, so returning means it was handed over, not delivered.
export const sendBugReport = ({ message, email, image }) => {
  const feedback = { message, email: email || undefined, associatedEventId: recentEventId() };
  if (!image) {
    return Sentry.captureFeedback(feedback);
  }
  const contentType = image.type || 'image/jpeg';
  const attachment = {
    filename: `screenshot.${contentType === 'image/png' ? 'png' : 'jpg'}`,
    data: base64ToBytes(image.base64),
    contentType,
  };
  return Sentry.captureFeedback(feedback, { attachments: [attachment] });
};

// Call once, before the app registers, so errors thrown while the first
// screen renders are caught. An empty SENTRY_DSN (a fresh clone, CI) leaves
// Sentry off.
export const initSentry = () => {
  Sentry.init({
    dsn: SENTRY_DSN || undefined,
    enabled: isSentryEnabled,
    environment: __DEV__ ? 'development' : 'production',
    // release and dist are left to the SDK: it reads them from the native
    // build, the same values sentry-xcode.sh uploads source maps under.
    sendDefaultPii: false,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    tracePropagationTargets: [backendHost],
    integrations: [navigationIntegration],
    enableNativeFramesTracking: true,
    beforeSend: trackLastError,
  });

  // One subscription covers loadUser, signIn, updateUser and signOut.
  syncUser(useAuthStore.getState());
  useAuthStore.subscribe((state, prev) => {
    if (state.user !== prev.user || state.token !== prev.token) {
      syncUser(state);
    }
  });
};
