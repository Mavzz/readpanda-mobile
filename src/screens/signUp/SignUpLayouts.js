import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import TermsLine from './TermsLine';

const LogInLink = ({ label, onLogIn, style }) => (
  <View style={[styles.logInRow, style]}>
    <Text style={styles.logInLabel}>{label}{' '}</Text>
    <Pressable onPress={onLogIn} hitSlop={10} accessibilityRole="button">
      <Text style={styles.logInLink}>Log in</Text>
    </Pressable>
  </View>
);

const Heading = ({ line, large }) => (
  <View style={styles.heading}>
    <Text style={[styles.title, large && styles.titleLarge]}>Create your account</Text>
    <Text style={styles.line}>{line}</Text>
  </View>
);

// The keyboard moves the scroll content up so the focused field and Create
// account stay visible (R5.1); a hardware keyboard has no frame, so nothing
// moves.
const Scroll = ({ style, contentStyle, children }) => (
  <ScrollView
    style={style}
    contentContainerStyle={contentStyle}
    keyboardShouldPersistTaps="handled"
    automaticallyAdjustKeyboardInsets
    showsVerticalScrollIndicator={false}
  >
    {children}
  </ScrollView>
);

// 17a / 17b, and any window under 700pt: one column, Log in at the bottom
// within thumb reach.
export const SignUpPhone = ({ oneTap, form, onLogIn }) => (
  <Scroll contentStyle={styles.phone}>
    <Text style={styles.brand}>ReadPanda</Text>
    <Heading line="Read with friends, one chapter at a time." />
    {oneTap}
    {form}
    <View style={styles.spacer} />
    <View style={styles.footer}>
      <LogInLink label="Already have an account?" onLogIn={onLogIn} />
      <TermsLine />
    </View>
  </Scroll>
);

// 17d, 700–999pt: the phone form on a 480pt tonal card, centred; Log in moves
// to the top bar since the bottom of an iPad is out of reach.
export const SignUpCard = ({ oneTap, form, onLogIn, pad }) => (
  <View style={styles.fill}>
    <View style={[styles.topBar, { paddingHorizontal: pad }]}>
      <Text style={styles.brandLarge}>ReadPanda</Text>
      <LogInLink label="Have an account?" onLogIn={onLogIn} />
    </View>
    <Scroll contentStyle={[styles.cardScroll, { paddingHorizontal: pad }]}>
      <View style={styles.card}>
        <Heading large line="Read with friends, one chapter at a time." />
        {oneTap}
        {form}
        <TermsLine />
      </View>
    </Scroll>
  </View>
);

// Only features the app has today (17c). The first line is rewritten from
// 17c's "Each chapter has a due date", since room schedules are on hold (R6.4).
const FEATURES = [
  {
    icon: 'people-outline',
    title: 'Rooms with a shared pace',
    body: 'Rooms read the same book. Everyone keeps their own pace, and you can see where they are.',
  },
  {
    icon: 'chatbubble-outline',
    title: 'Comments on the page',
    body: 'Comments past your page stay blurred until you get there.',
  },
  {
    icon: 'flame-outline',
    title: 'A streak that keeps you going',
    body: 'A few pages a night is enough to keep it.',
  },
];

// 17c, ≥ 1000pt (a 13" in portrait included): what the app is on the left,
// the form on the right. Only the right column scrolls, so the on-screen
// keyboard never moves the panel (R5.2).
export const SignUpSplit = ({ oneTap, form, onLogIn }) => (
  <View style={styles.split}>
    <View style={styles.panel}>
      <Text style={styles.brandLarge}>ReadPanda</Text>
      <View style={styles.spacer} />
      <Text style={styles.panelTitle}>Read together, a chapter at a time.</Text>
      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Icon name={f.icon} size={18} color={DS.colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
    <View style={styles.formSide}>
      <LogInLink label="Already have an account?" onLogIn={onLogIn} style={styles.logInTopRight} />
      <Scroll style={styles.fill} contentStyle={styles.formScroll}>
        <View style={styles.formColumn}>
          <Heading large line="It takes about 30 seconds." />
          {oneTap}
          {form}
          <TermsLine />
        </View>
      </Scroll>
    </View>
  </View>
);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  spacer: {
    flex: 1,
    minHeight: 12,
  },
  brand: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
    letterSpacing: -0.2,
  },
  brandLarge: {
    fontSize: 17,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
    letterSpacing: -0.2,
  },
  heading: {
    gap: 6,
  },
  title: {
    fontSize: 30,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  titleLarge: {
    fontSize: 32,
    letterSpacing: -0.7,
    lineHeight: 37,
  },
  line: {
    fontSize: 15,
    fontFamily: DS.font.medium,
    color: DS.colors.body,
    lineHeight: 22,
  },
  logInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInLabel: {
    fontSize: 15,
    fontFamily: DS.font.regular,
    color: DS.colors.onSurfaceVariant,
  },
  logInLink: {
    fontSize: 15,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },

  // Phone
  phone: {
    flexGrow: 1,
    gap: 22,
    paddingHorizontal: DS.space.gutter,
    paddingTop: 24,
    paddingBottom: 24,
  },
  footer: {
    gap: 12,
    alignItems: 'center',
  },

  // Card (17d)
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
  },
  cardScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 22,
    padding: 40,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.surfaceContainer,
  },

  // Split (17c)
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  panel: {
    flex: 5,
    gap: 40,
    paddingTop: 76,
    paddingHorizontal: 52,
    paddingBottom: 64,
    backgroundColor: DS.colors.surfaceContainerLowest,
  },
  panelTitle: {
    fontSize: 44,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -1.2,
    lineHeight: 48,
  },
  features: {
    gap: 22,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  featureBody: {
    fontSize: 14,
    fontFamily: DS.font.medium,
    color: DS.colors.body,
    lineHeight: 20,
  },
  formSide: {
    flex: 7,
    paddingTop: 76,
    paddingHorizontal: 56,
  },
  logInTopRight: {
    justifyContent: 'flex-end',
  },
  formScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  formColumn: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: 22,
  },
});
