import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';

function App() {
  return (
    <div className="w-full h-full">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/share/:gameId" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
