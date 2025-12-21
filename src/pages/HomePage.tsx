import { Link } from 'react-router-dom';
import GameCard from '../components/GameCard';

// 게임 목록 데이터 (추후 확장)
const games = [
  {
    id: 'brain-touch',
    title: '🧠 Brain Touch',
    description: '빠른 터치로 두뇌를 깨워보세요!',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'speed-math',
    title: '🔢 스피드 계산',
    description: '20문제 사칙연산을 최대한 빠르게!',
    color: 'from-green-500 to-teal-500',
  },
  {
    id: 'math-flight',
    title: '🚀 매스 플라이트',
    description: '운석을 피하며 중간값을 찾아라!',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'block-sum',
    title: '🧱 블록셈',
    description: '블록을 빼서 목표 숫자를 맞춰라!',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'number-balloon',
    title: '🎈 숫자풍선',
    description: '작은 숫자부터 순서대로 터뜨려라!',
    color: 'from-pink-400 to-rose-500',
  },
];

export default function HomePage() {
  return (
    <div className="w-full h-full flex flex-col bg-toss-black">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-toss-gray-600">
        <h1 className="text-xl font-bold">🧮 브레인 터치 - 계산편</h1>
        <Link to="/ranking" className="text-toss-blue text-sm font-medium">
          랭킹
        </Link>
      </header>

      {/* 게임 목록 */}
      <main className="flex-1 overflow-y-auto p-5">
        <h2 className="text-lg font-semibold text-toss-gray-200 mb-4">게임 선택</h2>

        <div className="grid gap-4">
          {games.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>

        {/* 빈 상태 */}
        {games.length === 0 && (
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
