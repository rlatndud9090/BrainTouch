import { useParams, useNavigate } from 'react-router-dom';
import PhaserGame from '../components/PhaserGame';
import { getGameCatalogItem } from '../shared/gameCatalog';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const resolvedGameId = gameId && getGameCatalogItem(gameId) ? gameId : 'brain-touch';
  const game = getGameCatalogItem(resolvedGameId);

  const handleBack = () => {
    navigate('/');
  };

  const handleGameOver = () => {
    // 게임 종료 시 홈으로 이동
    navigate('/');
  };

  return (
    <div className="w-full h-full flex flex-col bg-toss-black">
      {/* 게임 헤더 */}
      <header className="flex items-center px-4 py-3 border-b border-toss-gray-600 z-10">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 text-white hover:bg-toss-gray-600 rounded-lg transition-colors"
        >
          ← 뒤로
        </button>
        <h1 className="flex-1 text-center font-semibold">{game?.title ?? '게임'}</h1>
        <div className="w-10" /> {/* 균형을 위한 빈 공간 */}
      </header>

      {/* Phaser 게임 영역 */}
      <main className="flex-1 relative overflow-hidden">
        <PhaserGame gameId={resolvedGameId} onGameOver={handleGameOver} />
      </main>
    </div>
  );
}
