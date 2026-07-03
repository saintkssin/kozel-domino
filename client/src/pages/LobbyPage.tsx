import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { Player } from '@kozel/shared';

export default function LobbyPage() {
  const { gameState, myPlayerId, send } = useGameStore();
  if (!gameState) return null;

  const { roomId, players, settings } = gameState;
  const me = players.find(p => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const [editName, setEditName] = useState(me?.name ?? '');

  function copyId() { navigator.clipboard.writeText(roomId); }

  function saveName() {
    if (editName.trim()) {
      send({ type: 'set_name', name: editName.trim() });
      localStorage.setItem('kozel_name', editName.trim());
    }
  }

  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');
  const allReady = players.length === settings.playerCount && players.every(p => p.ready);

  return (
    <div className="flex flex-col items-center min-h-screen gap-6 px-4 py-10">
      {/* Room ID */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-bg-3 text-lg uppercase tracking-widest">ID Кімнати</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-5xl font-bold text-teamA tracking-widest">{roomId}</span>
          <button onClick={copyId}
            className="bg-bg-2 border border-bg-3 rounded-xl px-3 py-1 text-sm hover:border-teamA transition-colors">
            Копіювати
          </button>
        </div>
        <p className="text-bg-3 text-sm mt-1">
          {settings.mode === 'teams' ? 'Команда на команду' : 'Кожен за себе'}
          {' · '}До {settings.targetScore} очок
          {' · '}{settings.bazaarEnabled ? 'Базар увімк.' : 'Без базару'}
        </p>
      </motion.div>

      {/* My name */}
      <div className="flex gap-2 items-center">
        <input
          className="bg-bg-2 border border-bg-3 rounded-xl px-4 py-2 text-lg focus:border-teamA outline-none"
          value={editName}
          maxLength={16}
          onChange={e => setEditName(e.target.value)}
          onBlur={saveName}
          onKeyDown={e => e.key === 'Enter' && saveName()}
        />
        <span className="text-bg-3 text-sm">← твоє ім'я</span>
      </div>

      {/* Players */}
      {settings.mode === 'teams' ? (
        <div className="flex gap-8 w-full max-w-xl">
          <TeamZone label="Команда A 🟡" color="teamA" players={teamA}
            onAssign={isHost ? (pid) => send({ type: 'assign_team', playerId: pid, team: 'A' }) : undefined}
          />
          <TeamZone label="Команда B 💜" color="teamB" players={teamB}
            onAssign={isHost ? (pid) => send({ type: 'assign_team', playerId: pid, team: 'B' }) : undefined}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {players.map(p => <PlayerCard key={p.id} player={p} isSelf={p.id === myPlayerId} />)}
          {Array.from({ length: settings.playerCount - players.length }).map((_, i) => (
            <EmptySlot key={i} />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-72 mt-4">
        <motion.button
          whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}
          onClick={() => send({ type: 'toggle_ready' })}
          className={`rounded-2xl px-6 py-3 text-xl font-semibold transition-colors ${
            me?.ready ? 'bg-bg-2 border-2 border-teamA text-teamA' : 'bg-teamB text-white'
          }`}
        >
          {me?.ready ? '✅ Готовий' : 'Готовий?'}
        </motion.button>

        {isHost && (
          <motion.button
            whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}
            disabled={!allReady}
            onClick={() => send({ type: 'start_game' })}
            className="bg-teamA text-bg rounded-2xl px-6 py-3 text-xl font-semibold disabled:opacity-40 transition-opacity"
          >
            🎲 Почати гру
          </motion.button>
        )}
      </div>
    </div>
  );
}

function TeamZone({ label, color, players, onAssign }:
  { label: string; color: 'teamA' | 'teamB'; players: Player[]; onAssign?: (id: string) => void }) {
  const borderCls = color === 'teamA' ? 'border-teamA' : 'border-teamB';
  const textCls = color === 'teamA' ? 'text-teamA' : 'text-teamB';
  return (
    <div className={`flex-1 border-2 ${borderCls} rounded-2xl p-4`}>
      <p className={`${textCls} font-semibold text-lg mb-3`}>{label}</p>
      {players.map(p => <PlayerCard key={p.id} player={p} isSelf={false} />)}
    </div>
  );
}

function PlayerCard({ player, isSelf }: { player: Player; isSelf: boolean }) {
  return (
    <div className={`flex items-center gap-3 bg-bg-2 rounded-xl px-4 py-2 ${isSelf ? 'border border-teamA' : ''}`}>
      <span className="text-2xl">{player.isHost ? '👑' : '👤'}</span>
      <span className="text-lg flex-1">{player.name}{isSelf ? ' (ти)' : ''}</span>
      {player.ready && <span className="text-teamA text-sm">✅</span>}
      {!player.connected && <span className="text-danger text-sm">⚡ відключ.</span>}
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="flex items-center gap-3 bg-bg-2 rounded-xl px-4 py-2 opacity-40 border border-dashed border-bg-3">
      <span className="text-2xl">⏳</span>
      <span className="text-lg">Очікуємо...</span>
    </div>
  );
}
