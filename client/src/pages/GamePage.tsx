import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { ChainTile, DominoTile } from '@kozel/shared';
import { DominoTileCard, DominoBack } from '../components/DominoTile';
import RoundOverlay from '../components/RoundOverlay';
import MatchOverlay from '../components/MatchOverlay';

const TILE_HALF = 40; // px — half-tile square size

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

  // Shake tile on server error
  useEffect(() => {
    if (!error) return;
    const target = lastPlayedRef.current;
    if (target) {
      setShakeId(target);
      setSelectedTileId(target); // re-select so user can retry
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

  function drawFromBazaar(tileId: string) {
    send({ type: 'draw_from_bazaar', tileId });
  }

  function passTurn() {
    send({ type: 'pass_turn' });
  }

  const opponents = players.filter(p => p.id !== myPlayerId);

  return (
    <div className="felt-table relative flex flex-col min-h-screen overflow-hidden">

      {/* ── Score bar ─────────────────────────────── */}
      <ScoreBar scores={scores} settings={settings} players={players} />

      {/* ── Opponents row ─────────────────────────── */}
      <div className="flex justify-center gap-6 px-4 pt-3 pb-1 z-10">
        {opponents.map(p => (
          <PlayerAvatar key={p.id} player={p}
            isActive={p.seat === currentTurn}
            handCount={(p.hand as DominoTile[]).length}
          />
        ))}
      </div>

      {/* ── Main table area ───────────────────────── */}
      <div className="flex-1 flex items-center justify-center relative z-10 py-2">

        {/* Bazaar — face-down tiles on the right, clickable when no valid play */}
        {settings.bazaarEnabled && bazaar.length > 0 && (
          <div className="absolute right-2 top-2 bottom-2 flex flex-col items-center gap-1 overflow-y-auto max-h-full">
            <span className="text-xs text-tile-bg opacity-60 mb-1">Базар ({bazaar.length})</span>
            {bazaar.map(t => (
              <motion.button
                key={t.id}
                whileHover={isMyTurn && !hasPlay ? { scale: 1.07, y: -3 } : {}}
                whileTap={isMyTurn && !hasPlay ? { scale: 0.93 } : {}}
                onClick={isMyTurn && !hasPlay ? () => drawFromBazaar(t.id) : undefined}
                className={isMyTurn && !hasPlay ? 'cursor-pointer' : 'cursor-default'}
              >
                <DominoBack size={TILE_HALF - 10} />
              </motion.button>
            ))}
          </div>
        )}

        {/* Chain — centered */}
        <div className="flex-1 flex items-center justify-center overflow-x-auto">
          <ChainView chain={chain} />
        </div>
      </div>

      {/* ── End selection (left / right) ──────────── */}
      <AnimatePresence>
        {selectedTileId && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="flex gap-3 justify-center pb-2 z-20">
            <motion.button whileTap={{ scale: 0.93 }}
              onClick={() => playTile('left')}
              className="bg-teamB text-white rounded-xl px-5 py-2 text-lg font-semibold shadow-tile">
              ← Ліво
            </motion.button>
            <motion.button whileTap={{ scale: 0.93 }}
              onClick={() => setSelectedTileId(null)}
              className="bg-ui-card border border-ui-border rounded-xl px-5 py-2 text-lg">
              ✕
            </motion.button>
            <motion.button whileTap={{ scale: 0.93 }}
              onClick={() => playTile('right')}
              className="bg-teamA text-ui-bg rounded-xl px-5 py-2 text-lg font-semibold shadow-tile">
              Право →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── My hand ───────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 pb-4 px-2 z-10">
        <p className={`text-sm font-semibold px-3 py-0.5 rounded-full ${isMyTurn ? 'bg-teamA text-ui-bg' : 'bg-ui-card text-tile-bg'}`}>
          {isMyTurn ? '🟢 Ваш хід' : `Хід: ${currentPlayer?.name ?? '?'}`}
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
          <motion.button whileTap={{ scale: 0.93 }} onClick={passTurn}
            className="bg-danger text-white rounded-xl px-5 py-2 text-lg font-semibold mt-1 shadow-tile">
            Пропустити хід
          </motion.button>
        )}
      </div>

      {(phase === 'roundEnd' || phase === 'matchEnd') && <RoundOverlay />}
      {phase === 'matchEnd' && <MatchOverlay />}
    </div>
  );
}

// ── Chain renderer ────────────────────────────────────────────────────────────

function ChainView({ chain }: { chain: ChainTile[] }) {
  if (!chain.length) {
    return (
      <div className="flex items-center justify-center h-20">
        <span className="text-felt-light text-base opacity-60">Перший хід — викладіть кістку</span>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center justify-center gap-0 px-4 py-3 min-h-[80px] flex-wrap">
      {chain.map((ct, i) => {
        const isDouble = ct.tile.left === ct.tile.right;
        const a = ct.orientation === 'normal' ? ct.tile.left : ct.tile.right;
        const b = ct.orientation === 'normal' ? ct.tile.right : ct.tile.left;

        return (
          <div key={ct.tile.id + i} className="flex items-center">
            {i > 0 && !isDouble && <div className="w-0" />}
            <DominoTileCard
              left={a} right={b}
              isDouble={isDouble}
              orientation="normal"
              size={TILE_HALF}
              animate
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function chainEndValue(chain: ChainTile[], end: 'left' | 'right'): number {
  if (!chain.length) return -1;
  if (end === 'left') {
    const f = chain[0];
    return f.orientation === 'normal' ? f.tile.left : f.tile.right;
  }
  const l = chain[chain.length - 1];
  return l.orientation === 'normal' ? l.tile.right : l.tile.left;
}

function PlayerAvatar({ player, isActive, handCount }: {
  player: { name: string; team: 'A' | 'B' | null; connected: boolean };
  isActive: boolean;
  handCount: number;
}) {
  const glowColor = player.team === 'A' ? 'text-teamA' : player.team === 'B' ? 'text-teamB' : 'text-white';
  return (
    <div className={`flex flex-col items-center gap-1 ${!player.connected ? 'opacity-40' : ''}`}>
      <div className={`w-10 h-10 rounded-full bg-ui-card flex items-center justify-center text-lg border-2 ${
        isActive ? `${glowColor} animate-pulse-glow border-current` : 'border-ui-border'
      }`}>👤</div>
      <span className="text-xs max-w-[64px] truncate text-center text-tile-bg">{player.name}</span>
      <span className="text-xs text-felt-light">{handCount} к.</span>
    </div>
  );
}

function ScoreBar({ scores, settings, players }: {
  scores: Record<string, number>;
  settings: { mode: string; targetScore: number };
  players: { id: string; name: string; team: 'A' | 'B' | null }[];
}) {
  return (
    <div className="flex justify-between items-center px-4 py-2 bg-ui-bg border-b border-ui-border z-10">
      {settings.mode === 'teams' ? (
        <>
          <ScoreBadge label="🟡 A" score={scores['A'] ?? 0} target={settings.targetScore} color="teamA" />
          <span className="text-ui-border text-sm">до {settings.targetScore}</span>
          <ScoreBadge label="💜 B" score={scores['B'] ?? 0} target={settings.targetScore} color="teamB" />
        </>
      ) : (
        <div className="flex gap-4 w-full overflow-x-auto">
          {players.map(p => (
            <ScoreBadge key={p.id} label={p.name} score={scores[p.id] ?? 0} target={settings.targetScore} color="teamA" />
          ))}
        </div>
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
    <div className="flex flex-col items-center min-w-[56px]">
      <span className="text-xs text-tile-bg opacity-70">{label}</span>
      <motion.span key={score} initial={{ scale: 1.5 }} animate={{ scale: 1 }}
        className={`text-2xl font-bold leading-none ${cls}`}>{score}</motion.span>
      <div className="w-12 h-1 bg-ui-border rounded-full mt-0.5">
        <div className={`h-full rounded-full ${barCls} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
