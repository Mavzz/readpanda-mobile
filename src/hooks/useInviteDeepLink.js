import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { showToast } from '../components/Toaster';
import useRoomStore from '../stores/roomStore';
import log from '../utils/logger';

// The QR on Room Detail encodes readpanda://join/{CODE}. Joining is an API
// call, not just a screen, so the link is handled here rather than through
// React Navigation's linking config.
export const INVITE_LINK_RE = /^readpanda:\/\/join\/([A-Za-z0-9]{4,12})\/?$/;

export const parseInviteCode = (url) => {
  if (!url) {
    return null;
  }
  const match = INVITE_LINK_RE.exec(url.trim());
  return match ? match[1].toUpperCase() : null;
};

const useInviteDeepLink = ({ isAuthenticated, navigationRef }) => {
  const joinRoomByCode = useRoomStore((s) => s.joinRoomByCode);
  // A link that arrives before sign-in is held until the user is authenticated.
  const pendingCode = useRef(null);
  const handling = useRef(false);

  useEffect(() => {
    const handleCode = async (code) => {
      if (!code || handling.current) {
        return;
      }

      if (!isAuthenticated) {
        pendingCode.current = code;
        showToast('Sign in to join that room', 'info');
        return;
      }

      handling.current = true;
      log.info('Handling invite deep link for code:', code);
      const { status, response, error } = await joinRoomByCode(code);
      handling.current = false;

      if (status === 200) {
        showToast(`Joined ${response.name}`, 'success');
        // RoomLobbyScreen lives inside the authenticated "Main" navigator, so
        // the root ref has to address it through that.
        navigationRef.current?.navigate('Main', {
          screen: 'RoomLobbyScreen',
          params: { room: response },
        });
      } else if (status === 409) {
        // Already a member — the intent still reads as "open that room".
        showToast(error, 'info');
      } else {
        showToast(error || 'Could not join that room', 'error');
      }
    };

    const handleUrl = (url) => handleCode(parseInviteCode(url));

    // Cold start: the app was opened by the link.
    Linking.getInitialURL()
      .then(handleUrl)
      .catch((e) => log.error('Failed to read initial URL:', e));

    // Warm: the app was already running.
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    // A link that arrived before sign-in runs as soon as we're authenticated.
    if (isAuthenticated && pendingCode.current) {
      const code = pendingCode.current;
      pendingCode.current = null;
      handleCode(code);
    }

    return () => subscription.remove();
  }, [isAuthenticated, joinRoomByCode, navigationRef]);
};

export default useInviteDeepLink;
