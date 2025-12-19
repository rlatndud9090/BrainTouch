/**
 * 브레인터치 공통 UI 유틸리티
 */

import Phaser from 'phaser';
import { BASE_COLORS } from './colors';

/**
 * 그라데이션 배경 생성
 */
export function createGradientBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
  topColor: number = BASE_COLORS.BG_PRIMARY,
  bottomColor: number = BASE_COLORS.BG_SECONDARY
): Phaser.GameObjects.Graphics {
  const bg = scene.add.graphics();
  bg.fillGradientStyle(topColor, topColor, bottomColor, bottomColor);
  bg.fillRect(0, 0, width, height);
  return bg;
}

/**
 * 단색 배경 생성
 */
export function createSolidBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
  color: number = BASE_COLORS.BG_DARK
): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(0, 0, width, height, color).setOrigin(0, 0);
}

/**
 * 공통 버튼 생성
 */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: {
    bgColor?: number;
    hoverColor?: number;
    textColor?: string;
    width?: number;
    height?: number;
    fontSize?: string;
  } = {}
): Phaser.GameObjects.Container {
  const {
    bgColor = BASE_COLORS.SUCCESS,
    hoverColor = 0x3dbb92,
    textColor = BASE_COLORS.TEXT_PRIMARY,
    width = 200,
    height = 50,
    fontSize = '20px',
  } = options;

  const container = scene.add.container(x, y);

  // 버튼 배경
  const bg = scene.add
    .rectangle(0, 0, width, height, bgColor, 1)
    .setStrokeStyle(2, BASE_COLORS.STROKE);
  bg.setInteractive({ useHandCursor: true });

  // 버튼 텍스트
  const text = scene.add
    .text(0, 0, label, {
      fontSize,
      fontFamily: 'Pretendard, sans-serif',
      color: textColor,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  container.add([bg, text]);

  // 호버 효과
  bg.on('pointerover', () => {
    bg.setFillStyle(hoverColor);
  });

  bg.on('pointerout', () => {
    bg.setFillStyle(bgColor);
  });

  // 클릭 효과
  bg.on('pointerdown', () => {
    scene.tweens.add({
      targets: container,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 50,
      yoyo: true,
      onComplete: onClick,
    });
  });

  return container;
}

/**
 * 3-2-1 카운트다운 애니메이션
 */
export function playCountdown(
  scene: Phaser.Scene,
  onComplete: () => void,
  options: {
    x?: number;
    y?: number;
    fontSize?: string;
    color?: string;
  } = {}
): void {
  const { width, height } = scene.scale;
  const {
    x = width / 2,
    y = height / 2,
    fontSize = '120px',
    color = BASE_COLORS.TEXT_PRIMARY,
  } = options;

  const countdownText = scene.add
    .text(x, y, '3', {
      fontSize,
      fontFamily: 'Pretendard, sans-serif',
      color,
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setAlpha(0);

  const counts = ['3', '2', '1', 'GO!'];
  let index = 0;

  const showNext = () => {
    if (index >= counts.length) {
      countdownText.destroy();
      onComplete();
      return;
    }

    countdownText.setText(counts[index]);
    countdownText.setAlpha(1);
    countdownText.setScale(1.5);

    scene.tweens.add({
      targets: countdownText,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.time.delayedCall(index < 3 ? 400 : 200, () => {
          scene.tweens.add({
            targets: countdownText,
            alpha: 0,
            duration: 150,
            onComplete: () => {
              index++;
              showNext();
            },
          });
        });
      },
    });
  };

  showNext();
}

/**
 * 시간 포맷팅 (ms → "X분 Y초" 또는 "X.XX초")
 */
export function formatTime(ms: number, showDecimals = false): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (minutes > 0) {
    return `${minutes}분 ${seconds}초`;
  }

  if (showDecimals) {
    return `${totalSeconds.toFixed(2)}초`;
  }

  return `${seconds}초`;
}
