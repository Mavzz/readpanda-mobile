// Help & support: the questions, the email, and the bug report row
// (help-support spec).
import { Clipboard, Linking, Platform } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

let mockPlusOn = false;
let mockSentryOn = true;

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));
jest.mock('../../../services/purchasesService', () => ({
  get isPlusEnabled() { return mockPlusOn; },
}));
jest.mock('../../../utils/sentry', () => ({
  get isSentryEnabled() { return mockSentryOn; },
}));
jest.mock('../../../utils/screenTracking', () => ({ useScreenTracking: jest.fn() }));
jest.mock('../../../components/Toaster', () => ({ showToast: jest.fn() }));
// It animates with Reanimated, which has no native side under Jest.
jest.mock('../../../components/PressableScale', () => {
  const { Pressable: P } = require('react-native');
  return { __esModule: true, default: P };
});
// The sheet has its own tests; here it only has to open and report back.
jest.mock('../SettingsSheets', () => {
  const { Pressable: P, Text: T } = require('react-native');
  return {
    BugReportSheet: ({ visible, onSent }) => (visible ? (
      <P onPress={onSent} accessibilityRole="button"><T>Send report</T></P>
    ) : null),
  };
});

import { showToast } from '../../../components/Toaster';
import { FREE_LIMITS } from '../../../hooks/usePlusGate';
import packageJson from '../../../../package.json';
import { SUPPORT_EMAIL, emailSupport, supportEmailBody, supportEmailUrl } from '../../../utils/support';
import { helpTopics } from '../helpTopics';
import HelpScreen from '../HelpScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockPlusOn = false;
  mockSentryOn = true;
});

const question = (text) => screen.getByRole('button', { name: new RegExp(text) });

describe('the questions', () => {
  it('leaves out ReadPanda+ and its limits while it is off (R2.5)', () => {
    const topics = helpTopics(false);
    const ids = topics.map((t) => t.id);
    ['plus', 'restore', 'cancel'].forEach((id) => expect(ids).not.toContain(id));
    topics.forEach(({ question: q, answer }) => {
      expect(`${q} ${answer}`).not.toMatch(/ReadPanda\+|Free accounts|free accounts/);
    });
  });

  it('adds ReadPanda+ and the limits from FREE_LIMITS while it is on (R2.7)', () => {
    const topics = helpTopics(true);
    expect(topics.map((t) => t.id)).toEqual(expect.arrayContaining(['plus', 'restore', 'cancel']));
    const start = topics.find((t) => t.id === 'start');
    expect(start.answer).toContain(`Free accounts host ${FREE_LIMITS.hostedRooms} room`);
    const plus = topics.find((t) => t.id === 'plus');
    expect(plus.answer).toContain(`keep ${FREE_LIMITS.customBuckets} buckets`);
  });

  it('opens and closes an answer, and keeps several open (R2.2, R2.3)', async () => {
    await render(<HelpScreen />);
    const join = 'How do I join a room';
    const progress = 'Who can see how far';
    expect(screen.queryByText(/enter the room's invite code/)).toBeNull();

    await fireEvent.press(question(join));
    await fireEvent.press(question(progress));
    expect(screen.getByText(/enter the room's invite code/)).toBeTruthy();
    expect(screen.getByText(/the point of reading together/)).toBeTruthy();
    expect(question(join).props.accessibilityState).toEqual({ expanded: true });

    await fireEvent.press(question(join));
    expect(screen.queryByText(/enter the room's invite code/)).toBeNull();
    expect(screen.getByText(/the point of reading together/)).toBeTruthy();
    expect(question(join).props.accessibilityState).toEqual({ expanded: false });
  });
});

describe('email us', () => {
  it('addresses the email with the subject and only the versions (R3.2, R3.3)', () => {
    const url = supportEmailUrl();
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?subject=ReadPanda%20help&body=`)).toBe(true);
    const body = supportEmailBody();
    expect(decodeURIComponent(url.split('&body=')[1])).toBe(body);
    expect(body).toBe(`\n\n—\nReadPanda ${packageJson.version}\niOS ${Platform.Version}`);
  });

  it('opens the mail app from the row', async () => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<HelpScreen />);
    await fireEvent.press(screen.getByRole('button', { name: `Email us, ${SUPPORT_EMAIL}` }));
    expect(Linking.openURL).toHaveBeenCalledWith(supportEmailUrl());
    expect(showToast).not.toHaveBeenCalled();
  });

  it('copies the address when no mail app opens (R3.4)', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no mail'));
    const copy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});
    await emailSupport();
    expect(copy).toHaveBeenCalledWith(SUPPORT_EMAIL);
    expect(showToast).toHaveBeenCalledWith('Email address copied — paste it into your mail app', 'info');
  });
});

describe('report a bug', () => {
  it('opens the sheet and thanks the reader when it is sent (R4.1, R4.3)', async () => {
    await render(<HelpScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Report a bug' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Send report' }));
    expect(showToast).toHaveBeenCalledWith('Thanks — your report was sent', 'success');
    expect(screen.queryByText('Send report')).toBeNull();
  });

  it('has no row while Sentry is off (R4.2)', async () => {
    mockSentryOn = false;
    await render(<HelpScreen />);
    expect(screen.queryByRole('button', { name: 'Report a bug' })).toBeNull();
    expect(screen.getByRole('button', { name: `Email us, ${SUPPORT_EMAIL}` })).toBeTruthy();
  });
});
