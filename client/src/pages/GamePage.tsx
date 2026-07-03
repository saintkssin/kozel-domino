import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { ChainTile, Player } from '@kozel/shared';
import { DominoTileCard, DominoBack } from '../components/DominoTile';
import RoundOverlay from '../components/RoundOverlay';
import MatchOverlay from '../components/MatchOverlay';

const TILE_HALF = 40;

function assignPositions(mySeat: number, players: Player[]): Record<string, 'top' | 'left' | 'right'> {
  const n = players.length;
  const map: Record<string, 'top' | 'left' | 'right'> = {};
  for (const p of players) {
    if (p.seat === mySeat) continue;
    const off = (p.seat - mySeat + n) % n;
    map[p.id] = n === 2 ? 'top'
      : n === 3 ? (off === 1 ? 'right' : 'left')
      : off === 1 ? 'right' : off === 2 ? 'top' : 'left';
  }
  return map;
}

export default function GamePage() {
  const { gameState, myPlayerId, send, error } = useGameStore();
  if (!gameState) return null;

  const { players, chain, bazaar, currentTurn, scores, phase, settings } = gameState;
  const me = players.find(p => p.id === myPlayerId);
  const myHand = me?.hand ?? [];
  const isMyTurn = me?.seat === currentTurn;
  const currentPlayer = players.find(p => p.seat === currentTurn);

  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const lastPlayedRef = useRef<string | null>(null);

  const hasPlay = myHand.some(t => {
    if (!chain.length) return true;
    const l = chainEndValue(chain, 'left');
    const r = chainEndValue(chain, 'right');
    return t.left === l || t.right === l || t.left === r || t.right === r;
  });

  useEffect(() => {
    if (!error) return;
    const target = lastPlayedRef.current;
    if (target) {
      setShakeId(target);
      setSelectedTileId(target);
      lastPlayedRef.current = null;
      const t = setTimeout(() => setShakeId(null), 450);
      return () => clearTimeout(t);
    }
  }, [error]);

  function playTile(end: 'left' | 'right') {
    if (!selectedTileId) return;
    lastPlayedRef.current = selectedTileId;
    send({ type: 'play_tile', tileId: selectedTileId, end });
    setSelectedTileId(null);
  }

  const positions = me ? assignPositions(me.seat, players) : {};
  const topPlayer = players.find(p => positions[p.id] === 'top');
  const leftPlayer = players.find(p => positions[p.id] === 'left');
  const rightPlayer = players.find(p => positions[p.id] === 'right');

  const isHost = me?.isHost ?? false;
  const hasDisconnected = players.some(p => !p.connected);

  return (
    <div className="felt-table relative flex flex-col h-screen overflow-hidden">

      <ScoreBar scores={scores} settings={settings} players={players}
        isHost={isHost}
        onRestart={() => send({ type: 'restart_game' })} />

      {/* Top opponent */}
      {topPlayer && (
        <div className="flex justify-center pt-1 z-10 flex-shrink-0">
          <OpponentSlot player={topPlayer} isActive={topPlayer.seat === currentTurn} pos="top" />
        </div>
      )}

      {/* Middle: left | chain | right + bazaar */}
      <div className="flex-1 flex min-h-0 z-10">

        <div className="w-20 flex-shrink-0 flex items-center justify-center">
          {leftPlayer && (
            <OpponentSlot player={leftPlayer} isActive={leftPlayer.seat === currentTurn} pos="left" />
          )}
        </div>

        <div className="flex-1 flex items-center justify-center overflow-auto">
          <ChainView chain={chain} />
        </div>

        <div className="w-24 flex-shrink-0 flex flex-col items-center justify-center gap-2 py-1 pr-1">
          {rightPlayer && (
            <OpponentSlot player={rightPlayer} isActive={rightPlayer.seat === currentTurn} pos="right" />
          )}
          {settings.bazaarEnabled && bazaar.length > 0 && (
            <div className="flex flex-col items-center gap-0.5 overflow-y-auto max-h-[45vh]">
              <span className="text-[10px] text-tile-bg opacity-50">({bazaar.length})</span>
              {bazaar.map(t => (
                <motion.button key={t.id}
                  whileHover={isMyTurn && !hasPlay ? { scale: 1.07 } : {}}
                  whileTap={isMyTurn && !hasPlay ? { scale: 0.93 } : {}}
                  onClick={isMyTurn && !hasPlay ? () => send({ type: 'draw_from_bazaar', tileId: t.id }) : undefined}
                  className={isMyTurn && !hasPlay ? 'cursor-pointer' : 'cursor-default'}>
                  <DominoBack size={20} />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disconnected player warning — host only */}
      {hasDisconnected && isHost && (
        <div className="flex items-center justify-center gap-2 py-1 z-10 flex-shrink-0">
          <span className="text-danger text-xs">A player is offline.</span>
          <motion.button whileTap={{ scale: 0.93 }}
            onClick={() => send({ type: 'restart_game' })}
            className="text-xs bg-ui-card border border-danger text-danger rounded-lg px-3 py-1">
            Restart to lobby
          </motion.button>
        </div>
      )}

      {/* End selection */}
      <AnimatePresence>
        {selectedTileId && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="flex gap-3 justify-center pb-2 z-20 flex-shrink-0">
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => playTile('left')}
              className="bg-teamB text-white rounded-xl px-5 py-2 text-lg font-semibold shadow-tile">
              Left
            </motion.button>
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => setSelectedTileId(null)}
              className="bg-ui-card border border-ui-border rounded-xl px-5 py-2 text-lg">
              X
            </motion.button>
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => playTile('right')}
              className="bg-teamA text-ui-bg rounded-xl px-5 py-2 text-lg font-semibold shadow-tile">
              Right
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My hand */}
      <div className="flex flex-col items-center gap-2 pb-3 px-2 z-10 flex-shrink-0">
        <p className={`text-sm font-semibold px-3 py-0.5 rounded-full ${isMyTurn ? 'bg-teamA text-ui-bg' : 'bg-ui-card text-tile-bg'}`}>
          {isMyTurn ? 'Your turn' : `Turn: ${currentPlayer?.name ?? '?'}`}
        </p>
        <div className="flex gap-2 flex-wrap justify-center px-2">
          {myHand.map(t => {
            const sel = selectedTileId === t.id;
            return (
              <DominoTileCard key={t.id}
                left={t.left} right={t.right}
                layout="vertical"
                size={TILE_HALF + 8}
                selected={sel}
                shake={shakeId === t.id}
                onClick={isMyTurn ? () => {
                  if (chain.length === 0) {
                    lastPlayedRef.current = t.id;
                    send({ type: 'play_tile', tileId: t.id, end: 'right' });
                    return;
                  }
                  setSelectedTileId(sel ? null : t.id);
                } : undefined}
              />
            );
          })}
        </div>
        {isMyTurn && !hasPlay && bazaar.length === 0 && (
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => send({ type: 'pass_turn' })}
            className="bg-danger text-white rounded-xl px-5 py-2 text-lg font-semibold mt-1 shadow-tile">
            Pass
          </motion.button>
        )}
      </div>

      {(phase === 'roundEnd' || phase === 'matchEnd') && <RoundOverlay />}
      {phase === 'matchEnd' && <MatchOverlay />}
    </div>
  );
}

function OpponentSlot({ player, isActive, pos }: {
  player: Player; isActive: boolean; pos: 'top' | 'left' | 'right';
}) {
  const count = player.handCount ?? player.hand.length;
  const isVert = pos !== 'top';
  const teamGlow = player.team === 'A' ? 'border-teamA shadow-[0_0_8px_2px_#f5a62366]'
    : player.team === 'B' ? 'border-teamB shadow-[0_0_8px_2px_#7c6af566]'
    : 'border-white shadow-[0_0_8px_2px_rgba(255,255,255,0.25)]';

  const avatar = (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`w-10 h-10 rounded-full bg-ui-card border-2 flex items-center justify-center text-base transition-all
        ${isActive ? `${teamGlow} animate-pulse` : 'border-ui-border'}
        ${!player.connected ? 'opacity-50' : ''}`}>
        {player.isHost ? '👑' : '👤'}
      </div>
      <span className="text-[11px] text-tile-bg max-w-[56px] truncate text-center leading-tight">{player.name}</span>
      {!player.connected
        ? <span className="text-[10px] text-danger leading-none">offline</span>
        : isActive
          ? <span className="text-[10px] text-teamA font-semibold leading-none">turn</span>
          : null}
    </div>
  );

  const tiles = count > 0 ? (
    <div className={`flex ${isVert ? 'flex-col' : 'flex-row'} gap-0.5 items-center`}>
      {Array.from({ length: Math.min(count, 7) }, (_, i) => (
        <div key={i}
          style={{ width: isVert ? 11 : 20, height: isVert ? 20 : 11 }}
          className="bg-[#0d1b2e] border border-[#3a5a8a] rounded-[3px] flex-shrink-0 flex items-center justify-center">
          <div style={{ width: isVert ? 5 : 11, height: isVert ? 11 : 5 }}
            className="border border-[#2a4570] rounded-[1px] opacity-70" />
        </div>
      ))}
      <span className="text-[12px] font-bold text-white opacity-80 leading-none">{count}</span>
    </div>
  ) : null;

  if (pos === 'top') return (
    <div className="flex flex-col items-center gap-1">{avatar}{tiles}</div>
  );
  if (pos === 'left') return (
    <div className="flex flex-row-reverse items-center gap-1">{avatar}{tiles}</div>
  );
  return (
    <div className="flex flex-row items-center gap-1">{avatar}{tiles}</div>
  );
}

function ChainView({ chain }: { chain: ChainTile[] }) {
  if (!chain.length) {
    return (
      <div className="flex items-center justify-center h-20">
        <span className="text-felt-light text-base opacity-60">First move — place a tile</span>
      </div>
    );
  }

  const ROW = 10;
  const rows: { tiles: ChainTile[]; rtl: boolean }[] = [];
  for (let i = 0; i < chain.length; i += ROW) {
    rows.push({ tiles: chain.slice(i, i + ROW), rtl: rows.length % 2 !== 0 });
  }

  return (
    <div className="inline-flex flex-col gap-0 p-2">
      {rows.map(({ tiles, rtl }, ri) => (
        <div key={ri} className={`flex ${rtl ? 'flex-row-reverse' : 'flex-row'} items-center gap-0`}>
          {tiles.map((ct) => {
            const isDouble = ct.tile.left === ct.tile.right;
            let a = ct.orientation === 'normal' ? ct.tile.left : ct.tile.right;
            let b = ct.orientation === 'normal' ? ct.tile.right : ct.tile.left;
            if (rtl) [a, b] = [b, a];
            return (
              <DominoTileCard key={ct.tile.id + ri}
                left={a} right={b} isDouble={isDouble}
                orientation="normal" size={TILE_HALF} animate />
            );
          })}
        </div>
      ))}
    </div>
  );
}


function chainEndValue(chain: ChainTile[], end: 'left' | 'right'): number {
  if (!chain.length) return -1;
  if (end === 'left') {
    const f = chain[0];
    return f.orientation === 'normal' ? f.tile.left : f.tile.right;
  }
  const l = chain[chain.length - 1];
  return l.orientation === 'normal' ? l.tile.right : l.tile.left;
}

function ScoreBar({ scores, settings, players, isHost, onRestart }: {
  scores: Record<string, number>;
  settings: { mode: string; targetScore: number };
  players: { id: string; name: string; team: 'A' | 'B' | null }[];
  isHost: boolean;
  onRestart: () => void;
}) {
  return (
    <div className="flex justify-between items-center px-3 py-2 bg-ui-bg border-b border-ui-border z-10 flex-shrink-0">
      <div className="flex-1 flex items-center gap-4 overflow-x-auto">
        {settings.mode === 'teams' ? (
          <>
            <ScoreBadge label="A" score={scores['A'] ?? 0} target={settings.targetScore} color="teamA" />
            <span className="text-ui-border text-sm flex-shrink-0">to {settings.targetScore}</span>
            <ScoreBadge label="B" score={scores['B'] ?? 0} target={settings.targetScore} color="teamB" />
          </>
        ) : (
          players.map(p => (
            <ScoreBadge key={p.id} label={p.name} score={scores[p.id] ?? 0} target={settings.targetScore} color="teamA" />
          ))
        )}
      </div>
      {isHost && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={onRestart}
          title="Restart — return all players to lobby"
          className="ml-2 text-sm text-tile-bg opacity-50 hover:opacity-100 px-2 py-1 rounded border border-ui-border flex-shrink-0 transition-opacity">
          Restart
        </motion.button>
      )}
    </div>
  );
}

function ScoreBadge({ label, score, target, color }: {
  label: string; score: number; target: number; color: 'teamA' | 'teamB';
}) {
  const pct = Math.min(100, (score / target) * 100);
  const cls = color === 'teamA' ? 'text-teamA' : 'text-teamB';
  const barCls = color === 'teamA' ? 'bg-teamA' : 'bg-teamB';
  return (
    <div className="flex flex-col items-center min-w-[52px]">
      <span className="text-xs text-tile-bg opacity-70 truncate max-w-[64px]">{label}</span>
      <motion.span key={score} initial={{ scale: 1.5 }} animate={{ scale: 1 }}
        className={`text-2xl font-bold leading-none ${cls}`}>{score}</motion.span>
      <div className="w-10 h-1 bg-ui-border rounded-full mt-0.5">
        <div className={`h-full rounded-full ${barCls} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
