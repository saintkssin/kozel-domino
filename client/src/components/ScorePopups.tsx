import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useEffect } from 'react';

export default function ScorePopups() {
  const { scorePopups, dismissPopup } = useGameStore();
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-50">
      <AnimatePresence>
        {scorePopups.map(p => (
          <ScorePop key={p.id} delta={p.delta} onDone={() => dismissPopup(p.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ScorePop({ delta, onDone }: { delta: number; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1200); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, y: 0 }}
      animate={{ scale: [0.5, 1.4, 1.1], opacity: [0, 1, 1, 0], y: [-0, -20, -40] }}
      transition={{ duration: 1.2 }}
      className="text-5xl font-bold text-teamA drop-shadow-[0_0_16px_rgba(245,166,35,0.9)]"
    >
      +{delta}
    </motion.div>
  );
}
