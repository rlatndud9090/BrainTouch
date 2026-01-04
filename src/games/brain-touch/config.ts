import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { ResultScene } from './scenes/ResultScene';
import { createHighResScale } from '../../shared/constants';

export function getGameConfig(
  parent: HTMLElement,
  onGameOver?: (score: number) => void
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1a1a2e',
    scale: createHighResScale(parent.clientWidth, parent.clientHeight),
    scene: [MainScene, ResultScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    input: {
      activePointers: 3,
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
        // React와 Phaser 간 통신을 위한 이벤트 리스너
        game.events.on('gameOver', (score: number) => {
          onGameOver?.(score);
        });
      },
    },
  };
}

