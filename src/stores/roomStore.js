import { create } from 'zustand';
import log from '../utils/logger';

const useRoomStore = create((set) => ({
  rooms: [],
  activeRoom: null,
  participants: [],
  loading: false,

  setActiveRoom: (room) => {
    log.info('Setting active room:', room?.name);
    set({ activeRoom: room });
  },

  setRooms: (rooms) => {
    set({ rooms });
  },

  setParticipants: (participants) => {
    set({ participants });
  },

  addParticipant: (participant) => {
    set((state) => ({
      participants: [...state.participants, participant],
    }));
  },

  removeParticipant: (userId) => {
    set((state) => ({
      participants: state.participants.filter((p) => p.user_id !== userId),
    }));
  },

  leaveRoom: () => {
    log.info('Leaving active room');
    set({ activeRoom: null, participants: [] });
  },

  clearRooms: () => {
    set({ rooms: [], activeRoom: null, participants: [] });
  },
}));

export default useRoomStore;
