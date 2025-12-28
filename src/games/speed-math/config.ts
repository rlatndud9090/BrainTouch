import Phaser from 'phaser';
import { ModeSelectScene } from './scenes/ModeSelectScene';
import { GameScene } from './scenes/GameScene';
import { GameSceneHW } from './scenes/GameSceneHW';
import { ResultScene } from './scenes/ResultScene';
import { GAME_LAYOUT } from '../../shared/constants';

export interface GameResult {
  totalTime: number; // 총 소요 시간 (ms)
}

export function getGameConfig(
  parent: HTMLElement,
  onGameOver?: (result: GameResult) => void
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1a1a2e',
    scale: {
      mode: Phaser.Scale.FIT,
      width: Math.min(parent.clientWidth, GAME_LAYOUT.MAX_WIDTH),
      height: parent.clientHeight,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [ModeSelectScene, GameScene, GameSceneHW, ResultScene],
    input: {
      activePointers: 3,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: true,
    },
    callbacks: {
      postBoot: (game) => {
        // React와 Phaser 간 통신을 위한 이벤트 리스너
        game.events.on('gameOver', (result: GameResult) => {
          onGameOver?.(result);
        });
      },
    },
  };
}
