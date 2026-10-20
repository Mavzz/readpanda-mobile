import { Clipboard, Linking, Platform } from 'react-native';
import { showToast } from '../components/Toaster';
import packageJson from '../../package.json';

// The same address is on the public site (readpanda repo, site/support.html)
// and in the terms; change them together.
export const SUPPORT_EMAIL = 'readpanda.support@gmail.com';

// Room to write above, then the versions we'd ask for anyway. Nothing about
// the account: the reader can see and forward this email, and we can ask in
// the reply.
export const supportEmailBody = () =>
  `\n\n—\nReadPanda ${packageJson.version}\niOS ${Platform.Version}`;

export const supportEmailUrl = () =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('ReadPanda help')}&body=${encodeURIComponent(supportEmailBody())}`;

// No canOpenURL check first: it needs LSApplicationQueriesSchemes and still
// can't tell whether a mail account is set up. A rejected open is the signal.
export const emailSupport = () =>
  Linking.openURL(supportEmailUrl()).catch(() => {
    Clipboard.setString(SUPPORT_EMAIL);
    showToast('Email address copied — paste it into your mail app', 'info');
  });
