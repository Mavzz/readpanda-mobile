import { FREE_LIMITS } from '../../hooks/usePlusGate';

// The questions on Help & support (specs/help-support, design.md). Settings
// and tabs are named exactly as they appear in the app. While ReadPanda+ is
// off there's no plan to explain and no limits, so its questions and the
// limit sentences are left out.
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const helpTopics = (plusEnabled) => [
  {
    id: 'comments',
    question: 'Why can\'t I see some comments?',
    answer: 'Comments in a room are pinned to the page they\'re about. You see a comment once you\'ve read up to that page, so nobody spoils what\'s ahead. Keep reading and they\'ll appear.',
  },
  {
    id: 'join',
    question: 'How do I join a room?',
    answer: 'Open the invite link or scan the QR code a member shares, or go to the Rooms tab and enter the room\'s invite code.',
  },
  {
    id: 'start',
    question: 'How do I start a room?',
    answer: 'Go to the Rooms tab and tap New, then share its invite code, link or QR code from the room.'
      + (plusEnabled ? ` Free accounts host ${plural(FREE_LIMITS.hostedRooms, 'room')}.` : ''),
  },
  {
    id: 'progress',
    question: 'Who can see how far I\'ve read?',
    answer: 'Everyone in the room. Seeing how far everyone else has read is the point of reading together.',
  },
  {
    id: 'reading',
    question: 'How do I change how books look?',
    answer: 'Go to Settings → Page turning to choose Scroll or Page, and Settings → Page theme for Paper, Sepia or Night.',
  },
  {
    // In the app first (report-block R11.1); email stays the other way.
    id: 'report',
    question: 'How do I report a comment or a reader?',
    answer: 'Tap ⋯ on the comment, or tap their name in the room\'s member list, and choose Report. You can block them from the same menu, and unblock them in Settings → Blocked readers. We review every report promptly. You can also email us at the address below.',
  },
  {
    id: 'delete',
    question: 'How do I delete my account?',
    answer: 'Go to Settings → Delete account. Your reading history, buckets and highlights are deleted, rooms you created pass to another member, and your comments stay as "Deleted reader". This can\'t be undone.',
  },
  ...(plusEnabled ? [
    {
      id: 'plus',
      question: 'What does ReadPanda+ add?',
      answer: `Reading stays free. ReadPanda+ lets you host as many rooms as you like and keep unlimited buckets (free accounts host ${plural(FREE_LIMITS.hostedRooms, 'room')} and keep ${plural(FREE_LIMITS.customBuckets, 'bucket')}).`,
    },
    {
      id: 'restore',
      question: 'I paid for ReadPanda+ but don\'t have it',
      answer: 'Open ReadPanda+ from Settings and tap Restore, while signed in to the same Apple ID you paid with.',
    },
    {
      id: 'cancel',
      question: 'How do I cancel ReadPanda+?',
      answer: 'Only Apple can cancel a subscription: go to iPhone Settings → your name → Subscriptions → ReadPanda. Deleting your ReadPanda account doesn\'t cancel it.',
    },
  ] : []),
];
