import { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import ErrorToast from './components/ErrorToast';
import ScorePopups from './components/ScorePopups';

export default function App() {
  const { connect, gameState, showMenu } = useGameStore();

  useEffect(() => { connect(); }, [connect]);

  const page = !gameState || showMenu ? 'home'
    : gameState.phase === 'lobby' ? 'lobby'
    : 'game';

  return (
    <div className="min-h-screen font-fredoka">
      {page === 'home'  && <HomePage />}
      {page === 'lobby' && <LobbyPage />}
      {page === 'game'  && <GamePage />}
      <ErrorToast />
      <ScorePopups />
    </div>
  );
}
