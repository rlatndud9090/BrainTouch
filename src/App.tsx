import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';

function LegacyShareRedirect() {
  const { gameId } = useParams<{ gameId: string }>();
  const targetGameId = gameId ?? 'brain-touch';

  return <Navigate to={`/game/${encodeURIComponent(targetGameId)}`} replace />;
}

function App() {
  return (
    <div className="w-full h-full">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/share/:gameId" element={<LegacyShareRedirect />} />
      </Routes>
    </div>
  );
}

export default App;
