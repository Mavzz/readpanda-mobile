// Covers never go blank, and placeholder titles aren't nested in the gradient
// (specs/offline-first R8, R10).
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import BookCoverGradient from '../BookCoverGradient';
import useConnectivityStore from '../../stores/connectivityStore';

beforeEach(() => useConnectivityStore.setState({ online: true }));

const cover = (props = {}) => (
  <BookCoverGradient coverUrl="https://cdn/dracula.jpg" title="Dracula" width={120} height={180} {...props} />
);

it('shows the placeholder title when the image fails to load (R8.1)', async () => {
  await render(cover());
  expect(screen.queryByText('Dracula')).toBeNull();
  await act(async () => fireEvent(screen.getByTestId('cover-image'), 'error'));
  expect(screen.getByText('Dracula')).toBeTruthy();
});

it('uses any cached image while offline (R8.2)', async () => {
  useConnectivityStore.setState({ online: false });
  await render(cover());
  expect(screen.getByTestId('cover-image').props.source).toEqual({ uri: 'https://cdn/dracula.jpg', cache: 'force-cache' });
});

it('keeps the placeholder title out of the gradient, and capped for Larger Text (R10)', async () => {
  await render(cover({ coverUrl: null }));
  const title = screen.getByText('Dracula');
  expect(title.props.maxFontSizeMultiplier).toBe(1.3);
  expect(title.props.numberOfLines).toBe(3);
  // jest.setup renders LinearGradient as a View with its props; it gets none.
  expect(screen.getByTestId('cover-gradient').props.children).toBeUndefined();
});
