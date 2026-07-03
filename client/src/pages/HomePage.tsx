import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_SETTINGS, RoomSettings } from '@kozel/shared';

export default function HomePage() {
  const { send } = useGameStore();
  const [name, setName] = useState(() => localStorage.getItem('kozel_name') || '');
  const [joinId, setJoinId] = useState('');
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [settings, setSettings] = useState<RoomSettings>({ ...DEFAULT_SETTINGS });

  function saveName(v: string) { setName(v); localStorage.setItem('kozel_name', v); }

  function create() {
    if (!name.trim()) return;
    send({ type: 'create_room', hostName: name.trim(), settings });
  }

  function join() {
    if (!name.trim() || !joinId.trim()) return;
    send({ type: 'join_room', roomId: joinId.trim().toUpperCase(), name: name.trim() });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-4">
      <motion.div
        initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <h1 className="text-7xl font-bold tracking-wider text-teamA drop-shadow-[0_0_24px_rgba(245,166,35,0.7)]">
          🐐 GOAT
        </h1>
        <p className="text-bg-3 text-xl mt-2 tracking-widest uppercase">Domino online</p>
      </motion.div>

      <input
        className="bg-bg-2 border-2 border-bg-3 rounded-2xl px-5 py-3 text-xl text-center w-72 outline-none focus:border-teamA transition-colors"
        placeholder="Your name"
        maxLength={16}
        value={name}
        onChange={e => saveName(e.target.value)}
      />

      {mode === 'home' && (
        <motion.div className="flex flex-col gap-4 w-72" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Btn onClick={() => setMode('create')} color="teamA">Create room</Btn>
          <Btn onClick={() => setMode('join')} color="teamB">Join by ID</Btn>
        </motion.div>
      )}

      {mode === 'create' && (
        <motion.div className="flex flex-col gap-4 w-80" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <label className="flex justify-between items-center text-lg">
            Players
            <select
              className="bg-bg-2 border border-bg-3 rounded-xl px-3 py-1"
              value={settings.playerCount}
              onChange={e => {
                const pc = Number(e.target.value) as 2 | 3 | 4;
                setSettings(s => ({
                  ...s, playerCount: pc,
                  mode: pc === 3 ? 'ffa' : s.mode,
                }));
              }}
            >
              {[2, 3, 4].map(n => <option key={n}>{n}</option>)}
            </select>
          </label>

          <label className="flex justify-between items-center text-lg">
            Mode
            <select
              disabled={settings.playerCount === 3}
              className="bg-bg-2 border border-bg-3 rounded-xl px-3 py-1 disabled:opacity-40"
              value={settings.mode}
              onChange={e => setSettings(s => ({ ...s, mode: e.target.value as 'teams' | 'ffa' }))}
            >
              <option value="teams">Teams</option>
              <option value="ffa">Free for all</option>
            </select>
          </label>

          <label className="flex justify-between items-center text-lg">
            Target score
            <div className="flex gap-2 items-center">
              {[61, 81, 121].map(n => (
                <button key={n}
                  onClick={() => setSettings(s => ({ ...s, targetScore: n }))}
                  className={`px-2 py-0.5 rounded-lg text-sm border ${settings.targetScore === n ? 'border-teamA text-teamA' : 'border-bg-3 text-bg-3'}`}
                >{n}</button>
              ))}
              <input
                type="number" min={21} max={301}
                className="bg-bg-2 border border-bg-3 rounded-xl px-2 py-1 w-20 text-center"
                value={settings.targetScore}
                onChange={e => setSettings(s => ({ ...s, targetScore: Number(e.target.value) }))}
              />
            </div>
          </label>

          <label className="flex justify-between items-center text-lg">
            Boneyard
            <input type="checkbox" className="w-5 h-5 accent-teamA"
              checked={settings.bazaarEnabled}
              onChange={e => setSettings(s => ({ ...s, bazaarEnabled: e.target.checked }))}
            />
          </label>

          <Btn onClick={create} color="teamA">Create 🎲</Btn>
          <Btn onClick={() => setMode('home')} color="none">← Back</Btn>
        </motion.div>
      )}

      {mode === 'join' && (
        <motion.div className="flex flex-col gap-4 w-72" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <input
            className="bg-bg-2 border-2 border-bg-3 rounded-2xl px-5 py-3 text-2xl text-center tracking-widest uppercase w-full outline-none focus:border-teamB transition-colors"
            placeholder="ROOM ID"
            maxLength={5}
            value={joinId}
            onChange={e => setJoinId(e.target.value.toUpperCase())}
          />
          <Btn onClick={join} color="teamB">Join 🚪</Btn>
          <Btn onClick={() => setMode('home')} color="none">← Back</Btn>
        </motion.div>
      )}
    </div>
  );
}

function Btn({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color: 'teamA' | 'teamB' | 'none' }) {
  const cls = color === 'teamA' ? 'bg-teamA text-bg hover:bg-teamA-light'
    : color === 'teamB' ? 'bg-teamB text-white hover:bg-teamB-light'
    : 'border border-bg-3 text-bg-3 hover:text-white';
  return (
    <motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className={`${cls} rounded-2xl px-6 py-3 text-xl font-semibold transition-colors w-full`}
    >{children}</motion.button>
  );
}
