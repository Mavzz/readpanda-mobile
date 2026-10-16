// The inbox's icon per kind of notification.

jest.mock('../../utils/openNotification', () => ({ __esModule: true, default: jest.fn() }));

import { iconForType } from '../NotificationList';

it('gives each kind its own icon', () => {
  const kinds = ['REPLY', 'ROOM_COMMENTS', 'ROOM_JOIN', 'ROOM_BOOK', 'NEW_BOOK'];
  const icons = kinds.map(iconForType);
  expect(new Set(icons).size).toBe(kinds.length);
  expect(icons).not.toContain('notifications-outline');
});

it('falls back to the bell for SYSTEM and unknown kinds', () => {
  expect(iconForType('SYSTEM')).toBe('notifications-outline');
  expect(iconForType('SOMETHING_NEW')).toBe('notifications-outline');
  expect(iconForType(undefined)).toBe('notifications-outline');
});
