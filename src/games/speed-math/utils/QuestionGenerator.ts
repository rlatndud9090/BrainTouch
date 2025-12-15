/**
 * 문제 인터페이스
 */
export interface Question {
  id: number; // 문제 번호 (1-20)
  operand1: number; // 첫번째 숫자
  operand2: number; // 두번째 숫자
  operator: '+' | '-' | '×'; // 연산자
  answer: number; // 정답
  displayText: string; // 화면 표시용 "7 + 8 = "
}

/**
 * min 이상 max 이하의 랜덤 정수 반환
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 더하기 문제 생성
 * - 양쪽 모두 1~9
 * - 결과: 2~18
 */
function generateAddition(): Omit<Question, 'id' | 'displayText'> {
  const operand1 = randomInt(1, 9);
  const operand2 = randomInt(1, 9);
  return {
    operand1,
    operand2,
    operator: '+',
    answer: operand1 + operand2,
  };
}

/**
 * 빼기 문제 생성
 * - 첫번째 숫자: 1~19
 * - 두번째 숫자: 1~9 (첫번째 숫자 이하, 음수 방지)
 * - 결과: 0~18
 */
function generateSubtraction(): Omit<Question, 'id' | 'displayText'> {
  const operand1 = randomInt(1, 19);
  // 음수 방지: operand2는 operand1 이하이면서 최대 9
  const maxOp2 = Math.min(9, operand1);
  const operand2 = randomInt(1, maxOp2);
  return {
    operand1,
    operand2,
    operator: '-',
    answer: operand1 - operand2,
  };
}

/**
 * 곱하기 문제 생성
 * - 양쪽 모두 1~9
 * - 결과: 1~81
 */
function generateMultiplication(): Omit<Question, 'id' | 'displayText'> {
  const operand1 = randomInt(1, 9);
  const operand2 = randomInt(1, 9);
  return {
    operand1,
    operand2,
    operator: '×',
    answer: operand1 * operand2,
  };
}

/**
 * 랜덤 연산자 선택 후 문제 생성
 */
function generateRandomQuestion(): Omit<Question, 'id' | 'displayText'> {
  const operators = ['+', '-', '×'] as const;
  const operator = operators[randomInt(0, 2)];

  switch (operator) {
    case '+':
      return generateAddition();
    case '-':
      return generateSubtraction();
    case '×':
      return generateMultiplication();
  }
}

/**
 * 20문제 배열 생성
 */
export function generateQuestions(count: number = 20): Question[] {
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    const base = generateRandomQuestion();
    const question: Question = {
      id: i + 1,
      ...base,
      displayText: `${base.operand1} ${base.operator} ${base.operand2} = `,
    };
    questions.push(question);
  }

  return questions;
}

/**
 * 정답이 한자리인지 확인
 */
export function isSingleDigitAnswer(answer: number): boolean {
  return answer >= 0 && answer <= 9;
}

/**
 * 정답의 자릿수 반환
 */
export function getAnswerDigits(answer: number): number {
  if (answer === 0) return 1;
  return Math.floor(Math.log10(Math.abs(answer))) + 1;
}
