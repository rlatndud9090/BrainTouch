import { Link } from 'react-router-dom';

// 임시 랭킹 데이터
const rankings = [
  { rank: 1, name: '플레이어1', score: 9999, isMe: false },
  { rank: 2, name: '플레이어2', score: 8500, isMe: false },
  { rank: 3, name: '플레이어3', score: 7200, isMe: false },
  { rank: 4, name: '나', score: 5000, isMe: true },
  { rank: 5, name: '플레이어5', score: 4800, isMe: false },
];

export default function RankingPage() {
  return (
    <div className="w-full h-full flex flex-col bg-toss-black">
      {/* 헤더 */}
      <header className="flex items-center px-4 py-3 border-b border-toss-gray-600">
        <Link
          to="/"
          className="p-2 -ml-2 text-white hover:bg-toss-gray-600 rounded-lg transition-colors"
        >
          ← 뒤로
        </Link>
        <h1 className="flex-1 text-center font-semibold">🏆 랭킹</h1>
        <div className="w-10" />
      </header>

      {/* 랭킹 목록 */}
      <main className="flex-1 overflow-y-auto p-5">
        <div className="space-y-3">
          {rankings.map((item) => (
            <div
              key={item.rank}
              className={`flex items-center p-4 rounded-xl ${
                item.isMe 
                  ? 'bg-toss-blue/20 border border-toss-blue' 
                  : 'bg-toss-gray-600'
              }`}
            >
              {/* 순위 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                item.rank === 1 ? 'bg-yellow-500 text-black' :
                item.rank === 2 ? 'bg-gray-300 text-black' :
                item.rank === 3 ? 'bg-amber-600 text-white' :
                'bg-toss-gray-500 text-white'
              }`}>
                {item.rank}
              </div>

              {/* 이름 */}
              <span className={`flex-1 ml-4 font-medium ${
                item.isMe ? 'text-toss-blue' : 'text-white'
              }`}>
                {item.name}
                {item.isMe && <span className="ml-2 text-xs">(나)</span>}
              </span>

              {/* 점수 */}
              <span className="text-toss-gray-200 font-mono">
                {item.score.toLocaleString()}점
              </span>
            </div>
          ))}
        </div>

        {/* 토스 연동 안내 */}
        <div className="mt-8 p-4 bg-toss-gray-600 rounded-xl text-center">
          <p className="text-toss-gray-300 text-sm">
            토스 계정 연동 시 전체 랭킹 확인 가능
          </p>
          <button className="mt-3 px-6 py-2 bg-toss-blue text-white font-medium rounded-lg">
            토스 연동하기
          </button>
        </div>
      </main>
    </div>
  );
}

