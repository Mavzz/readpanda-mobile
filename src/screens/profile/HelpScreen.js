import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { showToast } from '../../components/Toaster';
import PressableScale from '../../components/PressableScale';
import useLayout from '../../hooks/useLayout';
import { isPlusEnabled } from '../../services/purchasesService';
import { useScreenTracking } from '../../utils/screenTracking';
import { isSentryEnabled } from '../../utils/sentry';
import { SUPPORT_EMAIL, emailSupport } from '../../utils/support';
import { DS } from '../../styles/global';
import packageJson from '../../../package.json';
import profileStyles from './profileStyles';
import { SettingsGroup, SettingsRow } from './SettingsRow';
import { BugReportSheet } from './SettingsSheets';
import { helpTopics } from './helpTopics';

// A question that opens to its answer in place. Each keeps its own state, so
// two answers can be read side by side (R2.3).
const HelpQuestion = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((was) => !was)}
      style={({ pressed }) => [styles.question, pressed && styles.questionPressed]}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
    >
      <View style={styles.questionRow}>
        <Text style={styles.questionText}>{question}</Text>
        <Icon
          name={open ? 'chevron-down' : 'chevron-forward'}
          size={15}
          color={DS.colors.onSurfaceVariant}
        />
      </View>
      {open ? <Text style={styles.answer}>{answer}</Text> : null}
    </Pressable>
  );
};

// Behind Settings → Help & support: answers built into the app, so they work
// offline, then email and the bug report sheet for everything else.
const HelpScreen = () => {
  const { isLarge, pagePad } = useLayout();
  const navigation = useNavigation();
  const [bugReportOpen, setBugReportOpen] = useState(false);

  useScreenTracking('HelpScreen');

  return (
    <SafeAreaView style={profileStyles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <ScrollView
        contentContainerStyle={[profileStyles.content, isLarge && { paddingHorizontal: pagePad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <View style={styles.nav}>
            <PressableScale
              onPress={() => navigation.goBack()}
              style={profileStyles.circleButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
            </PressableScale>
            <Text style={styles.title}>Help & support</Text>
          </View>

          <SettingsGroup title="Common questions">
            {helpTopics(isPlusEnabled).map((topic) => (
              <HelpQuestion key={topic.id} question={topic.question} answer={topic.answer} />
            ))}
          </SettingsGroup>

          <SettingsGroup title="Get in touch">
            <SettingsRow icon="mail-outline" label="Email us" value={SUPPORT_EMAIL} onPress={emailSupport} />
            {/* Reports go to Sentry, so with no DSN there's nowhere to send one. */}
            {isSentryEnabled ? (
              <SettingsRow icon="bug-outline" label="Report a bug" onPress={() => setBugReportOpen(true)} />
            ) : null}
          </SettingsGroup>

          <Text style={styles.footer}>ReadPanda {packageJson.version}</Text>
        </View>
      </ScrollView>

      <BugReportSheet
        visible={bugReportOpen}
        onSent={() => {
          setBugReportOpen(false);
          showToast('Thanks — your report was sent', 'success');
        }}
        onClose={() => setBugReportOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: DS.layout.textMax,
    alignSelf: 'center',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.4,
  },
  question: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  questionPressed: {
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurface,
  },
  answer: {
    ...DS.type.body,
    marginTop: 8,
    marginRight: 27,
    color: DS.colors.body,
  },
  footer: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 24,
  },
});

export default HelpScreen;
