import { create } from 'zustand';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import log from '../utils/logger';
import { getBackendUrl } from '../utils/Helper';

// Whether the app can reach the internet, for everything that has to behave
// differently offline: the API client failing fast, the Offline pill, the
// outbox and the Wi-Fi prefetch (specs/offline-first R1).
//
// Offline means no network at all. NetInfo's own "internet reachable" check
// (a request to Google) is switched off: it was slow to recover after a
// reconnect, and on a network that blocks Google it would never pass, which
// left the app refusing every request. A network that's up but goes nowhere
// (a captive portal) is caught by the API client's 15s timeout instead.
//
// Online until NetInfo says otherwise, so nothing made at launch is refused
// before its first answer.
const useConnectivityStore = create(() => ({
  online: true,
  wifi: false,
  // Cellular, as far as NetInfo can tell. iOS gives it no Low Data Mode
  // signal, so the prefetch also asks the system itself (RNPdfViewer).
  expensive: false,
}));

const toState = (net) => ({
  online: net.isConnected !== false,
  wifi: net.type === 'wifi' || net.type === 'ethernet',
  expensive: !!net.details?.isConnectionExpensive,
});

const apply = (net) => {
  const next = toState(net);
  const { online } = useConnectivityStore.getState();
  if (next.online !== online) {
    log.info(next.online ? 'Back online' : 'Offline', { type: net.type });
  }
  useConnectivityStore.setState(next);
};

// NetInfo can be wrong about being offline: it misses reconnects, and on the
// Simulator it can go on saying "not connected" even when asked again. A
// reading stuck on offline would refuse every request, so two things can
// clear it:
//
// - A recheck, now and then: the API client asks each time it refuses a
//   request, and the app on coming to the foreground (at most every few
//   seconds). It only ever clears "offline"; a stale answer mustn't put the
//   app back offline. Going offline is NetInfo's change event's job.
// - Any answer from the server (confirmOnline). While offline the API client
//   lets one read through every few seconds as a probe (takeProbe); if it gets
//   an answer, the app was online after all.
const RECHECK_GAP = 3000;
const PROBE_GAP = 5000;
let lastRecheck = 0;
let lastProbe = 0;

export const recheckConnectivity = () => {
  if (Date.now() - lastRecheck < RECHECK_GAP) {
    return;
  }
  lastRecheck = Date.now();
  NetInfo.refresh()
    .then((net) => {
      if (toState(net).online) {
        apply(net);
      }
    })
    .catch((error) => log.warn('Could not recheck the connection:', error));
};

// Requests that got no answer since the last one that did.
const NO_ANSWER_LIMIT = 2;
let unanswered = 0;

// The server answered, so the app is online whatever NetInfo says.
export const confirmOnline = () => {
  unanswered = 0;
  if (!useConnectivityStore.getState().online) {
    log.info('Back online: a request got an answer');
    useConnectivityStore.setState({ online: true });
  }
};

// A request got no answer at all: it timed out or couldn't connect. NetInfo
// only knows the network is up, not that it goes anywhere (a dead Wi-Fi, a
// captive portal, 100% packet loss), so two of these in a row count as
// offline (R1.6). The pill shows, writes wait in the outbox, reads stop
// waiting 15s each, and the probe brings it back once something answers.
export const reportNoAnswer = () => {
  unanswered += 1;
  if (unanswered >= NO_ANSWER_LIMIT && useConnectivityStore.getState().online) {
    log.info('Offline: requests are getting no answer');
    useConnectivityStore.setState({ online: false });
  }
};

// Whether a request made while "offline" may go out anyway, to find out.
export const takeProbe = () => {
  if (Date.now() - lastProbe < PROBE_GAP) {
    return false;
  }
  lastProbe = Date.now();
  return true;
};

// While offline, nothing may be asking the server anything (a reader just
// looking at the screen), so the app asks itself: every 10s, a tiny request to
// the API. Any reply at all, a 404 included, means it's reachable again.
const HEARTBEAT_GAP = 10000;
const HEARTBEAT_TIMEOUT = 5000;
let heartbeat = null;

/* global AbortController */ // provided by React Native, missing from eslint's env
const ping = () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT);
  fetch(getBackendUrl('/ping'), { method: 'GET', signal: controller.signal })
    .then(() => confirmOnline())
    .catch(() => {})
    .finally(() => clearTimeout(timer));
};

const followHeartbeat = ({ online }) => {
  if (!online && !heartbeat) {
    heartbeat = setInterval(ping, HEARTBEAT_GAP);
  } else if (online && heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
};

let unsubscribe = null;

// Once, at launch (index.js), before any request is made. The listener fires
// straight away with the current state and on every change after.
export const startConnectivity = () => {
  if (unsubscribe) {
    return;
  }
  NetInfo.configure({ reachabilityShouldRun: () => false });
  const stopNetInfo = NetInfo.addEventListener(apply);
  const appState = AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      recheckConnectivity();
    }
  });
  const stopHeartbeat = useConnectivityStore.subscribe(followHeartbeat);
  unsubscribe = () => {
    stopNetInfo();
    appState.remove();
    stopHeartbeat();
    followHeartbeat({ online: true });
  };
};

// For code outside React (apiService, the outbox) that needs the answer now.
export const isOnline = () => useConnectivityStore.getState().online;

// For tests.
export const resetRecheck = () => {
  lastRecheck = 0;
  lastProbe = 0;
  unanswered = 0;
};

export default useConnectivityStore;
