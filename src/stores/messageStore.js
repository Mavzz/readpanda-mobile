import { create } from 'zustand';
import log from '../utils/logger';

const useMessageStore = create((set) => ({
  messages: [],
  loading: false,
  hasMore: true,

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  setMessages: (messages) => {
    set({ messages });
  },

  appendOlderMessages: (olderMessages) => {
    if (olderMessages.length === 0) {
      set({ hasMore: false });
      return;
    }
    set((state) => ({
      messages: [...olderMessages, ...state.messages],
    }));
  },

  clearMessages: () => {
    log.info('Clearing message store');
    set({ messages: [], hasMore: true });
  },
}));

export default useMessageStore;
