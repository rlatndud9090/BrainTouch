/**
 * 브레인터치 공통 UI 유틸리티
 */

import Phaser from 'phaser';
import { BASE_COLORS } from './colors';
import { FONTS } from './constants';

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
 * 공통 버튼 생성 (둥근 모서리 지원)
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
    triggerOnPointerDown?: boolean;
    borderRadius?: number; // 둥근 모서리 (기본값 25)
  } = {}
): Phaser.GameObjects.Container {
  const {
    bgColor = BASE_COLORS.SUCCESS,
    hoverColor = 0x3dbb92,
    textColor = BASE_COLORS.TEXT_PRIMARY,
    width = 200,
    height = 50,
    fontSize = '20px',
    triggerOnPointerDown = false,
    borderRadius = 25, // 기본적으로 둥글게
  } = options;

  const container = scene.add.container(x, y);

  // 둥근 모서리 버튼 배경 (Graphics 사용)
  const bg = scene.add.graphics();
  bg.fillStyle(bgColor, 1);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);

  // 인터랙션용 히트 영역 (투명 사각형)
  const hitArea = scene.add
    .rectangle(0, 0, width, height, 0x000000, 0)
    .setInteractive({ useHandCursor: true });

  // 버튼 텍스트
  const text = scene.add
    .text(0, 0, label, {
      fontSize,
      fontFamily: 'Pretendard, sans-serif',
      color: textColor,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  container.add([bg, hitArea, text]);

  // 배경 다시 그리기 함수
  const redrawBg = (color: number) => {
    bg.clear();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
  };

  // 호버 효과
  hitArea.on('pointerover', () => {
    redrawBg(hoverColor);
  });

  hitArea.on('pointerout', () => {
    redrawBg(bgColor);
  });

  // 클릭 효과
  hitArea.on('pointerdown', () => {
    if (triggerOnPointerDown) {
      onClick();
    }

    scene.tweens.add({
      targets: container,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 50,
      yoyo: true,
      onComplete: () => {
        if (!triggerOnPointerDown) {
          onClick();
        }
      },
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
      fontFamily: FONTS.NUMBER,
      color,
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
 * 게임 시작 화면 표시
 * - 게임 설명 표시 후 터치하면 카운트다운 → 게임 시작
 */
export function showStartScreen(
  scene: Phaser.Scene,
  options: {
    title: string; // 메인 설명 (예: "🎯 숫자만큼 터치하세요!")
    subtitle?: string; // 부가 설명 (예: "빈 곳을 터치하면 하트가 줄어요")
    onStart: () => void; // 카운트다운 후 실행될 콜백
    titleColor?: string;
    subtitleColor?: string;
  }
): void {
  const { width, height } = scene.scale;
  const {
    title,
    subtitle,
    onStart,
    titleColor = BASE_COLORS.TEXT_PRIMARY,
    subtitleColor = BASE_COLORS.TEXT_SECONDARY,
  } = options;

  const elements: Phaser.GameObjects.GameObject[] = [];

  // 메인 설명
  const titleText = scene.add
    .text(width / 2, height / 2 - 60, title, {
      fontSize: '24px',
      fontFamily: 'Pretendard, sans-serif',
      color: titleColor,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width * 0.85 },
    })
    .setOrigin(0.5);
  elements.push(titleText);

  // 부가 설명 (있으면)
  if (subtitle) {
    const subtitleText = scene.add
      .text(width / 2, height / 2, subtitle, {
        fontSize: '16px',
        fontFamily: 'Pretendard, sans-serif',
        color: subtitleColor,
        align: 'center',
        wordWrap: { width: width * 0.85 },
      })
      .setOrigin(0.5);
    elements.push(subtitleText);
  }

  // 터치하여 시작 텍스트
  const startText = scene.add
    .text(width / 2, height / 2 + 80, '👆 터치하여 시작', {
      fontSize: '20px',
      fontFamily: 'Pretendard, sans-serif',
      color: '#4ecca3',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  elements.push(startText);

  // 깜빡임 효과
  scene.tweens.add({
    targets: startText,
    alpha: 0.5,
    duration: 600,
    yoyo: true,
    repeat: -1,
  });

  // 터치하여 시작 (폰트는 이미 React 레벨에서 로딩 완료됨)
  scene.input.once('pointerdown', () => {
    // 모든 요소 제거
    elements.forEach((el) => el.destroy());

    // 카운트다운 후 게임 시작
    playCountdown(scene, onStart);
  });
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

/**
 * 짧게 사라지는 토스트 메시지 표시
 */
export function showToast(
  scene: Phaser.Scene,
  message: string,
  options: {
    x?: number;
    y?: number;
    color?: string;
    durationMs?: number;
    fontSize?: string;
  } = {}
): void {
  const { width, height } = scene.scale;
  const {
    x = width / 2,
    y = height * 0.94,
    color = '#4ecca3',
    durationMs = 1200,
    fontSize = '16px',
  } = options;

  const toast = scene.add
    .text(x, y, message, {
      fontSize,
      fontFamily: 'Pretendard, sans-serif',
      color,
      fontStyle: 'bold',
      align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(999)
    .setAlpha(0);

  scene.tweens.add({
    targets: toast,
    alpha: 1,
    duration: 120,
    onComplete: () => {
      scene.time.delayedCall(durationMs, () => {
        scene.tweens.add({
          targets: toast,
          alpha: 0,
          duration: 180,
          onComplete: () => toast.destroy(),
        });
      });
    },
  });
}
