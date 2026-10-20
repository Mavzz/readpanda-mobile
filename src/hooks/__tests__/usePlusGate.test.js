// The free limits only apply while ReadPanda+ is on; with it off, creating a
// room or bucket never hits the paywall (plus-off-switch R2).
import { renderHook } from '@testing-library/react-native';

const mockNavigate = jest.fn();
let mockPlusOn = false;
let mockState;

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../services/purchasesService', () => ({
  get isPlusEnabled() { return mockPlusOn; },
}));
jest.mock('../../stores/subscriptionStore', () => ({ __esModule: true, default: (pick) => pick(mockState) }));
jest.mock('../../stores/roomStore', () => ({ __esModule: true, default: (pick) => pick(mockState) }));
jest.mock('../../stores/bucketsStore', () => ({ __esModule: true, default: (pick) => pick(mockState) }));

import usePlusGate from '../usePlusGate';

const hostedRoom = { members: [{ isMe: true, isCreator: true }] };
const atTheLimits = {
  isPlus: false,
  rooms: [hostedRoom],
  customBuckets: [{ id: 1 }, { id: 2 }, { id: 3 }],
};

// Jest runs as a development build, which skips the limits; these tests are
// about release builds.
const dev = global.__DEV__;
beforeEach(() => {
  jest.clearAllMocks();
  global.__DEV__ = false;
  mockState = atTheLimits;
});
afterAll(() => { global.__DEV__ = dev; });

const gateFor = async () => (await renderHook(() => usePlusGate())).result.current;

describe('while ReadPanda+ is off', () => {
  beforeEach(() => { mockPlusOn = false; });

  it.each(['rooms', 'buckets'])('runs the %s action at the free limit', async (reason) => {
    const action = jest.fn();
    (await gateFor())(reason, action);
    expect(action).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('while ReadPanda+ is on', () => {
  beforeEach(() => { mockPlusOn = true; });

  it.each(['rooms', 'buckets'])('opens the paywall for %s at the free limit', async (reason) => {
    const action = jest.fn();
    (await gateFor())(reason, action);
    expect(action).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Paywall', { reason });
  });

  it('runs the action under the limit', async () => {
    mockState = { ...atTheLimits, rooms: [] };
    const action = jest.fn();
    (await gateFor())('rooms', action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('runs the action for a ReadPanda+ reader at the limit', async () => {
    mockState = { ...atTheLimits, isPlus: true };
    const action = jest.fn();
    (await gateFor())('buckets', action);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
