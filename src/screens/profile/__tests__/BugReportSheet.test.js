// The bug report sheet against the real sentry.js, with Sentry, the photo
// picker and the auth store replaced (bug-reporting spec).
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@env', () => ({ SENTRY_DSN: 'https://key@o0.ingest.sentry.io/0' }), { virtual: true });
jest.mock('../../../stores/authStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: null, token: null }), subscribe: jest.fn() },
}));
// It animates with Reanimated, which has no native side under Jest.
jest.mock('../../../components/PressableScale', () => {
  const { Pressable } = require('react-native');
  return { __esModule: true, default: Pressable };
});

import * as Sentry from '@sentry/react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { BugReportSheet } from '../SettingsSheets';

const renderSheet = async (props = {}) => {
  const onSent = jest.fn();
  const onClose = jest.fn();
  const view = await render(<BugReportSheet visible onSent={onSent} onClose={onClose} {...props} />);
  return { onSent, onClose, view };
};

const typeReport = (text) => fireEvent.changeText(screen.getByLabelText('Describe the bug'), text);
const typeEmail = (text) => fireEvent.changeText(screen.getByLabelText('Email, optional'), text);
const sendButton = () => screen.getByRole('button', { name: 'Send' });

// The picker answers with what a real pick (or cancel) would.
const pickerReturns = (response) => {
  launchImageLibrary.mockImplementation((options, callback) => callback(response));
};
const screenshot = { uri: 'file:///shot.png', type: 'image/png', base64: 'AAEC' };

it('keeps Send disabled until the description has text (R2.2)', async () => {
  await renderSheet();
  expect(sendButton()).toBeDisabled();

  await typeReport('   ');
  expect(sendButton()).toBeDisabled();

  await typeReport('The comment sheet hides my text');
  expect(sendButton()).toBeEnabled();
});

it('caps the description at 2,000 characters (R2.3)', async () => {
  await renderSheet();
  expect(screen.getByLabelText('Describe the bug').props.maxLength).toBe(2000);
});

it('sends the trimmed description with no email and calls onSent (R4.1, R6.3)', async () => {
  const { onSent } = await renderSheet();
  await typeReport('  Page 12 is blank  ');
  await fireEvent.press(sendButton());

  expect(Sentry.captureFeedback).toHaveBeenCalledWith({
    message: 'Page 12 is blank',
    email: undefined,
    associatedEventId: undefined,
  });
  expect(onSent).toHaveBeenCalled();
});

it('disables Send for an invalid email and says why (R6.4)', async () => {
  await renderSheet();
  await typeReport('Page 12 is blank');
  await typeEmail('reader@');

  expect(sendButton()).toBeDisabled();
  expect(screen.getByText('Enter a full email address, or leave this empty.')).toBeOnTheScreen();

  await typeEmail(' reader@example.com ');
  expect(sendButton()).toBeEnabled();
  await fireEvent.press(sendButton());
  expect(Sentry.captureFeedback).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'reader@example.com' }),
  );
});

it('starts empty each time it opens (R6.2)', async () => {
  const { view, onSent, onClose } = await renderSheet();
  await typeReport('Something broke');
  await typeEmail('reader@example.com');

  await view.rerender(<BugReportSheet visible={false} onSent={onSent} onClose={onClose} />);
  await view.rerender(<BugReportSheet visible onSent={onSent} onClose={onClose} />);

  expect(screen.getByLabelText('Describe the bug').props.value).toBe('');
  expect(screen.getByLabelText('Email, optional').props.value).toBe('');
});

it('closes straight away when nothing was typed', async () => {
  const { onClose } = await renderSheet();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(onClose).toHaveBeenCalled();
});

it('asks before throwing away a typed report (R2.6)', async () => {
  const { onClose } = await renderSheet();
  await typeReport('Something broke');
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByText('Discard this report?')).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));
  expect(screen.getByLabelText('Describe the bug').props.value).toBe('Something broke');

  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
  expect(onClose).toHaveBeenCalled();
});

it('attaches a picked screenshot and sends it (R3.2, R4.1)', async () => {
  pickerReturns({ assets: [screenshot] });
  await renderSheet();
  await typeReport('Look at this');

  await fireEvent.press(screen.getByRole('button', { name: 'Attach a screenshot' }));
  expect(launchImageLibrary).toHaveBeenCalledWith(
    expect.objectContaining({ maxWidth: 1600, maxHeight: 1600, includeBase64: true }),
    expect.any(Function),
  );
  expect(screen.getByText('Screenshot attached')).toBeOnTheScreen();

  await fireEvent.press(sendButton());
  const [, hint] = Sentry.captureFeedback.mock.calls[0];
  expect(hint.attachments).toHaveLength(1);
  expect(hint.attachments[0]).toMatchObject({ filename: 'screenshot.png', contentType: 'image/png' });
  expect(Array.from(hint.attachments[0].data)).toEqual([0, 1, 2]);
});

it('removes the screenshot', async () => {
  pickerReturns({ assets: [screenshot] });
  await renderSheet();
  await fireEvent.press(screen.getByRole('button', { name: 'Attach a screenshot' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Remove screenshot' }));

  expect(screen.queryByText('Screenshot attached')).toBeNull();
  expect(screen.getByRole('button', { name: 'Attach a screenshot' })).toBeOnTheScreen();
});

it('keeps the text and attaches nothing when the pick is cancelled or fails (R3.3)', async () => {
  await renderSheet();
  await typeReport('Something broke');

  pickerReturns({ didCancel: true });
  await fireEvent.press(screen.getByRole('button', { name: 'Attach a screenshot' }));
  pickerReturns({ errorCode: 'permission', errorMessage: 'Photo access denied' });
  await fireEvent.press(screen.getByRole('button', { name: 'Attach a screenshot' }));

  expect(screen.queryByText('Screenshot attached')).toBeNull();
  expect(screen.getByLabelText('Describe the bug').props.value).toBe('Something broke');
});

it('stays open with the text intact when sending throws (R4.6)', async () => {
  Sentry.captureFeedback.mockImplementationOnce(() => {
    throw new Error('boom');
  });
  const { onSent } = await renderSheet();
  await typeReport('Something broke');
  await fireEvent.press(sendButton());

  expect(onSent).not.toHaveBeenCalled();
  expect(screen.getByText('Couldn’t send your report. Try again.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Describe the bug').props.value).toBe('Something broke');
  expect(sendButton()).toBeEnabled();
});
