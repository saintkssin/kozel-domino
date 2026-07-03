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
  showMenu: boolean;
  connect: () => void;
  send: (msg: ClientToServer) => void;
  clearError: () => void;
  dismissPopup: (id: number) => void;
  leaveRoom: () => void;
  goToMenu: () => void;
  resumeGame: () => void;
};

// suppress unused import warning
void DEFAULT_SETTINGS;

let popupCounter = 0;

function getReconnectUUID(): string {
  let id = localStorage.getItem('kozel_reconnect_uuid');
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('kozel_reconnect_uuid', id);
  }
  return id;
}

export const useGameStore = create<Store>((set, get) => ({
  socket: null,
  gameState: null,
  myPlayerId: null,
  scorePopups: [],
  error: null,
  showMenu: false,

  connect() {
    if (get().socket) return;
    const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket = io(url, { transports: ['websocket'] });

    let uuidRegistered = false;

    socket.on('connect', () => {
      uuidRegistered = false; // reset so we re-register UUID on each (re)connect

      const uuid = localStorage.getItem('kozel_reconnect_uuid');
      const savedPlayerId = localStorage.getItem('kozel_player_id');
      const savedRoom = localStorage.getItem('kozel_room_id');

      if (uuid && savedPlayerId && savedRoom) {
        set({ myPlayerId: savedPlayerId });
        socket.emit('message', { type: 'reconnect', token: uuid } as ClientToServer);
      } else {
        set({ myPlayerId: socket.id });
      }
    });

    socket.on('room_state', (msg: ServerToClient) => {
      if (msg.type === 'room_state') {
        const currentId = get().myPlayerId;
        set({ gameState: msg.state });
        localStorage.setItem('kozel_room_id', msg.state.roomId);
        if (currentId) localStorage.setItem('kozel_player_id', currentId);

        // Register our persistent UUID with the server so it can use it as reconnect token.
        // Done once per socket connection (not on every broadcast).
        if (!uuidRegistered) {
          uuidRegistered = true;
          socket.emit('message', {
            type: 'set_reconnect_id',
            reconnectId: getReconnectUUID(),
          } as ClientToServer);
        }
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
        if (
          msg.message === 'Session expired' ||
          msg.message === 'Room no longer exists' ||
          msg.message === 'Player not found'
        ) {
          // Reconnect failed — clear stale room data but keep persistent UUID
          localStorage.removeItem('kozel_room_id');
          localStorage.removeItem('kozel_player_id');
          // Only reset to home screen if we're not currently viewing a game
          if (!get().gameState) {
            set({ myPlayerId: socket.id });
          }
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
  goToMenu() { set({ showMenu: true }); },
  resumeGame() { set({ showMenu: false }); },

  leaveRoom() {
    get().socket?.emit('message', { type: 'leave_room' } as ClientToServer);
    localStorage.removeItem('kozel_room_id');
    localStorage.removeItem('kozel_player_id');
    // kozel_reconnect_uuid is kept — it's persistent across sessions
    set({ gameState: null, showMenu: false });
  },
}));
