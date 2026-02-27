import GameCard from '../components/GameCard';
import { GAME_CATALOG } from '../shared/gameCatalog';

export default function HomePage() {
  return (
    <div className="w-full h-full flex flex-col bg-toss-black">
      {/* 헤더 */}
      <header className="flex items-center px-5 py-4 border-b border-toss-gray-600">
        <h1 className="text-xl font-bold">
          <span className="font-game text-2xl">🧮</span> 브레인 터치 - 계산편
        </h1>
      </header>

      {/* 폰트 프리로드용 숨겨진 텍스트 (Cherry Bomb One) */}
      <span className="font-game absolute opacity-0 pointer-events-none" aria-hidden="true">
        0123456789
      </span>

      {/* 게임 목록 */}
      <main className="flex-1 overflow-y-auto p-5">
        <h2 className="text-lg font-semibold text-toss-gray-200 mb-4">게임 선택</h2>

        <div className="grid gap-4">
          {GAME_CATALOG.map((game) => (
            <GameCard
              key={game.id}
              id={game.id}
              title={`${game.card.emoji} ${game.title}`}
              description={game.card.description}
              color={game.card.gradient}
            />
          ))}
        </div>

        {/* 빈 상태 */}
        {GAME_CATALOG.length === 0 && (
          <div className="flex items-center justify-center h-40 text-toss-gray-400">
            게임을 준비 중입니다...
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="px-5 py-3 text-center text-xs text-toss-gray-400 border-t border-toss-gray-600">
        © 2025 브레인 터치
      </footer>
    </div>
  );
}
