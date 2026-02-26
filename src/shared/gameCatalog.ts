export interface GameCatalogItem {
  id: string;
  title: string;
  description: string;
  card: {
    emoji: string;
    description: string;
    gradient: string;
  };
}

export const GAME_CATALOG: readonly GameCatalogItem[] = [
  {
    id: 'brain-touch',
    title: '몸풀기 터치',
    description: '터치 반응 속도로 점수를 올리는 게임',
    card: {
      emoji: '🧠',
      description: '빠른 터치로 두뇌를 깨워보세요!',
      gradient: 'from-purple-500 to-pink-500',
    },
  },
  {
    id: 'speed-math',
    title: '스피드 계산',
    description: '제한 시간 안에 연산 문제를 빠르게 해결',
    card: {
      emoji: '🔢',
      description: '20문제 사칙연산을 최대한 빠르게!',
      gradient: 'from-green-500 to-teal-500',
    },
  },
  {
    id: 'math-flight',
    title: '중간값 비행',
    description: '운석을 피하며 중간값을 찾아라!',
    card: {
      emoji: '🚀',
      description: '운석을 피하며 중간값을 찾아라!',
      gradient: 'from-cyan-500 to-blue-500',
    },
  },
  {
    id: 'block-sum',
    title: '블록셈',
    description: '숫자 블록을 더해 목표값을 만드는 퍼즐',
    card: {
      emoji: '🧱',
      description: '블록을 빼서 목표 숫자를 맞춰라!',
      gradient: 'from-yellow-500 to-orange-500',
    },
  },
  {
    id: 'number-balloon',
    title: '숫자풍선',
    description: '순서대로 숫자를 찾아 터뜨리는 게임',
    card: {
      emoji: '🎈',
      description: '작은 숫자부터 순서대로 터뜨려라!',
      gradient: 'from-pink-400 to-rose-500',
    },
  },
];

export function getGameCatalogItem(gameId: string): GameCatalogItem | undefined {
  return GAME_CATALOG.find((game) => game.id === gameId);
}
