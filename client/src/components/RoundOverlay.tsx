import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

export default function RoundOverlay() {
  const { gameState, myPlayerId, send } = useGameStore();
  if (!gameState || gameState.phase !== 'roundEnd') return null;

  const { roundWinner, roundWinReason, scores, settings, players } = gameState;
  const me = players.find(p => p.id === myPlayerId);
  const isHost = me?.isHost;

  function label(key?: string) {
    if (!key) return '?';
    if (key === 'A') return 'Команда A 🟡';
    if (key === 'B') return 'Команда B 💜';
    return players.find(p => p.id === key)?.name ?? key;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center gap-6 z-50">
      <motion.h2 initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
        className="text-5xl font-bold text-teamA drop-shadow-[0_0_20px_rgba(245,166,35,0.8)]">
        🎉 Раунд!
      </motion.h2>
      <p className="text-2xl">{label(roundWinner)} — <span className="text-teamA">{roundWinReason}</span></p>

      <div className="flex gap-8 text-2xl">
        {settings.mode === 'teams' ? (
          <>
            <span className="text-teamA">A: {scores['A'] ?? 0}</span>
            <span className="text-teamB">B: {scores['B'] ?? 0}</span>
          </>
        ) : (
          Object.entries(scores).map(([k, v]) => (
            <span key={k}>{players.find(p => p.id === k)?.name ?? k}: {v}</span>
          ))
        )}
      </div>

      {isHost && (
        <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}
          onClick={() => send({ type: 'start_next_round' } as never)}
          className="bg-teamA text-bg rounded-2xl px-8 py-3 text-xl font-bold mt-2">
          Наступний раунд →
        </motion.button>
      )}
      {!isHost && <p className="text-bg-3">Чекаємо на хоста...</p>}
    </motion.div>
  );
}
