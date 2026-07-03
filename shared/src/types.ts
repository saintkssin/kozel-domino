export type DominoTile = { id: string; left: number; right: number };

export type GameMode = 'teams' | 'ffa';

export type RoomSettings = {
  playerCount: 2 | 3 | 4;
  mode: GameMode;
  targetScore: number;
  bazaarEnabled: boolean;
  tilesPerPlayer?: number; // override; server computes bazaar from remainder
};

export type Player = {
  id: string;
  name: string;
  seat: number;
  team: 'A' | 'B' | null;
  hand: DominoTile[];
  connected: boolean;
  ready: boolean;
  isHost: boolean;
};

export type ChainTile = {
  tile: DominoTile;
  orientation: 'normal' | 'flipped';
};

export type GameState = {
  roomId: string;
  settings: RoomSettings;
  players: Player[];
  chain: ChainTile[];
  bazaar: DominoTile[];
  currentTurn: number; // seat index
  scores: Record<string, number>; // 'A'/'B' in teams mode, playerId in ffa
  phase: 'lobby' | 'playing' | 'roundEnd' | 'matchEnd';
  roundWinner?: string;
  roundWinReason?: string;
  goats?: string[]; // IDs of players/teams with 0 score at matchEnd
};

// ── Socket events ────────────────────────────────────────────────────────────

export type ClientToServer =
  | { type: 'create_room'; settings: RoomSettings; hostName: string }
  | { type: 'join_room'; roomId: string; name: string }
  | { type: 'set_name'; name: string }
  | { type: 'update_settings'; settings: Partial<RoomSettings> }
  | { type: 'assign_team'; playerId: string; team: 'A' | 'B' }
  | { type: 'assign_seat'; playerId: string; seat: number }
  | { type: 'toggle_ready' }
  | { type: 'start_game' }
  | { type: 'start_next_round' }
  | { type: 'play_tile'; tileId: string; end: 'left' | 'right' }
  | { type: 'draw_from_bazaar'; tileId: string }
  | { type: 'pass_turn' }
  | { type: 'leave_room' };

export type ServerToClient =
  | { type: 'room_state'; state: GameState }
  | { type: 'score_update'; scoreKey: string; delta: number; total: number }
  | { type: 'round_result'; winnerKey: string; reason: string; scores: Record<string, number> }
  | { type: 'match_end'; scores: Record<string, number>; goats: string[] }
  | { type: 'error'; message: string };

export const DEFAULT_SETTINGS: RoomSettings = {
  playerCount: 4,
  mode: 'teams',
  targetScore: 121,
  bazaarEnabled: true,
};

// Tiles per player & bazaar size by player count
export const DEAL_CONFIG: Record<number, { tilesPerPlayer: number; bazaarSize: number }> = {
  2: { tilesPerPlayer: 7, bazaarSize: 14 },
  3: { tilesPerPlayer: 7, bazaarSize: 7 },
  4: { tilesPerPlayer: 6, bazaarSize: 4 },
};
