// What every sign-in (and token refresh) now says about the account beside
// its tokens (specs/coming-soon R5.8): its permanent id, the name shown on
// Profile, and how it signs in. Absent from an older server's response, so
// each falls back to null.
export const accountFrom = (response = {}) => ({
  userId: response.user_id || null,
  displayName: response.display_name ?? null,
  loginType: response.login_type || null,
});

// Email and password belong to the account only when it signs in with them;
// Apple and Google own theirs (R5.7).
export const signsInWithPassword = (user) => user?.loginType === 'email';
