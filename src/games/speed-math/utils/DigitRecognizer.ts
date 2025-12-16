/**
 * Speed Math - 필기 숫자 인식 (TensorFlow.js + MNIST)
 *
 * 0~9 숫자를 인식하는 CNN 모델 사용
 */

import * as tf from '@tensorflow/tfjs';

// 모델 URL (사전 학습된 MNIST 모델)
// 공개된 MNIST 모델 사용 또는 직접 학습 후 호스팅 필요
const MODEL_URL =
  'https://storage.googleapis.com/tfjs-models/tfjs/mnist_transfer_cnn_v1/model.json';

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
      console.log('[DigitRecognizer] 모델 로딩 시작...');

      // TensorFlow.js 백엔드 설정 (WebGL 우선)
      await tf.ready();
      console.log('[DigitRecognizer] TF 백엔드:', tf.getBackend());

      // 모델 로드
      this.model = await tf.loadLayersModel(MODEL_URL);

      // 워밍업 (첫 추론이 느리므로 미리 실행)
      const dummyInput = tf.zeros([1, 28, 28, 1]);
      const warmup = this.model.predict(dummyInput) as tf.Tensor;
      warmup.dispose();
      dummyInput.dispose();

      this.isReady = true;
      this.isLoading = false;
      console.log('[DigitRecognizer] 모델 로딩 완료!');
      return true;
    } catch (error) {
      console.error('[DigitRecognizer] 모델 로딩 실패:', error);
      this.isLoading = false;
      return false;
    }
  }

  /**
   * 모델 준비 상태 확인
   */
  isModelReady(): boolean {
    return this.isReady;
  }

  /**
   * Canvas 이미지에서 숫자 인식
   * @param canvas HTMLCanvasElement 또는 ImageData
   * @returns 인식된 숫자 (0~9) 또는 -1 (실패)
   */
  async predict(imageData: ImageData): Promise<number> {
    if (!this.model || !this.isReady) {
      console.warn('[DigitRecognizer] 모델이 준비되지 않음');
      return -1;
    }

    try {
      // ImageData → Tensor 변환 및 전처리
      const tensor = this.preprocessImage(imageData);

      // 추론
      const prediction = this.model.predict(tensor) as tf.Tensor;
      const probabilities = await prediction.data();

      // 가장 높은 확률의 숫자 찾기
      let maxProb = 0;
      let maxIndex = 0;
      for (let i = 0; i < probabilities.length; i++) {
        if (probabilities[i] > maxProb) {
          maxProb = probabilities[i];
          maxIndex = i;
        }
      }

      // 메모리 정리
      tensor.dispose();
      prediction.dispose();

      console.log(
        `[DigitRecognizer] 인식 결과: ${maxIndex} (확률: ${(maxProb * 100).toFixed(1)}%)`
      );

      // 확률이 너무 낮으면 인식 실패로 처리
      if (maxProb < 0.3) {
        return -1;
      }

      return maxIndex;
    } catch (error) {
      console.error('[DigitRecognizer] 추론 실패:', error);
      return -1;
    }
  }

  /**
   * 이미지 전처리 (28x28, 정규화, 반전)
   */
  private preprocessImage(imageData: ImageData): tf.Tensor {
    return tf.tidy(() => {
      // ImageData → Tensor
      let tensor = tf.browser.fromPixels(imageData, 1); // 그레이스케일

      // 28x28로 리사이즈
      tensor = tf.image.resizeBilinear(tensor, [28, 28]);

      // 정규화 (0~255 → 0~1)
      tensor = tensor.div(255.0);

      // 배치 차원 추가 [1, 28, 28, 1]
      tensor = tensor.expandDims(0);

      return tensor;
    });
  }

  /**
   * Canvas에서 ImageData 추출 (중앙 정렬 + 패딩)
   */
  static extractImageData(canvas: HTMLCanvasElement): ImageData {
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    // 원본 이미지 데이터
    const originalData = ctx.getImageData(0, 0, width, height);

    // 바운딩 박스 찾기 (그려진 영역)
    const bounds = this.findBoundingBox(originalData);

    if (!bounds) {
      // 빈 캔버스면 빈 이미지 반환
      return ctx.getImageData(0, 0, 28, 28);
    }

    // 그려진 영역 추출
    const { minX, minY, maxX, maxY } = bounds;
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    // 정사각형으로 만들기 (패딩 추가)
    const size = Math.max(cropWidth, cropHeight);
    const paddedSize = Math.ceil(size * 1.3); // 20% 여백

    // 임시 캔버스에 중앙 정렬하여 그리기
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = paddedSize;
    tempCanvas.height = paddedSize;
    const tempCtx = tempCanvas.getContext('2d')!;

    // 검은 배경
    tempCtx.fillStyle = 'black';
    tempCtx.fillRect(0, 0, paddedSize, paddedSize);

    // 중앙에 그리기
    const offsetX = (paddedSize - cropWidth) / 2;
    const offsetY = (paddedSize - cropHeight) / 2;
    tempCtx.drawImage(
      canvas,
      minX,
      minY,
      cropWidth,
      cropHeight,
      offsetX,
      offsetY,
      cropWidth,
      cropHeight
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
   * 그려진 영역의 바운딩 박스 찾기
   */
  private static findBoundingBox(
    imageData: ImageData
  ): { minX: number; minY: number; maxX: number; maxY: number } | null {
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

        // 픽셀이 그려져 있으면 (흰색 획)
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
   * 메모리 정리
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isReady = false;
  }
}

// 싱글톤 인스턴스
export const digitRecognizer = new DigitRecognizer();
