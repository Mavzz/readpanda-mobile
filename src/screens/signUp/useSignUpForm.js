import { useCallback, useRef, useState } from 'react';
import { checkUsername, emailSignUp } from '../../services/auth';

// The sign-up rules (signup spec R3), the same ones api-go enforces.
const USERNAME = /^[a-z0-9._]{3,20}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const MIN_PASSWORD = 8;

const usernameProblem = (name) => {
  if (!name) {
    return null;
  }
  if (name.length < 3) {
    return 'At least 3 characters.';
  }
  if (name.length > 20) {
    return 'At most 20 characters.';
  }
  if (!USERNAME.test(name)) {
    return 'Letters, numbers, dots and underscores only.';
  }
  return null;
};

// Everything the sign-up form knows (17a/17b): the three fields, an error per
// field, the availability check when you leave Username, and submitting. No
// Alerts: every problem is a message under its field, or one form-level
// line for anything else (R4.2). State lives here, not in a layout, so
// rotating or crossing a layout width keeps what's typed.
const useSignUpForm = ({ onSignedUp }) => {
  const [values, setValues] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  // A taken name's suggestion, shown as "Try @…" and tappable.
  const [suggestion, setSuggestion] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const checked = useRef({});
  // The latest values, for checks that finish after more typing.
  const latest = useRef(values);
  latest.current = values;

  const setField = useCallback((field, raw) => {
    const value = field === 'password' ? raw : raw.trim().toLowerCase();
    setValues((v) => ({ ...v, [field]: field === 'username' ? value.replace(/^@/, '') : value }));
    // Typing clears that field's error; it's re-checked on leaving it.
    setErrors((e) => ({ ...e, [field]: null }));
    setFormError(null);
    if (field === 'username') {
      setSuggestion(null);
    }
  }, []);

  const blurUsername = useCallback(async () => {
    const name = values.username;
    const problem = usernameProblem(name);
    if (problem || !name) {
      setErrors((e) => ({ ...e, username: problem }));
      return;
    }
    const result = checked.current[name] || await checkUsername(name);
    if (result.available !== null) {
      checked.current[name] = result;
    }
    // The name may have changed while the check was out.
    if (latest.current.username === name && result.available === false) {
      setErrors((e) => ({ ...e, username: result.error || `@${name} is taken.` }));
      setSuggestion(result.suggestion || null);
    }
  }, [values.username]);

  const blurEmail = useCallback(() => {
    const email = values.email;
    setErrors((e) => ({ ...e, email: email && !EMAIL.test(email) ? 'Enter a valid email address.' : null }));
  }, [values.email]);

  const applySuggestion = useCallback(() => {
    if (suggestion) {
      setValues((v) => ({ ...v, username: suggestion }));
      setErrors((e) => ({ ...e, username: null }));
      setSuggestion(null);
    }
  }, [suggestion]);

  const passwordShort = Math.max(0, MIN_PASSWORD - values.password.length);
  const emailValid = EMAIL.test(values.email);
  const valid = !usernameProblem(values.username)
    && !!values.username
    && !errors.username
    && emailValid
    && !errors.email
    && passwordShort === 0;

  const submit = useCallback(async () => {
    if (!valid || submitting) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const { status, response, error } = await emailSignUp(values.username, values.password, values.email);
    setSubmitting(false);
    if (status === 201 && response?.accessToken) {
      onSignedUp(response, values.email);
      return;
    }
    if (error?.field && ['username', 'email', 'password'].includes(error.field)) {
      setErrors((e) => ({ ...e, [error.field]: error.error }));
      return;
    }
    setFormError('Couldn\'t create your account. Try again.');
  }, [valid, submitting, values, onSignedUp]);

  return {
    values,
    errors,
    suggestion,
    formError,
    submitting,
    valid,
    emailValid,
    passwordShort,
    setField,
    blurUsername,
    blurEmail,
    applySuggestion,
    submit,
  };
};

export default useSignUpForm;
