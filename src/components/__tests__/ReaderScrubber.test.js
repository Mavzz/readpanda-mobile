import { render, screen } from '@testing-library/react-native';
import ReaderScrubber from '../ReaderScrubber';

describe('ReaderScrubber', () => {
  it('shows a 1-indexed page counter', async () => {
    await render(<ReaderScrubber currentPage={0} totalPages={120} />);
    expect(screen.getByText('1 / 120')).toBeTruthy();
  });

  it('says how many unlocked comments are waiting', async () => {
    await render(<ReaderScrubber currentPage={10} totalPages={120} waitingCount={3} />);
    expect(screen.getByText('3 waiting behind you')).toBeTruthy();
  });

  it('shows locked comments as a bare count, and nothing when there are none', async () => {
    const { rerender } = await render(<ReaderScrubber currentPage={10} totalPages={120} lockedCount={2} />);
    expect(screen.getByText('2 later in the book')).toBeTruthy();

    await rerender(<ReaderScrubber currentPage={10} totalPages={120} lockedCount={0} waitingCount={0} />);
    expect(screen.queryByText(/later in the book/)).toBeNull();
    expect(screen.queryByText(/waiting behind you/)).toBeNull();
  });

  it('merges comment ticks that would overlap', async () => {
    // Pages 10 and 11 of 100 are 1% apart — one mark; page 50 is its own.
    const { toJSON } = await render(<ReaderScrubber currentPage={0} totalPages={100} commentPages={[10, 11, 50, 50]} />);
    const ticks = JSON.stringify(toJSON()).match(/"left":"[\d.]+%"/g);
    expect(ticks).toEqual(['"left":"10%"', '"left":"50%"']);
  });
});
