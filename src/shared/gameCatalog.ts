export interface GameCatalogItem {
  id: string;
  title: string;
  description: string;
}

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'brain-touch',
    title: 'Brain Touch',
    description: '터치 반응 속도로 점수를 올리는 게임',
  },
  {
    id: 'speed-math',
    title: '스피드 계산',
    description: '제한 시간 안에 연산 문제를 빠르게 해결',
  },
  {
    id: 'math-flight',
    title: 'Math Flight',
    description: '중간값을 찾아 운석을 피하는 게임',
  },
  {
    id: 'block-sum',
    title: '블록셈',
    description: '숫자 블록을 더해 목표값을 만드는 퍼즐',
  },
  {
    id: 'number-balloon',
    title: '숫자풍선',
    description: '순서대로 숫자를 찾아 터뜨리는 게임',
  },
];

export function getGameCatalogItem(gameId: string): GameCatalogItem | undefined {
  return GAME_CATALOG.find((game) => game.id === gameId);
}
