// Where the Terms and Privacy links go, and what happens if the page won't open.

jest.mock('../../components/Toaster', () => ({ showToast: jest.fn() }));

import { Linking, NativeModules } from 'react-native';
import { showToast } from '../../components/Toaster';
import { SITE_URL, openLegalPage } from '../legalLinks';

beforeEach(() => {
  jest.clearAllMocks();
  NativeModules.SafariView = { open: jest.fn().mockResolvedValue(null) };
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

afterAll(() => {
  delete NativeModules.SafariView;
});

it('shows the terms page in the in-app Safari view', async () => {
  await openLegalPage('terms');
  expect(NativeModules.SafariView.open).toHaveBeenCalledWith('https://readpanda.vercel.app/terms');
  expect(Linking.openURL).not.toHaveBeenCalled();
  expect(showToast).not.toHaveBeenCalled();
});

it('shows the privacy page in the in-app Safari view', async () => {
  await openLegalPage('privacy');
  expect(NativeModules.SafariView.open).toHaveBeenCalledWith(`${SITE_URL}/privacy`);
});

it('falls back to the browser without the native module', async () => {
  delete NativeModules.SafariView;
  await openLegalPage('terms');
  expect(Linking.openURL).toHaveBeenCalledWith(`${SITE_URL}/terms`);
});

it('gives the address in a toast when the page can\'t be opened', async () => {
  NativeModules.SafariView.open.mockRejectedValue(new Error('no_presenter'));
  await openLegalPage('privacy');
  expect(showToast).toHaveBeenCalledWith(
    'Couldn\'t open the page. It\'s at readpanda.vercel.app/privacy.',
    'error',
  );
});

it('gives the address in a toast when the browser fallback fails', async () => {
  delete NativeModules.SafariView;
  Linking.openURL.mockRejectedValue(new Error('no handler'));
  await openLegalPage('terms');
  expect(showToast).toHaveBeenCalledWith(
    'Couldn\'t open the page. It\'s at readpanda.vercel.app/terms.',
    'error',
  );
});
