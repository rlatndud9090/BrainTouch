import { useParams, useNavigate } from 'react-router-dom';
import PhaserGame from '../components/PhaserGame';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  const handleGameOver = () => {
    // 게임 종료 이벤트 수신 (ResultScene에서 이동 처리)
    // 점수 저장 등 필요한 로직 추가 가능
    console.log('Game Over event received');
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
        <h1 className="flex-1 text-center font-semibold capitalize">{gameId?.replace('-', ' ')}</h1>
        <div className="w-10" /> {/* 균형을 위한 빈 공간 */}
      </header>

      {/* Phaser 게임 영역 */}
      <main className="flex-1 relative overflow-hidden">
        <PhaserGame gameId={gameId || 'brain-touch'} onGameOver={handleGameOver} />
      </main>
    </div>
  );
}
