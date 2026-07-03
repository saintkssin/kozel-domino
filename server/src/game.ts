import { GameState, DominoTile, ChainTile, DEAL_CONFIG, RoomSettings } from '@kozel/shared';

// ── Tile generation ──────────────────────────────────────────────────────────

export function buildFullSet(): DominoTile[] {
  const tiles: DominoTile[] = [];
  for (let l = 0; l <= 6; l++)
    for (let r = l; r <= 6; r++)
      tiles.push({ id: `${l}-${r}`, left: l, right: r });
  return tiles;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Deal ─────────────────────────────────────────────────────────────────────

export function dealTiles(state: GameState): void {
  const { settings, players } = state;
  const cfg = DEAL_CONFIG[settings.playerCount];
  const tpp = settings.tilesPerPlayer ?? cfg.tilesPerPlayer;
  const all = shuffle(buildFullSet());

  if (!settings.bazaarEnabled) {
    // distribute as evenly as possible, leftover goes to dead pile (not shown)
    players.forEach((p, i) => { p.hand = all.slice(i * tpp, (i + 1) * tpp); });
    state.bazaar = [];
  } else {
    players.forEach((p, i) => { p.hand = all.slice(i * tpp, (i + 1) * tpp); });
    state.bazaar = all.slice(players.length * tpp);
  }
  state.chain = [];
}

// ── Chain helpers ────────────────────────────────────────────────────────────

export function chainLeftValue(chain: ChainTile[]): number {
  if (!chain.length) return -1;
  const first = chain[0];
  return first.orientation === 'normal' ? first.tile.left : first.tile.right;
}

export function chainRightValue(chain: ChainTile[]): number {
  if (!chain.length) return -1;
  const last = chain[chain.length - 1];
  return last.orientation === 'normal' ? last.tile.right : last.tile.left;
}

export function canPlay(tile: DominoTile, chain: ChainTile[]): boolean {
  if (!chain.length) return true;
  const l = chainLeftValue(chain);
  const r = chainRightValue(chain);
  return tile.left === l || tile.right === l || tile.left === r || tile.right === r;
}

export function hasAnyPlay(hand: DominoTile[], chain: ChainTile[]): boolean {
  return hand.some(t => canPlay(t, chain));
}

export function placeTile(
  state: GameState, tileId: string, end: 'left' | 'right',
): { ok: boolean; error?: string; scoreDelta?: number } {
  const seat = state.currentTurn;
  const player = state.players.find(p => p.seat === seat);
  if (!player) return { ok: false, error: 'Гравець не знайдений' };

  const tileIdx = player.hand.findIndex(t => t.id === tileId);
  if (tileIdx === -1) return { ok: false, error: 'Кістка не в руці' };

  const tile = player.hand[tileIdx];

  if (!canPlay(tile, state.chain)) return { ok: false, error: 'Кістка не підходить' };

  // Determine orientation and place
  let orientation: 'normal' | 'flipped' = 'normal';
  if (state.chain.length === 0) {
    state.chain.push({ tile, orientation: 'normal' });
  } else if (end === 'right') {
    const rv = chainRightValue(state.chain);
    if (tile.left === rv) orientation = 'normal';
    else if (tile.right === rv) orientation = 'flipped';
    else return { ok: false, error: 'Кістка не підходить до правого кінця' };
    state.chain.push({ tile, orientation });
  } else {
    const lv = chainLeftValue(state.chain);
    if (tile.right === lv) orientation = 'normal';
    else if (tile.left === lv) orientation = 'flipped';
    else return { ok: false, error: 'Кістка не підходить до лівого кінця' };
    state.chain.unshift({ tile, orientation });
  }

  player.hand.splice(tileIdx, 1);

  const delta = calcScoreDelta(state);
  if (delta > 0) addScore(state, player, delta);

  return { ok: true, scoreDelta: delta };
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function calcScoreDelta(state: GameState): number {
  const { chain } = state;
  if (!chain.length) return 0;
  const sum = chainLeftValue(chain) + chainRightValue(chain);
  return sum % 5 === 0 ? sum : 0;
}

export function addScore(state: GameState, player: { id: string; team: 'A' | 'B' | null }, delta: number): void {
  const key = state.settings.mode === 'teams' ? (player.team ?? player.id) : player.id;
  state.scores[key] = (state.scores[key] ?? 0) + delta;
}

export function scoreKey(state: GameState, player: { id: string; team: 'A' | 'B' | null }): string {
  return state.settings.mode === 'teams' ? (player.team ?? player.id) : player.id;
}

// ── Round end detection ──────────────────────────────────────────────────────

export function checkRoundEnd(state: GameState): { ended: boolean; winnerKey?: string; reason?: string } {
  const activePlayers = state.players.filter(p => p.connected || p.hand.length > 0);

  // Fish: someone emptied their hand — winner gets opponent pip bonus (rounded to 5)
  const fishPlayer = activePlayers.find(p => p.hand.length === 0);
  if (fishPlayer) {
    const key = scoreKey(state, fishPlayer);
    const opponentPips = state.players
      .filter(p => scoreKey(state, p) !== key)
      .reduce((sum, p) => sum + p.hand.reduce((s, t) => s + t.left + t.right, 0), 0);
    if (opponentPips > 0) addScore(state, fishPlayer, opponentPips);
    return { ended: true, winnerKey: key, reason: 'риба' };
  }

  // Blocked: no one can play and bazaar is empty
  const allBlocked = activePlayers.every(p => !hasAnyPlay(p.hand, state.chain));
  if (allBlocked && state.bazaar.length === 0) {
    // Winner = team/player with minimum pip count on hand
    const totals = activePlayers.map(p => ({
      player: p,
      pips: p.hand.reduce((s, t) => s + t.left + t.right, 0),
    }));
    totals.sort((a, b) => a.pips - b.pips);
    const winner = totals[0].player;
    const loserPips = totals.slice(1).reduce((s, t) => s + t.pips, 0);
    addScore(state, winner, loserPips);
    return { ended: true, winnerKey: scoreKey(state, winner), reason: 'закрита гра' };
  }

  return { ended: false };
}

export function checkMatchEnd(state: GameState): boolean {
  return Object.values(state.scores).some(s => s >= state.settings.targetScore);
}

export function computeGoats(state: GameState): string[] {
  return Object.entries(state.scores)
    .filter(([, v]) => v === 0)
    .map(([k]) => k);
}

// ── Turn advancement ─────────────────────────────────────────────────────────

export function nextTurn(state: GameState): void {
  const n = state.settings.playerCount;
  state.currentTurn = (state.currentTurn + 1) % n;
}

// ── First move resolution ────────────────────────────────────────────────────

export function resolveFirstTurn(state: GameState): void {
  const target = '6-6';
  for (const p of state.players) {
    if (p.hand.find(t => t.id === target)) { state.currentTurn = p.seat; return; }
  }
  // In bazaar
  const inBazaar = state.bazaar.find(t => t.id === target);
  if (inBazaar) { state.currentTurn = 0; return; } // seat 0 draws it
  // Fallback: highest double
  let best = -1;
  for (const p of state.players) {
    for (const t of p.hand) {
      if (t.left === t.right && t.left > best) { best = t.left; state.currentTurn = p.seat; }
    }
  }
}
