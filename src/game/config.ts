import Phaser from 'phaser';
import { MainScene } from '../scenes/MainScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL 우선, 불가시 Canvas로 폴백
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.RESIZE, // 반응형 스케일링
    width: window.innerWidth,
    height: window.innerHeight,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    activePointers: 3, // 멀티터치 지원
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
};

