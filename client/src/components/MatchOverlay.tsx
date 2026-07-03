import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';

export default function MatchOverlay() {
  const { gameState, send } = useGameStore();
  if (!gameState || gameState.phase !== 'matchEnd') return null;

  const { scores, settings, players, goats = [] } = gameState;
  const isGoat = (key: string) => goats.includes(key);

  function label(key: string) {
    if (key === 'A') return 'Команда A';
    if (key === 'B') return 'Команда B';
    return players.find(p => p.id === key)?.name ?? key;
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const winner = sorted[0]?.[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center gap-8 z-50 px-4">
      <motion.h1 initial={{ scale: 0.3, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 150 }}
        className="text-7xl font-bold text-teamA drop-shadow-[0_0_32px_rgba(245,166,35,0.9)] text-center">
        🏆 Матч!
      </motion.h1>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="text-3xl">{label(winner)} перемагає!</motion.p>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {sorted.map(([key, score], i) => (
          <motion.div key={key}
            initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={`flex justify-between items-center bg-bg-2 rounded-2xl px-6 py-3 text-xl
              ${isGoat(key) ? 'border-2 border-danger' : i === 0 ? 'border-2 border-teamA' : ''}`}
          >
            <span>{i === 0 ? '🥇 ' : ''}{label(key)}{isGoat(key) ? ' 🐐' : ''}</span>
            <span className={i === 0 ? 'text-teamA font-bold text-2xl' : 'text-bg-3'}>{score}</span>
          </motion.div>
        ))}
      </div>

      {goats.length > 0 && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }}
          className="text-center">
          <p className="text-5xl">🐐🐐🐐</p>
          <p className="text-danger text-2xl font-bold mt-2">КОЗЁЛ!</p>
          <p className="text-bg-3">{goats.map(label).join(', ')} — жодного очка за матч</p>
        </motion.div>
      )}

      <div className="flex gap-4">
        <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}
          onClick={() => send({ type: 'create_room', hostName: '', settings: gameState.settings } as never)}
          className="bg-teamA text-bg rounded-2xl px-6 py-3 text-xl font-bold">
          Реванш 🔄
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}
          onClick={() => window.location.reload()}
          className="bg-bg-2 border border-bg-3 rounded-2xl px-6 py-3 text-xl">
          В меню
        </motion.button>
      </div>
    </motion.div>
  );
}
