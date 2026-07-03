import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useEffect } from 'react';

export default function ErrorToast() {
  const { error, clearError } = useGameStore();
  useEffect(() => { if (error) { const t = setTimeout(clearError, 3500); return () => clearTimeout(t); } }, [error, clearError]);
  return (
    <AnimatePresence>
      {error && (
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-danger text-white rounded-2xl px-6 py-3 text-lg font-semibold shadow-lg z-[100] max-w-sm text-center"
          onClick={clearError}
        >
          ⚠️ {error}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
