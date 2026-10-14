import { forwardRef, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import GradientPill from '../../components/GradientPill';
import PressableScale from '../../components/PressableScale';

// One labelled field (17a): the label above, because a placeholder vanishes
// while you type (R2.2). An amber ring while focused, a red one with an
// error, and the error itself underneath.
const Field = forwardRef(({ label, prefix, error, trailing, hint, footer, ...input }, ref) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={DS.colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          {...input}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          accessibilityLabel={label}
        />
        {trailing}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Icon name="alert-circle" size={14} color={DS.colors.error} />
          <Text style={styles.errorText}>{error}{footer}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

// The email form (17a/17b): Username, Email, Password and Create account.
// Return moves down the fields; Go on the last submits (R2.4). Create account
// stays inactive until everything checks out, and never opens an alert (R3.5).
// `form` is useSignUpForm's result.
const SignUpForm = ({ form }) => {
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const { values, errors, valid, submitting } = form;

  return (
    <View style={styles.form}>
      <Field
        label="Username"
        prefix="@"
        placeholder="yourname"
        value={values.username}
        onChangeText={(t) => form.setField('username', t)}
        onBlur={form.blurUsername}
        error={errors.username}
        footer={form.suggestion ? (
          <Text>
            {' Try '}
            <Text style={styles.suggestion} onPress={form.applySuggestion} accessibilityRole="button">
              @{form.suggestion}
            </Text>
          </Text>
        ) : null}
        textContentType="username"
        autoComplete="username-new"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
        maxLength={21}
      />
      <Field
        ref={emailRef}
        label="Email"
        placeholder="you@example.com"
        value={values.email}
        onChangeText={(t) => form.setField('email', t)}
        onBlur={form.blurEmail}
        error={errors.email}
        trailing={form.emailValid && !errors.email
          ? <Icon name="checkmark-circle" size={18} color={DS.colors.primaryContainer} accessibilityLabel="Valid email" />
          : null}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <Field
        ref={passwordRef}
        label="Password"
        placeholder="At least 8 characters"
        value={values.password}
        onChangeText={(t) => form.setField('password', t)}
        error={errors.password}
        hint={values.password && form.passwordShort > 0
          ? `${form.passwordShort} more character${form.passwordShort === 1 ? '' : 's'}`
          : null}
        trailing={(
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={DS.colors.onSurfaceVariant} />
          </Pressable>
        )}
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        autoComplete="new-password"
        passwordRules="minlength: 8;"
        returnKeyType="go"
        onSubmitEditing={form.submit}
      />

      {form.formError ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Icon name="alert-circle" size={14} color={DS.colors.error} />
          <Text style={styles.errorText}>{form.formError}</Text>
        </View>
      ) : null}

      {valid ? (
        <GradientPill onPress={form.submit} disabled={submitting} style={styles.cta}>
          {submitting
            ? <ActivityIndicator color={DS.colors.onPrimary} />
            : <Text style={styles.ctaText}>Create account</Text>}
        </GradientPill>
      ) : (
        <PressableScale
          disabled
          style={[styles.cta, styles.ctaInactive]}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
        >
          <Text style={styles.ctaTextInactive}>Create account</Text>
        </PressableScale>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  box: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 16,
    borderRadius: 16,
    // The ring's space is always there (in the field's own colour) so
    // focusing doesn't shift the text.
    borderWidth: 2,
    borderColor: DS.colors.surfaceContainerLowest,
    backgroundColor: DS.colors.surfaceContainerLowest,
  },
  boxFocused: {
    borderColor: DS.colors.primaryContainer,
  },
  boxError: {
    borderColor: DS.colors.error,
  },
  prefix: {
    fontSize: 16,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurface,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.error,
  },
  suggestion: {
    color: DS.colors.primary,
    textDecorationLine: 'underline',
  },
  hint: {
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.body,
  },
  cta: {
    height: 54,
    paddingVertical: 0,
    marginTop: 4,
  },
  ctaInactive: {
    borderRadius: DS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  ctaTextInactive: {
    fontSize: 16,
    fontFamily: DS.font.extraBold,
    color: DS.colors.body,
  },
});

export default SignUpForm;
