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
  leaveRoom: () => void;
};

// suppress unused import warning
void DEFAULT_SETTINGS;

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
      const savedToken = localStorage.getItem('kozel_session_token');
      const savedPlayerId = localStorage.getItem('kozel_player_id');
      const savedRoom = localStorage.getItem('kozel_room_id');
      if (savedToken && savedPlayerId && savedRoom) {
        // Restore player identity before receiving room_state
        set({ myPlayerId: savedPlayerId });
        socket.emit('message', { type: 'reconnect', token: savedToken } as ClientToServer);
      } else {
        set({ myPlayerId: socket.id });
      }
      // Store new socket.id as next reconnect token
      localStorage.setItem('kozel_session_token', socket.id ?? '');
    });

    socket.on('room_state', (msg: ServerToClient) => {
      if (msg.type === 'room_state') {
        const currentId = get().myPlayerId;
        set({ gameState: msg.state });
        localStorage.setItem('kozel_room_id', msg.state.roomId);
        if (currentId) localStorage.setItem('kozel_player_id', currentId);
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
      if (msg.type === 'error') {
        // Reconnect failures — clear stale session silently
        if (msg.message === 'Session expired' || msg.message === 'Room no longer exists' || msg.message === 'Player not found') {
          localStorage.removeItem('kozel_session_token');
          localStorage.removeItem('kozel_room_id');
          localStorage.removeItem('kozel_player_id');
          set({ myPlayerId: socket.id, gameState: null });
          return;
        }
        set({ error: msg.message });
      }
    });

    set({ socket });
  },

  send(msg: ClientToServer) {
    get().socket?.emit('message', msg);
  },

  clearError() { set({ error: null }); },
  dismissPopup(id) { set(s => ({ scorePopups: s.scorePopups.filter(p => p.id !== id) })); },

  leaveRoom() {
    get().socket?.emit('message', { type: 'leave_room' } as ClientToServer);
    localStorage.removeItem('kozel_session_token');
    localStorage.removeItem('kozel_room_id');
    localStorage.removeItem('kozel_player_id');
    set({ gameState: null });
  },
}));
