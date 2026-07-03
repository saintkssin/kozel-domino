import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { GameState, ClientToServer, ServerToClient, DEFAULT_SETTINGS } from '@kozel/shared';

type ScorePopup = { id: number; key: string; delta: number; total: number };

type Store = {
  socket: Socket | null;
  gameState: GameState | null;
  myPlayerId: string | null;
  scorePopups: ScorePopup[];
  error: string | null;
  connect: () => void;
  send: (msg: ClientToServer) => void;
  clearError: () => void;
  dismissPopup: (id: number) => void;
};

let popupCounter = 0;

export const useGameStore = create<Store>((set, get) => ({
  socket: null,
  gameState: null,
  myPlayerId: null,
  scorePopups: [],
  error: null,

  connect() {
    if (get().socket) return;
    const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket = io(url, { transports: ['websocket'] });

    socket.on('connect', () => {
      set({ myPlayerId: socket.id });
      // Attempt reconnect if token stored
      const token = localStorage.getItem('kozel_session_token');
      const roomId = localStorage.getItem('kozel_room_id');
      if (token && roomId) {
        socket.emit('message', { type: 'reconnect', token, roomId } as unknown as ClientToServer);
      }
    });

    socket.on('room_state', (msg: ServerToClient) => {
      if (msg.type === 'room_state') {
        set({ gameState: msg.state });
        localStorage.setItem('kozel_room_id', msg.state.roomId);
        localStorage.setItem('kozel_session_token', socket.id ?? '');
      }
    });

    socket.on('score_update', (msg: ServerToClient) => {
      if (msg.type === 'score_update') {
        set(s => ({
          scorePopups: [
            ...s.scorePopups,
            { id: ++popupCounter, key: msg.scoreKey, delta: msg.delta, total: msg.total },
          ],
        }));
      }
    });

    socket.on('error', (msg: ServerToClient) => {
      if (msg.type === 'error') set({ error: msg.message });
    });

    set({ socket });
  },

  send(msg: ClientToServer) {
    get().socket?.emit('message', msg);
  },

  clearError() { set({ error: null }); },
  dismissPopup(id) { set(s => ({ scorePopups: s.scorePopups.filter(p => p.id !== id) })); },
}));
