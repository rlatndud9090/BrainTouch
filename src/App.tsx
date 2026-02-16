import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import ShareLandingPage from './pages/ShareLandingPage';

function App() {
  return (
    <div className="w-full h-full">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/share/:gameId" element={<ShareLandingPage />} />
      </Routes>
    </div>
  );
}

export default App;

