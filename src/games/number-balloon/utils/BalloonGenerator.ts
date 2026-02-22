import { COLORFUL_PALETTE } from '../../../shared/colors';

export interface BalloonData {
  id: number;
  value: number;
  size: number;
  x: number;
  y: number;
  color: number;
}

export interface RoundGenerationConfig {
  balloonCount: number;
  swapCount: number;
  maxIndexDiff: number;
  minNumber: number;
  maxNumber: number;
  minSize: number;
  maxSize: number;
}

const BALLOON_COLORS = COLORFUL_PALETTE;
const GRID_COLS = 3;
const GRID_ROWS = 3;
const MAX_BALLOON_COUNT = GRID_COLS * GRID_ROWS;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickUniqueRandomNumbers(min: number, max: number, count: number): number[] {
  const range = max - min + 1;
  if (count > range) {
    throw new Error('요청한 풍선 수가 숫자 범위를 초과했습니다.');
  }

  const numbers: Set<number> = new Set();
  while (numbers.size < count) {
    numbers.add(randomInt(min, max));
  }

  return Array.from(numbers);
}

function generateGridPositions(
  count: number,
  areaWidth: number,
  areaHeight: number,
  padding: number = 30
): { x: number; y: number }[] {
  const cellWidth = (areaWidth - padding * 2) / GRID_COLS;
  const cellHeight = (areaHeight - padding * 2) / GRID_ROWS;

  const cellIndices = Array.from({ length: MAX_BALLOON_COUNT }, (_, i) => i);
  const shuffled = cellIndices.sort(() => Math.random() - 0.5);
  const selectedCells = shuffled.slice(0, count);

  return selectedCells.map((cellIndex) => {
    const col = cellIndex % GRID_COLS;
    const row = Math.floor(cellIndex / GRID_COLS);

    const centerX = padding + col * cellWidth + cellWidth / 2;
    const centerY = padding + row * cellHeight + cellHeight / 2;

    const offsetRange = Math.min(cellWidth, cellHeight) * 0.15;
    const offsetX = randomInt(-Math.round(offsetRange), Math.round(offsetRange));
    const offsetY = randomInt(-Math.round(offsetRange), Math.round(offsetRange));

    return {
      x: centerX + offsetX,
      y: centerY + offsetY,
    };
  });
}

function generateSwapPairs(
  count: number,
  swapCount: number,
  maxIndexDiff: number
): [number, number][] {
  if (swapCount === 0 || count < 2) {
    return [];
  }

  const normalizedSwapCount = clamp(swapCount, 0, Math.floor(count / 2));
  const normalizedMaxIndexDiff = clamp(maxIndexDiff, 1, count - 1);
  const swapPairs: [number, number][] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < normalizedSwapCount && usedIndices.size < count - 1; i++) {
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const smallIdx = randomInt(0, Math.floor(count / 2));
      const minLargeIdx = Math.min(smallIdx + 1, count - 1);
      const maxLargeIdx = Math.min(smallIdx + normalizedMaxIndexDiff, count - 1);

      if (maxLargeIdx <= minLargeIdx) {
        attempts++;
        continue;
      }

      const largeIdx = randomInt(minLargeIdx, maxLargeIdx);

      if (!usedIndices.has(smallIdx) && !usedIndices.has(largeIdx)) {
        swapPairs.push([smallIdx, largeIdx]);
        usedIndices.add(smallIdx);
        usedIndices.add(largeIdx);
        break;
      }

      attempts++;
    }
  }

  return swapPairs;
}

export function generateBalloons(
  config: RoundGenerationConfig,
  areaWidth: number,
  areaHeight: number
): BalloonData[] {
  const balloonCount = clamp(Math.floor(config.balloonCount), 2, MAX_BALLOON_COUNT);
  const minSize = Math.floor(Math.min(config.minSize, config.maxSize));
  const maxSize = Math.floor(Math.max(config.minSize, config.maxSize));
  const minNumber = Math.floor(Math.min(config.minNumber, config.maxNumber));
  const maxNumber = Math.floor(Math.max(config.minNumber, config.maxNumber));

  const sizes = Array.from({ length: balloonCount }, () => randomInt(minSize, maxSize));
  sizes.sort((a, b) => a - b);

  const numbers = pickUniqueRandomNumbers(minNumber, maxNumber, balloonCount);
  numbers.sort((a, b) => a - b);

  const swapPairs = generateSwapPairs(balloonCount, config.swapCount, config.maxIndexDiff);
  for (const [i, j] of swapPairs) {
    [sizes[i], sizes[j]] = [sizes[j], sizes[i]];
  }

  const positions = generateGridPositions(balloonCount, areaWidth, areaHeight);
  const shuffledColors = [...BALLOON_COLORS].sort(() => Math.random() - 0.5);

  const balloons: BalloonData[] = numbers.map((value, index) => ({
    id: index,
    value,
    size: sizes[index],
    x: positions[index].x,
    y: positions[index].y,
    color: shuffledColors[index % shuffledColors.length],
  }));

  return balloons.sort(() => Math.random() - 0.5);
}

export function getCorrectOrder(balloons: BalloonData[]): number[] {
  return [...balloons].sort((a, b) => a.value - b.value).map((balloon) => balloon.id);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
