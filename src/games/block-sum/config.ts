import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { createHighResScale } from '../../shared/constants';

export interface GameResult {
  score: number; // 총 점수
  clearedRounds: number; // 클리어한 라운드 수
  maxDifficulty: string; // 도달한 최고 난이도
}

export function getGameConfig(
  parent: HTMLElement,
  onGameOver?: (result: GameResult) => void
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1a1a2e',
    scale: createHighResScale(parent.clientWidth, parent.clientHeight),
    scene: [GameScene, ResultScene],
    input: {
      activePointers: 1,
      touch: {
        capture: true,
      },
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
