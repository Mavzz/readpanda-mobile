import { Linking, NativeModules, Platform } from 'react-native';
import { showToast } from '../components/Toaster';

// The public site (readpanda repo, site/). App Store Connect points at the
// same pages, so change both together if the address moves.
export const SITE_URL = 'https://readpanda.vercel.app';

// On iOS the page opens in an in-app Safari view (ios/SafariView.swift), so
// the reader isn't sent out of the app and Done brings them back to the same
// screen. Anywhere without the module, the browser does.
const openPage = (url) => {
  const { SafariView } = NativeModules;
  return Platform.OS === 'ios' && SafariView ? SafariView.open(url) : Linking.openURL(url);
};

// page: 'terms' | 'privacy'
export const openLegalPage = (page) =>
  openPage(`${SITE_URL}/${page}`).catch(() =>
    showToast(`Couldn't open the page. It's at ${SITE_URL.replace('https://', '')}/${page}.`, 'error'),
  );
