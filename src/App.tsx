import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import RankingPage from './pages/RankingPage';

function App() {
  return (
    <div className="w-full h-full">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/ranking" element={<RankingPage />} />
      </Routes>
    </div>
  );
}

export default App;

