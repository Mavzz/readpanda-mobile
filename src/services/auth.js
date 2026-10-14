import { Platform, NativeModules } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import apiService from './apiService';
import { postRequest } from './usePost';
import { makeAuthenticatedDeleteRequest } from './authenticatedRequests';
import { GoogleAuthService } from './GoogleAuthService';
import { getBackendUrl } from '../utils/Helper';
import log from '../utils/logger';


const { GoogleSignInModule } = NativeModules;

// Function to handle Google sign-up/login. Reports failure by returning no
// response; the calling screen says so in its own way (Login an alert, Sign
// up a toast), so this doesn't alert as well.

const googleSignUpLogin = async () => {
  let status;
  let response;
  // Attempt to sign in with Google

  if (Platform.OS === 'ios') {
    const result = await GoogleAuthService.signInWithGoogle();

    if (result) {

      const token = result.user.idToken;
      log.info('Google ID Token obtained');

      ({ status, response } = await postRequest(
        getBackendUrl('/auth/google'),
        {},
        { Authorization: `Bearer ${token}` },
        { skipAuthRetry: true },
      ));

    } else {
      log.warn('Google sign-in returned no result (cancelled or failed)');
    }
  } else {
    try {
      const token = await GoogleSignInModule.signIn();

      if (token) {
        ({ status, response } = await postRequest(
          getBackendUrl('/auth/google'),
          {},
          { Authorization: `Bearer ${token}` },
          { skipAuthRetry: true },
        ));

        log.info('Google sign-in response received');
      } else {
        log.warn('Google sign-in returned no token');
      }
    } catch (error) {
      log.error('Google Sign-In Error:', error);
    }

  }

  if (status === 200 || status === 201) {
    return { status, response };
  } else {

    log.error('Google Sign Up/Login failed with status:', status);
    return { status, response: null };

  }
};

const emailLogin = async (username, password) => {
  const { status, response } = await postRequest(
    getBackendUrl('/auth/login'),
    {
      username,
      password: password,
    },
    {},
    { skipAuthRetry: true },
  );

  if (status === 200) {
    log.info('Login successful with status:', status);
    return { status, response };
  } else {
    log.error('Login failed with status:', status);
    return { status, response: null };
  }
};

// apiService throws a 4xx as Error("Client error 409: {body}"). The body is
// what the sign-up form needs: { error, field } says which field to flag.
const clientErrorBody = (error) => {
  const match = /^Client error (\d+): ([\s\S]*)$/.exec(error?.message || '');
  if (!match) {
    return null;
  }
  try {
    return { status: Number(match[1]), ...JSON.parse(match[2]) };
  } catch {
    return { status: Number(match[1]), error: match[2] };
  }
};

// POST /signup. On a 400 or 409 `error` is the server's { status, error,
// field } so the form can put it under that field (signup spec R4.1); any
// other failure has no `field` and shows as the form's own error (R4.2).
const emailSignUp = async (username, password, email) => {
  log.info('Attempting Sign Up with username:', username, 'email:', email);
  try {
    const { status, response } = await postRequest(getBackendUrl('/signup'), {
      username,
      password: password,
      email,
    }, {}, { skipAuthRetry: true });
    if (status === 201) {
      log.info('Sign Up successful with status:', status);
      return { status, response };
    }
    log.error('Sign Up failed with status:', status);
    return { status, response: null, error: null };
  } catch (error) {
    const body = clientErrorBody(error);
    log.error('Sign Up failed:', body || error);
    return { status: body?.status ?? null, response: null, error: body };
  }
};

// GET /signup/available — on leaving the Username field (signup spec R3.2).
// { available, suggestion } on success; { available: null } when the check
// itself failed, which the form treats as "unknown" rather than blocking:
// the 409 on submit still catches a taken name.
const checkUsername = async (username) => {
  try {
    const { response } = await apiService.get(
      getBackendUrl(`/signup/available?username=${encodeURIComponent(username)}`),
      {},
      { skipAuthRetry: true },
    );
    return { available: !!response?.available, suggestion: response?.suggestion || null };
  } catch (error) {
    const body = clientErrorBody(error);
    if (body?.field) {
      return { available: false, error: body.error };
    }
    log.warn('Username check failed:', error);
    return { available: null };
  }
};

// Sign in with Apple (signup spec R1.2): Apple's sheet, then POST /auth/apple
// with the identity token, the one-time authorization code (the server keeps
// Apple's refresh token for revoking on account deletion) and the name, which
// Apple only sends the first time. { cancelled: true } when the reader closed
// the sheet — not an error, nothing to show.
const appleSignUpLogin = async () => {
  let credential;
  try {
    credential = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });
  } catch (error) {
    if (error?.code === appleAuth.Error.CANCELED) {
      return { cancelled: true };
    }
    log.error('Apple Sign-In Error:', error);
    return { status: null, response: null };
  }
  if (!credential?.identityToken) {
    log.error('Apple Sign-In returned no identity token');
    return { status: null, response: null };
  }
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ');
  try {
    const { status, response } = await postRequest(
      getBackendUrl('/auth/apple'),
      {
        identity_token: credential.identityToken,
        authorization_code: credential.authorizationCode || '',
        full_name: fullName,
      },
      {},
      { skipAuthRetry: true },
    );
    if (status === 200 || status === 201) {
      log.info('Apple sign-in response received');
      return { status, response };
    }
    return { status, response: null };
  } catch (error) {
    const body = clientErrorBody(error);
    log.error('Apple sign-in failed:', body || error);
    return { status: body?.status ?? null, response: null, error: body };
  }
};

const logout = async (username, refreshToken) => {
  const { status } = await postRequest(
    getBackendUrl(`/auth/logout?username=${username}`),
    {},
    { Authorization: `Bearer ${refreshToken}` },
    { skipAuthRetry: true },
  );
  log.info(`User logged out: ${username}`, status);
};

// Deletes the signed-in reader's account for good (account-deletion R4.1):
// rooms they made pass on, their comments stay as "Deleted reader". The
// server answers 204, also if the account was already gone, so a retry after
// a dropped connection is safe. { ok } only; the screen says what happened.
const deleteAccount = async () => {
  try {
    const { status } = await makeAuthenticatedDeleteRequest(getBackendUrl('/users/me'));
    log.info('Account deleted', status);
    return { ok: status === 204 };
  } catch (error) {
    log.error('Account deletion failed:', error);
    return { ok: false };
  }
};

export { googleSignUpLogin, appleSignUpLogin, emailLogin, emailSignUp, checkUsername, logout, deleteAccount };
