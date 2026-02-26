/**
 * Speed Math - 필기 숫자 인식 (TensorFlow.js + MNIST)
 *
 * 0~9 숫자를 인식하는 CNN 모델 사용
 * 단일/다중 숫자 인식 지원
 */

import * as tf from '@tensorflow/tfjs';

// 모델 URL (사전 학습된 MNIST 모델)
const MODEL_URL =
  'https://storage.googleapis.com/tfjs-models/tfjs/mnist_transfer_cnn_v1/model.json';

interface ImportMetaWithEnv extends ImportMeta {
  env?: {
    DEV?: boolean;
  };
}

const isDebugLoggingEnabled = Boolean((import.meta as ImportMetaWithEnv).env?.DEV);

function debugLog(...args: unknown[]): void {
  if (isDebugLoggingEnabled) {
    console.log(...args);
  }
}

export interface DigitBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class DigitRecognizer {
  private model: tf.LayersModel | null = null;
  private isLoading = false;
  private isReady = false;

  /**
   * 모델 로드
   */
  async loadModel(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isLoading) return false;

    this.isLoading = true;

    try {
      debugLog('[DigitRecognizer] 모델 로딩 시작...');

      await tf.ready();
      debugLog('[DigitRecognizer] TF 백엔드:', tf.getBackend());

      this.model = await tf.loadLayersModel(MODEL_URL);

      // 워밍업
      const dummyInput = tf.zeros([1, 28, 28, 1]);
      const warmup = this.model.predict(dummyInput) as tf.Tensor;
      warmup.dispose();
      dummyInput.dispose();

      this.isReady = true;
      this.isLoading = false;
      debugLog('[DigitRecognizer] 모델 로딩 완료!');
      return true;
    } catch (error) {
      console.error('[DigitRecognizer] 모델 로딩 실패:', error);
      this.isLoading = false;
      return false;
    }
  }

  isModelReady(): boolean {
    return this.isReady;
  }

  /**
   * 단일 숫자 인식
   */
  async predict(imageData: ImageData): Promise<number> {
    if (!this.model || !this.isReady) {
      console.warn('[DigitRecognizer] 모델이 준비되지 않음');
      return -1;
    }

    try {
      const tensor = this.preprocessImage(imageData);
      const prediction = this.model.predict(tensor) as tf.Tensor;
      const probabilities = await prediction.data();

      let maxProb = 0;
      let maxIndex = 0;
      for (let i = 0; i < probabilities.length; i++) {
        if (probabilities[i] > maxProb) {
          maxProb = probabilities[i];
          maxIndex = i;
        }
      }

      tensor.dispose();
      prediction.dispose();

      debugLog(`[DigitRecognizer] 인식: ${maxIndex} (${(maxProb * 100).toFixed(1)}%)`);

      if (maxProb < 0.25) {
        return -1;
      }

      return maxIndex;
    } catch (error) {
      console.error('[DigitRecognizer] 추론 실패:', error);
      return -1;
    }
  }

  /**
   * 캔버스에서 숫자들 인식 (1~2자리)
   * 자동으로 분할하여 각 숫자 인식
   */
  async predictFromCanvas(canvas: HTMLCanvasElement): Promise<string> {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 바운딩 박스 찾기
    const bounds = this.findBoundingBox(imageData);
    if (!bounds) {
      return '';
    }

    const { minX, maxX, minY, maxY } = bounds;
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // 가로 세로 비율로 1자리 vs 2자리 판단
    const aspectRatio = width / height;
    debugLog(`[DigitRecognizer] 비율: ${aspectRatio.toFixed(2)}, 크기: ${width}x${height}`);

    if (aspectRatio > 1.2) {
      // 2자리 숫자 - 분할
      return await this.recognizeTwoDigits(canvas, bounds);
    } else {
      // 1자리 숫자
      const digitData = this.extractSingleDigit(canvas, bounds);
      const digit = await this.predict(digitData);
      return digit >= 0 ? digit.toString() : '';
    }
  }

  /**
   * 2자리 숫자 분할 인식
   */
  private async recognizeTwoDigits(
    canvas: HTMLCanvasElement,
    bounds: DigitBounds
  ): Promise<string> {
    const { minX, maxX, minY, maxY } = bounds;
    const width = maxX - minX + 1;
    const midX = minX + Math.floor(width / 2);

    // 분할점 찾기 (세로 방향으로 빈 공간 찾기)
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const splitX = this.findSplitPoint(imageData, minX, maxX, minY, maxY) || midX;

    // 왼쪽 숫자 (십의 자리)
    const leftBounds: DigitBounds = { minX, minY, maxX: splitX - 1, maxY };
    const leftData = this.extractSingleDigit(canvas, leftBounds);
    const leftDigit = await this.predict(leftData);

    // 오른쪽 숫자 (일의 자리)
    const rightBounds: DigitBounds = { minX: splitX, minY, maxX, maxY };
    const rightData = this.extractSingleDigit(canvas, rightBounds);
    const rightDigit = await this.predict(rightData);

    if (leftDigit >= 0 && rightDigit >= 0) {
      return `${leftDigit}${rightDigit}`;
    } else if (leftDigit >= 0) {
      return leftDigit.toString();
    } else if (rightDigit >= 0) {
      return rightDigit.toString();
    }
    return '';
  }

  /**
   * 세로 방향으로 가장 빈 x 좌표 찾기 (분할점)
   */
  private findSplitPoint(
    imageData: ImageData,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ): number | null {
    const { data, width } = imageData;
    const centerRange = Math.floor((maxX - minX) * 0.3);
    const searchStart = minX + Math.floor((maxX - minX) / 2) - centerRange;
    const searchEnd = minX + Math.floor((maxX - minX) / 2) + centerRange;

    let minPixels = Infinity;
    let bestX = null;

    for (let x = searchStart; x <= searchEnd; x++) {
      let pixelCount = 0;
      for (let y = minY; y <= maxY; y++) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (brightness > 100) {
          pixelCount++;
        }
      }
      if (pixelCount < minPixels) {
        minPixels = pixelCount;
        bestX = x;
      }
    }

    return bestX;
  }

  /**
   * 단일 숫자 추출 (개선된 버전 - 1 인식 향상)
   */
  private extractSingleDigit(canvas: HTMLCanvasElement, bounds: DigitBounds): ImageData {
    const { minX, minY, maxX, maxY } = bounds;
    let cropWidth = maxX - minX + 1;
    let cropHeight = maxY - minY + 1;

    // 너무 얇으면 (1 같은 경우) 최소 너비 보장
    const minWidth = cropHeight * 0.4; // 높이의 40% 이상
    if (cropWidth < minWidth) {
      const padding = Math.ceil((minWidth - cropWidth) / 2);
      cropWidth = Math.ceil(minWidth);
      // bounds 조정은 하지 않고 패딩으로 처리
    }

    // 정사각형으로 만들기
    const size = Math.max(cropWidth, cropHeight);
    const paddedSize = Math.ceil(size * 1.4); // 40% 여백 (1 인식 향상)

    // 임시 캔버스에 중앙 정렬
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = paddedSize;
    tempCanvas.height = paddedSize;
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCtx.fillStyle = 'black';
    tempCtx.fillRect(0, 0, paddedSize, paddedSize);

    const offsetX = (paddedSize - (maxX - minX + 1)) / 2;
    const offsetY = (paddedSize - (maxY - minY + 1)) / 2;
    tempCtx.drawImage(
      canvas,
      minX,
      minY,
      maxX - minX + 1,
      maxY - minY + 1,
      offsetX,
      offsetY,
      maxX - minX + 1,
      maxY - minY + 1
    );

    // 28x28로 리사이즈
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 28;
    finalCanvas.height = 28;
    const finalCtx = finalCanvas.getContext('2d')!;

    finalCtx.fillStyle = 'black';
    finalCtx.fillRect(0, 0, 28, 28);
    finalCtx.drawImage(tempCanvas, 0, 0, 28, 28);

    return finalCtx.getImageData(0, 0, 28, 28);
  }

  /**
   * 이미지 전처리
   */
  private preprocessImage(imageData: ImageData): tf.Tensor {
    return tf.tidy(() => {
      let tensor = tf.browser.fromPixels(imageData, 1);
      tensor = tf.image.resizeBilinear(tensor, [28, 28]);
      tensor = tensor.div(255.0);
      tensor = tensor.expandDims(0);
      return tensor;
    });
  }

  /**
   * 바운딩 박스 찾기
   */
  private findBoundingBox(imageData: ImageData): DigitBounds | null {
    const { data, width, height } = imageData;
    let minX = width,
      minY = height,
      maxX = 0,
      maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        if (alpha > 100 && brightness > 100) {
          found = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return found ? { minX, minY, maxX, maxY } : null;
  }

  /**
   * [Legacy] 단일 캔버스에서 ImageData 추출
   */
  static extractImageData(canvas: HTMLCanvasElement): ImageData {
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    const originalData = ctx.getImageData(0, 0, width, height);
    const bounds = DigitRecognizer.findBoundingBoxStatic(originalData);

    if (!bounds) {
      return ctx.getImageData(0, 0, 28, 28);
    }

    const { minX, minY, maxX, maxY } = bounds;
    let cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    // 1 인식 향상: 최소 너비 보장
    const minWidth = cropHeight * 0.4;
    if (cropWidth < minWidth) {
      cropWidth = Math.ceil(minWidth);
    }

    const size = Math.max(cropWidth, cropHeight);
    const paddedSize = Math.ceil(size * 1.4);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = paddedSize;
    tempCanvas.height = paddedSize;
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCtx.fillStyle = 'black';
    tempCtx.fillRect(0, 0, paddedSize, paddedSize);

    const offsetX = (paddedSize - (maxX - minX + 1)) / 2;
    const offsetY = (paddedSize - cropHeight) / 2;
    tempCtx.drawImage(
      canvas,
      minX,
      minY,
      maxX - minX + 1,
      cropHeight,
      offsetX,
      offsetY,
      maxX - minX + 1,
      cropHeight
    );

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 28;
    finalCanvas.height = 28;
    const finalCtx = finalCanvas.getContext('2d')!;

    finalCtx.fillStyle = 'black';
    finalCtx.fillRect(0, 0, 28, 28);
    finalCtx.drawImage(tempCanvas, 0, 0, 28, 28);

    return finalCtx.getImageData(0, 0, 28, 28);
  }

  private static findBoundingBoxStatic(imageData: ImageData): DigitBounds | null {
    const { data, width, height } = imageData;
    let minX = width,
      minY = height,
      maxX = 0,
      maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        if (alpha > 100 && brightness > 100) {
          found = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return found ? { minX, minY, maxX, maxY } : null;
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isReady = false;
  }
}

export const digitRecognizer = new DigitRecognizer();
