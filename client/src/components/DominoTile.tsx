import { motion } from 'framer-motion';

// 3x3 grid: [TL,TC,TR, ML,MC,MR, BL,BC,BR]
const PIPS: Record<number, boolean[]> = {
  0: [false,false,false, false,false,false, false,false,false],
  1: [false,false,false, false,true, false, false,false,false],
  2: [false,false,true,  false,false,false, true, false,false],
  3: [false,false,true,  false,true, false, true, false,false],
  4: [true, false,true,  false,false,false, true, false,true ],
  5: [true, false,true,  false,true, false, true, false,true ],
  6: [true, false,true,  true, false,true,  true, false,true ],
};

export function DominoHalf({ n, size = 28 }: { n: number; size?: number }) {
  const grid = PIPS[n] ?? PIPS[0];
  const pipSize = Math.max(4, Math.round(size * 0.18));
  return (
    <div
      style={{ width: size, height: size }}
      className="grid grid-cols-3 grid-rows-3 p-[10%] gap-[6%]"
    >
      {grid.map((on, i) => (
        <div key={i} className="flex items-center justify-center">
          {on && (
            <div
              style={{ width: pipSize, height: pipSize }}
              className="rounded-full bg-tile-dot"
            />
          )}
        </div>
      ))}
    </div>
  );
}

type TileProps = {
  left: number;
  right: number;
  isDouble?: boolean;
  /** 'normal' = left half is shown first; 'flipped' = right half shown first */
  orientation?: 'normal' | 'flipped';
  size?: number;
  selected?: boolean;
  playable?: boolean;
  animate?: boolean;
  onClick?: () => void;
};

export function DominoTileCard({
  left, right, isDouble, orientation = 'normal',
  size = 28, selected, playable = true, animate = false, onClick,
}: TileProps) {
  const a = orientation === 'normal' ? left : right;
  const b = orientation === 'normal' ? right : left;

  const tileEl = isDouble ? (
    // Double: vertical layout (perpendicular to chain)
    <div
      style={{ width: size, borderRadius: size * 0.15 }}
      className={`flex flex-col bg-tile-bg border border-tile-border shadow-tile select-none ${
        selected ? 'ring-2 ring-teamA ring-offset-1 ring-offset-felt' : ''
      }`}
    >
      <DominoHalf n={a} size={size} />
      <div className="h-px w-4/5 mx-auto bg-tile-border" />
      <DominoHalf n={b} size={size} />
    </div>
  ) : (
    // Normal: horizontal layout
    <div
      style={{ height: size, borderRadius: size * 0.15 }}
      className={`flex flex-row bg-tile-bg border border-tile-border shadow-tile select-none ${
        selected ? 'ring-2 ring-teamA ring-offset-1 ring-offset-felt' : ''
      }`}
    >
      <DominoHalf n={a} size={size} />
      <div className="w-px h-4/5 my-auto bg-tile-border" />
      <DominoHalf n={b} size={size} />
    </div>
  );

  if (!onClick) {
    return animate ? (
      <motion.div initial={{ y: -12, opacity: 0, scale: 0.85 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 24 }}>
        {tileEl}
      </motion.div>
    ) : tileEl;
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={playable ? { y: -5, scale: 1.06 } : {}}
      whileTap={playable ? { scale: 0.93 } : {}}
      className={!playable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    >
      {animate ? (
        <motion.div initial={{ y: -12, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}>
          {tileEl}
        </motion.div>
      ) : tileEl}
    </motion.button>
  );
}

/** Face-down tile (bazaar) */
export function DominoBack({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{ width: size * 2, height: size, borderRadius: size * 0.15 }}
      className="bg-tile-back border border-felt-light shadow-tile flex items-center justify-center"
    >
      <div className="w-3/4 h-3/4 border border-felt-light rounded opacity-40" />
    </div>
  );
}
