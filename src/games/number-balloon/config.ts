import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { GAME_LAYOUT } from '../../shared/constants';

export interface GameResult {
  score: number; // 총 점수
  maxRound: number; // 도달한 최고 라운드
  totalPopped: number; // 터뜨린 풍선 수
}

export function getGameConfig(
  parent: HTMLElement,
  onGameOver?: (result: GameResult) => void
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#87CEEB', // 하늘색 배경
    scale: {
      mode: Phaser.Scale.FIT,
      width: Math.min(parent.clientWidth, GAME_LAYOUT.MAX_WIDTH),
      height: parent.clientHeight,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 0 }, // 중력 없음 (풍선이 둥둥 떠다니게)
        debug: false, // 디버그 시 true로 변경
      },
    },
    scene: [GameScene, ResultScene],
    input: {
      activePointers: 1,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: true,
    },
    callbacks: {
      postBoot: (game) => {
        game.events.on('gameOver', (result: GameResult) => {
          onGameOver?.(result);
        });
      },
    },
  };
}
