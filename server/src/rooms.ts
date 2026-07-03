import { GameState, RoomSettings, Player, DEFAULT_SETTINGS } from '@kozel/shared';

const rooms = new Map<string, GameState>();
const reconnectTokens = new Map<string, { roomId: string; playerId: string; timer: ReturnType<typeof setTimeout> }>();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

export function generateRoomId(): string {
  let id: string;
  do { id = Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(''); }
  while (rooms.has(id));
  return id;
}

export function createRoom(hostId: string, hostName: string, settings: RoomSettings): GameState {
  const roomId = generateRoomId();
  const host: Player = {
    id: hostId, name: sanitizeName(hostName, []), seat: 0,
    team: settings.mode === 'teams' ? 'A' : null,
    hand: [], connected: true, ready: false, isHost: true,
  };
  const state: GameState = {
    roomId, settings: { ...DEFAULT_SETTINGS, ...settings },
    players: [host], chain: [], bazaar: [], currentTurn: 0,
    scores: initScores(settings), phase: 'lobby',
  };
  rooms.set(roomId, state);
  return state;
}

export function getRoom(roomId: string): GameState | undefined {
  return rooms.get(roomId);
}

export function updateRoom(state: GameState): void {
  rooms.set(state.roomId, state);
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId);
}

export function sanitizeName(name: string, existing: string[]): string {
  const base = name.trim().slice(0, 16) || 'Гравець';
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}

export function initScores(settings: RoomSettings): Record<string, number> {
  if (settings.mode === 'teams') return { A: 0, B: 0 };
  return {}; // ffa: keys added per playerId on join
}

export function scheduleReconnect(
  token: string, roomId: string, playerId: string,
  onExpire: () => void,
): void {
  const existing = reconnectTokens.get(token);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => { reconnectTokens.delete(token); onExpire(); }, 75_000);
  reconnectTokens.set(token, { roomId, playerId, timer });
}

export function consumeReconnectToken(token: string): { roomId: string; playerId: string } | null {
  const entry = reconnectTokens.get(token);
  if (!entry) return null;
  clearTimeout(entry.timer);
  reconnectTokens.delete(token);
  return entry;
}
