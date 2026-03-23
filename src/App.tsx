import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import { getGameCatalogItem } from './shared/gameCatalog';

function LegacyShareInvalidPage() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-toss-black px-6">
      <div className="w-full max-w-sm rounded-3xl border border-toss-gray-600 bg-toss-gray-700/80 p-6 text-center text-white">
        <h1 className="text-xl font-semibold">유효하지 않은 공유 링크입니다</h1>
        <p className="mt-3 text-sm text-toss-gray-300">
          예전에 복사된 링크가 잘못되었거나 더 이상 지원되지 않습니다.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-toss-blue px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

function LegacyShareRedirect() {
  const { gameId } = useParams<{ gameId: string }>();
  const targetGameId = gameId?.trim();

  if (!targetGameId || !getGameCatalogItem(targetGameId)) {
    return <LegacyShareInvalidPage />;
  }

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
