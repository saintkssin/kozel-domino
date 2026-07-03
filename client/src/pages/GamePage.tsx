import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { DominoTile, ChainTile } from '@kozel/shared';
import RoundOverlay from '../components/RoundOverlay';
import MatchOverlay from '../components/MatchOverlay';

export default function GamePage() {
  const { gameState, myPlayerId, send } = useGameStore();
  if (!gameState) return null;

  const { players, chain, bazaar, currentTurn, scores, phase, settings } = gameState;
  const me = players.find(p => p.id === myPlayerId);
  const myHand = me?.hand ?? [];
  const isMyTurn = me?.seat === currentTurn;
  const currentPlayer = players.find(p => p.seat === currentTurn);

  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  function canPlayTile(tile: DominoTile): boolean {
    if (!chain.length) return true;
    const l = chainLeft(chain); const r = chainRight(chain);
    return tile.left === l || tile.right === l || tile.left === r || tile.right === r;
  }

  function playTile(end: 'left' | 'right') {
    if (!selectedTile) return;
    send({ type: 'play_tile', tileId: selectedTile, end });
    setSelectedTile(null);
  }

  function drawFromBazaar(tileId: string) {
    send({ type: 'draw_from_bazaar', tileId });
  }

  function passTurn() {
    send({ type: 'pass_turn' });
  }

  const hasPlay = myHand.some(canPlayTile);

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Score bar */}
      <ScoreBar scores={scores} settings={settings} players={players} />

      {/* Other players */}
      <div className="flex justify-between px-4 pt-2 pb-1">
        {players.filter(p => p.id !== myPlayerId).map(p => (
          <PlayerAvatar key={p.id} player={p} isActive={p.seat === currentTurn} />
        ))}
      </div>

      {/* Chain */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-2 overflow-auto">
        <div className="flex items-center gap-1 overflow-x-auto max-w-full py-4 px-2">
          {chain.length === 0 && (
            <p className="text-bg-3 text-lg">Ланцюг порожній — перший хід</p>
          )}
          {chain.map((ct, i) => (
            <ChainTileView key={ct.tile.id + i} ct={ct} />
          ))}
        </div>

        {/* Bazaar */}
        {settings.bazaarEnabled && bazaar.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-bg-3 text-sm uppercase tracking-widest">Базар</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {bazaar.map(t => (
                <motion.button key={t.id} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                  disabled={!(isMyTurn && !hasPlay)}
                  onClick={() => drawFromBazaar(t.id)}
                  className="disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <TileCard tile={t} />
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* End placement buttons */}
      <AnimatePresence>
        {selectedTile && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex gap-4 justify-center pb-2"
          >
            <button onClick={() => playTile('left')}
              className="bg-teamB text-white rounded-xl px-6 py-2 text-lg font-semibold">
              ← Ліво
            </button>
            <button onClick={() => setSelectedTile(null)}
              className="bg-bg-2 border border-bg-3 rounded-xl px-6 py-2 text-lg">
              Скасувати
            </button>
            <button onClick={() => playTile('right')}
              className="bg-teamA text-bg rounded-xl px-6 py-2 text-lg font-semibold">
              Право →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My hand */}
      <div className="flex flex-col items-center gap-2 pb-4 px-2">
        <p className="text-bg-3 text-sm">
          {isMyTurn ? '🟢 Ваш хід' : `Хід: ${currentPlayer?.name ?? '?'}`}
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          {myHand.map(t => {
            const playable = isMyTurn && canPlayTile(t);
            const sel = selectedTile === t.id;
            return (
              <motion.button key={t.id}
                whileHover={playable ? { y: -6, scale: 1.06 } : {}}
                whileTap={playable ? { scale: 0.95 } : {}}
                onClick={() => playable && setSelectedTile(sel ? null : t.id)}
                className={`transition-all ${sel ? 'ring-2 ring-teamA ring-offset-2 ring-offset-bg' : ''} ${!playable ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <TileCard tile={t} />
              </motion.button>
            );
          })}
        </div>

        {isMyTurn && !hasPlay && bazaar.length === 0 && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={passTurn}
            className="bg-danger text-white rounded-xl px-6 py-2 text-lg font-semibold mt-1">
            Пропустити хід
          </motion.button>
        )}
      </div>

      {(phase === 'roundEnd' || phase === 'matchEnd') && <RoundOverlay />}
      {phase === 'matchEnd' && <MatchOverlay />}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TileCard({ tile, rotate }: { tile: DominoTile; rotate?: boolean }) {
  return (
    <div className={`bg-tile-bg border-2 border-tile-border rounded-xl shadow-tile flex ${rotate ? 'flex-row w-16 h-8' : 'flex-col w-10 h-20'} items-center justify-center gap-0 select-none`}>
      <Pips n={tile.left} />
      <div className={`${rotate ? 'w-px h-6' : 'h-px w-6'} bg-tile-border`} />
      <Pips n={tile.right} />
    </div>
  );
}

function Pips({ n }: { n: number }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <span className="text-tile-dot font-bold text-sm">{n}</span>
    </div>
  );
}

function ChainTileView({ ct }: { ct: ChainTile }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20, opacity: 0 }}
      animate={{ scale: 1, rotate: ct.tile.left === ct.tile.right ? 90 : 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <TileCard tile={ct.tile} rotate={ct.tile.left === ct.tile.right} />
    </motion.div>
  );
}

function PlayerAvatar({ player, isActive }: { player: { name: string; team: 'A' | 'B' | null; connected: boolean; hand: unknown[] }; isActive: boolean }) {
  const glowCls = player.team === 'A' ? 'text-teamA' : player.team === 'B' ? 'text-teamB' : 'text-white';
  return (
    <div className={`flex flex-col items-center gap-1 ${!player.connected ? 'opacity-40' : ''}`}>
      <div className={`w-10 h-10 rounded-full bg-bg-2 flex items-center justify-center text-lg ${isActive ? `animate-pulse-glow border-2 border-current ${glowCls}` : 'border border-bg-3'}`}>
        👤
      </div>
      <span className="text-xs text-center max-w-[60px] truncate">{player.name}</span>
      <span className="text-xs text-bg-3">{(player.hand as unknown[]).length} к.</span>
    </div>
  );
}

function ScoreBar({ scores, settings, players }: {
  scores: Record<string, number>;
  settings: { mode: string; targetScore: number };
  players: { id: string; name: string; team: 'A' | 'B' | null }[];
}) {
  if (settings.mode === 'teams') {
    return (
      <div className="flex justify-between px-6 py-2 bg-bg-2">
        <ScoreBadge label="🟡 Команда A" score={scores['A'] ?? 0} target={settings.targetScore} color="teamA" />
        <ScoreBadge label="💜 Команда B" score={scores['B'] ?? 0} target={settings.targetScore} color="teamB" />
      </div>
    );
  }
  return (
    <div className="flex gap-4 px-4 py-2 bg-bg-2 overflow-x-auto">
      {players.map(p => (
        <ScoreBadge key={p.id} label={p.name} score={scores[p.id] ?? 0} target={settings.targetScore} color="teamA" />
      ))}
    </div>
  );
}

function ScoreBadge({ label, score, target, color }: { label: string; score: number; target: number; color: 'teamA' | 'teamB' }) {
  const cls = color === 'teamA' ? 'text-teamA' : 'text-teamB';
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-bg-3">{label}</span>
      <motion.span key={score} initial={{ scale: 1.4 }} animate={{ scale: 1 }}
        className={`text-3xl font-bold ${cls}`}>{score}</motion.span>
      <span className="text-xs text-bg-3">/ {target}</span>
    </div>
  );
}

function chainLeft(chain: ChainTile[]): number {
  const f = chain[0]; return f.orientation === 'normal' ? f.tile.left : f.tile.right;
}
function chainRight(chain: ChainTile[]): number {
  const l = chain[chain.length - 1]; return l.orientation === 'normal' ? l.tile.right : l.tile.left;
}
