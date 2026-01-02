/**
 * 브레인터치 공통 상단 UI 바
 * 모든 게임에서 통일된 상단 HUD를 제공
 */

import Phaser from 'phaser';
import { BASE_COLORS } from './colors';
import { LivesManager } from './lives';

// 상단 바 레이아웃 상수
export const TOP_BAR = {
  HEIGHT: 50, // 상단 바 높이
  PADDING_X: 16, // 좌우 패딩
  CENTER_Y: 25, // 중앙 Y 좌표 (HEIGHT / 2)
  FONT_SIZE: {
    MAIN: '22px', // 주요 요소 (점수, 시간 등)
    SUB: '14px', // 부가 요소 (라벨 등)
  },
  FONT_FAMILY: 'Pretendard, sans-serif',
} as const;

// 슬롯 위치
export type SlotPosition = 'left' | 'center' | 'right';

// 슬롯에 배치할 수 있는 요소 타입
export type SlotItemType = 'lives' | 'score' | 'time' | 'progress' | 'round' | 'text';

// 슬롯 아이템 설정
export interface SlotItemConfig {
  type: SlotItemType;
  label?: string; // 라벨 (예: "점수", "시간")
  showLabel?: boolean; // 라벨 표시 여부
  color?: string; // 텍스트 색상
  initialValue?: string | number; // 초기 값
  maxLives?: number; // lives 타입일 때 최대 목숨 수
}

// TopBar 설정
export interface TopBarConfig {
  left?: SlotItemConfig;
  center?: SlotItemConfig;
  right?: SlotItemConfig;
  showBackground?: boolean; // 배경 표시 여부
  backgroundColor?: number; // 배경 색상
  backgroundAlpha?: number; // 배경 투명도
}

// 슬롯 아이템 컨테이너
interface SlotItem {
  container: Phaser.GameObjects.Container;
  valueText?: Phaser.GameObjects.Text;
  labelText?: Phaser.GameObjects.Text;
  livesManager?: LivesManager;
  config: SlotItemConfig;
}

/**
 * TopBar 클래스
 * 게임 상단에 통일된 HUD를 제공
 */
export class TopBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background?: Phaser.GameObjects.Rectangle;
  private items: Map<SlotPosition, SlotItem> = new Map();
  private width: number;

  constructor(scene: Phaser.Scene, config: TopBarConfig) {
    this.scene = scene;
    this.width = scene.scale.width;

    // 컨테이너 생성
    this.container = scene.add.container(0, 0);
    this.container.setDepth(100); // 항상 상단에 표시

    // 배경 (선택적)
    if (config.showBackground) {
      this.background = scene.add.rectangle(
        this.width / 2,
        TOP_BAR.HEIGHT / 2,
        this.width,
        TOP_BAR.HEIGHT,
        config.backgroundColor ?? BASE_COLORS.HUD_BG,
        config.backgroundAlpha ?? 0.9
      );
      this.container.add(this.background);
    }

    // 각 슬롯 생성
    if (config.left) {
      this.createSlotItem('left', config.left);
    }
    if (config.center) {
      this.createSlotItem('center', config.center);
    }
    if (config.right) {
      this.createSlotItem('right', config.right);
    }
  }

  private createSlotItem(position: SlotPosition, config: SlotItemConfig): void {
    const slotContainer = this.scene.add.container(0, 0);

    // X 좌표 계산
    const x = this.getSlotX(position);

    // 원점 설정 (left: 왼쪽 정렬, center: 중앙 정렬, right: 오른쪽 정렬)
    const originX = position === 'left' ? 0 : position === 'right' ? 1 : 0.5;

    const item: SlotItem = {
      container: slotContainer,
      config,
    };

    if (config.type === 'lives') {
      // 하트(라이프) 표시
      const livesManager = new LivesManager(this.scene, {
        x,
        y: TOP_BAR.CENTER_Y,
        maxLives: config.maxLives ?? 3,
        align: position === 'right' ? 'right' : position === 'center' ? 'center' : 'left',
      });
      item.livesManager = livesManager;
      // LivesManager는 자체적으로 씬에 추가되므로 container에 추가하지 않음
    } else {
      // 텍스트 기반 요소
      const color = config.color ?? BASE_COLORS.TEXT_PRIMARY;
      const initialValue = this.formatValue(config.type, config.initialValue);

      // 값 텍스트
      const valueText = this.scene.add
        .text(x, TOP_BAR.CENTER_Y, initialValue, {
          fontSize: TOP_BAR.FONT_SIZE.MAIN,
          fontFamily: TOP_BAR.FONT_FAMILY,
          color,
          fontStyle: 'bold',
        })
        .setOrigin(originX, 0.5);

      item.valueText = valueText;
      slotContainer.add(valueText);

      // 라벨 (선택적)
      if (config.showLabel && config.label) {
        const labelX = position === 'left' ? x : position === 'right' ? x : x;
        const labelY = TOP_BAR.CENTER_Y + 18;

        const labelText = this.scene.add
          .text(labelX, labelY, config.label, {
            fontSize: TOP_BAR.FONT_SIZE.SUB,
            fontFamily: TOP_BAR.FONT_FAMILY,
            color: BASE_COLORS.TEXT_SECONDARY,
          })
          .setOrigin(originX, 0.5);

        item.labelText = labelText;
        slotContainer.add(labelText);
      }
    }

    this.container.add(slotContainer);
    this.items.set(position, item);
  }

  private getSlotX(position: SlotPosition): number {
    switch (position) {
      case 'left':
        return TOP_BAR.PADDING_X;
      case 'center':
        return this.width / 2;
      case 'right':
        return this.width - TOP_BAR.PADDING_X;
    }
  }

  private formatValue(type: SlotItemType, value?: string | number): string {
    if (value === undefined || value === null) {
      switch (type) {
        case 'score':
          return '0점';
        case 'time':
          return '0초';
        case 'progress':
          return '0/0';
        case 'round':
          return 'Round 1';
        default:
          return '';
      }
    }

    switch (type) {
      case 'score':
        return `${value}점`;
      case 'time':
        if (typeof value === 'number') {
          // 소수점 여부에 따라 포맷팅
          return Number.isInteger(value) ? `${value}초` : `${value.toFixed(1)}초`;
        }
        return `${value}`;
      case 'progress':
        return String(value);
      case 'round':
        return typeof value === 'number' ? `Round ${value}` : String(value);
      default:
        return String(value);
    }
  }

  /**
   * 슬롯 값 업데이트
   */
  public updateValue(position: SlotPosition, value: string | number): void {
    const item = this.items.get(position);
    if (!item || !item.valueText) return;

    const formattedValue = this.formatValue(item.config.type, value);
    item.valueText.setText(formattedValue);
  }

  /**
   * 슬롯 색상 업데이트
   */
  public setColor(position: SlotPosition, color: string): void {
    const item = this.items.get(position);
    if (!item || !item.valueText) return;

    item.valueText.setColor(color);
  }

  /**
   * LivesManager 반환 (lives 타입 슬롯)
   */
  public getLivesManager(position: SlotPosition): LivesManager | undefined {
    const item = this.items.get(position);
    return item?.livesManager;
  }

  /**
   * 목숨 감소 (lives 타입 슬롯)
   * @returns true면 게임오버
   */
  public loseLife(position: SlotPosition = 'left'): boolean {
    const livesManager = this.getLivesManager(position);
    if (!livesManager) {
      // lives가 없는 슬롯에서 호출 시 right 슬롯도 확인
      const rightLives = this.getLivesManager('right');
      if (rightLives) {
        return rightLives.loseLife();
      }
      return false;
    }
    return livesManager.loseLife();
  }

  /**
   * 목숨 리셋 (lives 타입 슬롯)
   */
  public resetLives(position: SlotPosition = 'left'): void {
    const livesManager = this.getLivesManager(position);
    livesManager?.reset();
  }

  /**
   * 화면 리사이즈 대응
   */
  public handleResize(width: number): void {
    this.width = width;

    // 배경 크기 조정
    if (this.background) {
      this.background.setPosition(width / 2, TOP_BAR.HEIGHT / 2);
      this.background.setSize(width, TOP_BAR.HEIGHT);
    }

    // 각 슬롯 위치 업데이트
    this.items.forEach((item, position) => {
      const x = this.getSlotX(position);
      const originX = position === 'left' ? 0 : position === 'right' ? 1 : 0.5;

      if (item.valueText) {
        item.valueText.setPosition(x, TOP_BAR.CENTER_Y);
        item.valueText.setOrigin(originX, 0.5);
      }

      if (item.labelText) {
        item.labelText.setPosition(x, TOP_BAR.CENTER_Y + 18);
        item.labelText.setOrigin(originX, 0.5);
      }

      if (item.livesManager) {
        item.livesManager.setPosition(x, TOP_BAR.CENTER_Y);
      }
    });
  }

  /**
   * 알파값 설정 (페이드인/아웃용)
   */
  public setAlpha(alpha: number): void {
    this.container.setAlpha(alpha);
    // LivesManager는 별도로 처리
    this.items.forEach((item) => {
      if (item.livesManager) {
        item.livesManager.setAlpha(alpha);
      }
    });
  }

  /**
   * 컨테이너 반환 (tween 등에 사용)
   */
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * 정리
   */
  public destroy(): void {
    this.items.forEach((item) => {
      item.container.destroy();
      item.livesManager?.destroy();
    });
    this.container.destroy();
  }
}

/**
 * 게임별 TopBar 프리셋
 */
export const TOP_BAR_PRESETS = {
  // Brain Touch: 점수 | 하트 | 시간
  brainTouch: {
    left: { type: 'score' as const, initialValue: 0 },
    center: { type: 'lives' as const, maxLives: 3 },
    right: { type: 'time' as const, initialValue: 30, color: '#4ecca3' },
  },

  // Speed Math: 진행률 | - | 시간
  speedMath: {
    left: { type: 'progress' as const, initialValue: '1/20' },
    right: { type: 'time' as const, initialValue: '0.00', color: BASE_COLORS.TEXT_SECONDARY },
  },

  // Math Flight: 점수 | - | 하트
  mathFlight: {
    left: { type: 'score' as const, initialValue: 0 },
    right: { type: 'lives' as const, maxLives: 3 },
  },

  // Block Sum: 시간 | - | 점수 (+ 난이도 아래)
  blockSum: {
    left: { type: 'time' as const, initialValue: 60, color: '#ffc947' },
    right: { type: 'score' as const, initialValue: 0 },
  },

  // Number Balloon: 하트 | 라운드 | 점수
  numberBalloon: {
    left: { type: 'lives' as const, maxLives: 3 },
    center: { type: 'round' as const, initialValue: 1 },
    right: { type: 'score' as const, initialValue: 0, color: '#ffc947' },
    showBackground: true,
    backgroundColor: BASE_COLORS.HUD_BG,
    backgroundAlpha: 0.9,
  },
} as const;

