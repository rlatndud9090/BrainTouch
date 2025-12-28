import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { GAME_LAYOUT } from '../../shared/constants';

export interface GameResult {
  totalScore: number;
  survivalTime: number;
  turnCount: number;
}

export function getGameConfig(
  parent: HTMLElement,
  onGameOver?: (result: GameResult) => void
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0a0a1a',
    scale: {
      mode: Phaser.Scale.FIT,
      width: Math.min(parent.clientWidth, GAME_LAYOUT.MAX_WIDTH),
      height: parent.clientHeight,
      autoCenter: Phaser.Scale.CENTER_BOTH,
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
