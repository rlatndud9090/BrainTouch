# CLAUDE.md - 프로젝트 컨텍스트

> 이 문서는 AI 에이전트가 프로젝트를 빠르게 파악하기 위한 컨텍스트 문서입니다.
> 작업 시마다 업데이트됩니다.

---

## 📌 프로젝트 개요

| 항목           | 내용                                                |
| -------------- | --------------------------------------------------- |
| **프로젝트명** | BrainTouch (브레인 터치)                            |
| **목적**       | 앱인토스(App-in-Toss) 플랫폼에 웹뷰로 올릴 미니게임 |
| **게임 컨셉**  | 터치를 통해 푸는 두뇌 미니게임들 모음               |
| **플랫폼**     | 모바일 웹뷰 (토스 앱 내)                            |

---

## 🛠 기술 스택

| 기술              | 버전    | 용도                        |
| ----------------- | ------- | --------------------------- |
| **React**         | ^18.2.0 | UI 프레임워크               |
| **React Router**  | ^6.22.3 | 페이지 라우팅               |
| **Phaser 3**      | ^3.80.1 | 2D 게임 엔진 (게임 코어만)  |
| **TypeScript**    | ^5.3.3  | 타입 안정성                 |
| **Vite**          | ^5.4.11 | 번들러 & 개발 서버          |
| **TailwindCSS**   | ^3.4.3  | UI 스타일링                 |
| **TensorFlow.js** | ^4.x    | 필기 숫자 인식 (speed-math) |

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────┐
│              React App                  │
├─────────────────────────────────────────┤
│  HomePage   │  GamePage  │  RankingPage │  ← React 페이지
├─────────────┴────────────┴──────────────┤
│         PhaserGame 컴포넌트             │  ← React-Phaser 브릿지
├─────────────────────────────────────────┤
│           Phaser 3 Game                 │  ← 게임 로직
│  (brain-touch, speed-math, block-sum)   │
└─────────────────────────────────────────┘
```

- **UI/메뉴/랭킹**: React + TailwindCSS
- **게임 플레이**: Phaser 3 캔버스

---

## 📁 프로젝트 구조

```
BrainTouch/
├── src/
│   ├── main.tsx                    # React 진입점
│   ├── App.tsx                     # 라우터 설정
│   ├── index.css                   # 글로벌 스타일 + Tailwind
│   ├── pages/
│   │   ├── HomePage.tsx            # 게임 목록 (카드뷰)
│   │   ├── GamePage.tsx            # 게임 플레이 화면
│   │   └── RankingPage.tsx         # 랭킹 화면
│   ├── components/
│   │   ├── GameCard.tsx            # 게임 카드 컴포넌트
│   │   └── PhaserGame.tsx          # Phaser 래퍼 컴포넌트
│   ├── shared/                     # 공통 모듈
│   │   ├── colors.ts               # 공통 색상 팔레트
│   │   └── ui.ts                   # 공통 UI 유틸리티 (버튼, 배경, 카운트다운)
│   └── games/
│       ├── brain-touch/            # Brain Touch 게임
│       │   ├── config.ts           # Phaser 설정
│       │   └── scenes/
│       │       └── MainScene.ts    # 메인 게임 씬
│       ├── speed-math/             # Speed Math 게임 (사칙연산)
│       │   ├── DESIGN.md           # 게임 설계 문서
│       │   ├── config.ts           # Phaser 설정
│       │   ├── scenes/
│       │   │   ├── ModeSelectScene.ts # 모드 선택 (현재 숫자패드만)
│       │   │   ├── GameScene.ts    # 숫자패드 모드 게임 씬
│       │   │   ├── GameSceneHW.ts  # 필기 입력 모드 (임시 비활성화)
│       │   │   └── ResultScene.ts  # 결과 화면
│       │   └── utils/
│       │       ├── QuestionGenerator.ts  # 문제 생성기
│       │       └── DigitRecognizer.ts    # TensorFlow.js 숫자 인식
│       ├── math-flight/            # Math Flight 게임 (중간값 찾기)
│       │   ├── DESIGN.md           # 게임 설계 문서
│       │   ├── config.ts           # Phaser 설정
│       │   ├── scenes/
│       │   │   ├── GameScene.ts    # 메인 게임 씬
│       │   │   └── ResultScene.ts  # 결과 화면
│       │   └── utils/
│       │       └── MeteorGenerator.ts  # 운석 생성 알고리즘
│       └── block-sum/              # Block Sum 게임 (블록셈)
│           ├── DESIGN.md           # 게임 설계 문서
│           ├── config.ts           # Phaser 설정
│           ├── scenes/
│           │   ├── GameScene.ts    # 메인 게임 씬
│           │   └── ResultScene.ts  # 결과 화면
│           └── utils/
│               └── BlockGenerator.ts   # 블록 생성 알고리즘
├── public/                         # 정적 에셋
│   └── assets/                     # 이미지, 오디오, 폰트
├── index.html                      # HTML 템플릿
├── package.json                    # 의존성 관리
├── tsconfig.json                   # TypeScript 설정
├── vite.config.ts                  # Vite 설정
├── tailwind.config.js              # TailwindCSS 설정
├── postcss.config.js               # PostCSS 설정
├── CONVENTION.md                   # 브랜치/커밋 컨벤션
├── GAME_IDEAS.md                   # 게임 아이디어 백로그
├── README.md                       # 프로젝트 문서
└── CLAUDE.md                       # 이 파일 (AI 컨텍스트)
```

---

## 📄 주요 파일 설명

### `src/main.tsx`

- React 앱 진입점
- BrowserRouter 래핑

### `src/App.tsx`

- React Router 설정
- 페이지 라우팅: `/`, `/game/:gameId`, `/ranking`

### `src/components/PhaserGame.tsx`

- Phaser 게임을 React 컴포넌트로 래핑
- 게임별 설정을 동적 import
- 리사이즈 핸들링

### `src/games/brain-touch/`

- Brain Touch 게임 코드
- `config.ts`: Phaser 설정 생성 함수
- `scenes/MainScene.ts`: 게임 로직 (터치 게임)

### `src/games/speed-math/`

- Speed Math 게임 (스피드 계산 - 사칙연산 스피드 퀴즈)
- `DESIGN.md`: 게임 설계 문서 (아키텍처, 규칙, 기술 스택)
- `config.ts`: Phaser 게임 설정
- `scenes/GameScene.ts`: 메인 게임 씬 (숫자패드, 타이머, 정답 처리)
- `scenes/ResultScene.ts`: 결과 화면
- `utils/QuestionGenerator.ts`: 20문제 생성기 (+, -, ×)
- 상세 내용은 `src/games/speed-math/DESIGN.md` 참조

### `src/games/math-flight/`

- Math Flight 게임 (매스 플라이트 - 중간값 찾기 러닝 게임)
- `DESIGN.md`: 게임 설계 문서
- `config.ts`: Phaser 게임 설정
- `scenes/GameScene.ts`: 메인 게임 씬 (자유 이동, 운석 낙하, 충돌 판정)
- `scenes/ResultScene.ts`: 결과 화면
- `utils/MeteorGenerator.ts`: 운석 생성 알고리즘 (난이도별 분포)
- **규칙**: 5개 운석 중 가장 큰 수/작은 수 피하고 중간 3개 맞추기
- 상세 내용은 `src/games/math-flight/DESIGN.md` 참조

### `src/games/block-sum/`

- Block Sum 게임 (블록셈 - 다루마 오토시 스타일 덧셈 퍼즐)
- `DESIGN.md`: 게임 설계 문서
- `config.ts`: Phaser 게임 설정
- `scenes/GameScene.ts`: 메인 게임 씬 (블록 탑, 스와이프 제거, 낙하 애니메이션)
- `scenes/ResultScene.ts`: 결과 화면
- `utils/BlockGenerator.ts`: 블록 생성 및 목표 숫자 알고리즘
- **규칙**: 블록을 스와이프로 제거하여 남은 블록 합 = 목표 숫자
- **난이도**: 하(4개)→중(5개)→상(6개), 연속 3회 성공 시 승급
- 상세 내용은 `src/games/block-sum/DESIGN.md` 참조

### `src/games/number-balloon/`

- Number Balloon 게임 (숫자풍선 - 순서 맞추기)
- `DESIGN.md`: 게임 설계 문서
- `config.ts`: Phaser 게임 설정
- `scenes/GameScene.ts`: 메인 게임 씬 (풍선 터치, 순서 체크)
- `scenes/ResultScene.ts`: 결과 화면
- `utils/BalloonGenerator.ts`: 풍선 생성 알고리즘 (정렬 기반 매칭 + index 교환)
- **규칙**: 작은 숫자부터 순서대로 풍선 터뜨리기, 3번 실패 시 종료
- **난이도**: 풍선 개수 증가 + 크기-숫자 불일치(페이크) 비율 증가
- 상세 내용은 `src/games/number-balloon/DESIGN.md` 참조

### `src/shared/`

- 게임 간 공통 모듈
- `colors.ts`: 공통 색상 팔레트 + 게임별 테마 프리셋
- `ui.ts`: 공통 UI 유틸리티 (버튼, 배경, 카운트다운, 시간 포맷)

---

## ⚡ 개발 명령어

```bash
npm run dev      # 개발 서버 실행 (localhost:3000)
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과물 미리보기
```

---

## 🌿 Git 컨벤션 요약

> 상세 내용은 `CONVENTION.md` 참조

### 브랜치

```
feature/<game-name>-<description>
fix/<game-name>-<description>
refactor/<game-name>-<description>
```

### 커밋

```
<type>(<scope>): <subject>

예: feat(brain-touch): 게임 오버 화면 추가
```

---

## 📊 현재 진행 상황

### ✅ 완료

- [x] 프로젝트 초기 환경 구축 (Vite + TS + Phaser3)
- [x] React + Phaser 하이브리드 아키텍처로 마이그레이션
- [x] TailwindCSS 설정
- [x] 페이지 구조 생성 (Home, Game, Ranking)
- [x] Phaser 래퍼 컴포넌트 구현
- [x] Brain Touch 기본 게임 로직 구현
- [x] 개발 컨벤션 문서 작성
- [x] GitHub 리포지토리 연결

### 🔄 진행중

- [x] Speed Math 게임 MVP 구현 완료 (숫자패드 모드)
- [x] Speed Math 필기 인식 모드 구현 (임시 비활성화 - 인식률 개선 필요)
- [x] Math Flight 게임 MVP 구현 완료 (중간값 찾기)
- [x] Block Sum 게임 MVP 구현 완료 (블록셈)
- [x] Number Balloon 게임 MVP 구현 완료 (숫자풍선)
- [x] 공통 모듈 분리 (colors.ts, ui.ts)

### 🔲 예정

> 상세 아이디어는 `GAME_IDEAS.md` 참조
> 탄토알/이치단트알 시리즈 미니게임 아이디어 킵 중 (스피드 카운팅, 아웃라이어 터치 등)

- [ ] 게임 밸런스 조정 (Math Flight, Block Sum)
- [ ] 게임 UI/UX 개선
- [ ] 에셋 추가 (이미지, 사운드)
- [ ] 점수 저장 시스템
- [ ] 토스 계정 연동
- [ ] 랭킹 시스템 구현
- [ ] 앱인토스 배포 테스트

---

## 🎮 게임 추가 방법

새 게임을 추가하려면:

1. `src/games/<game-name>/` 폴더 생성
2. `config.ts` 생성 (getGameConfig 함수 export)
3. `scenes/` 폴더에 씬 파일 추가
4. `src/pages/HomePage.tsx`의 games 배열에 추가

---

## 🔗 관련 링크

- **GitHub**: https://github.com/rlatndud9090/BrainTouch (Private)
- **앱인토스 개발자 문서**: https://developers-apps-in-toss.toss.im/

---

## 📝 최근 변경 이력

| 날짜       | 작업 내용                                              |
| ---------- | ------------------------------------------------------ |
| 2025-12-19 | Number Balloon (숫자풍선) MVP 구현                     |
| 2025-12-19 | Block Sum (블록셈) MVP 구현                            |
| 2025-12-19 | 공통 모듈 분리 (src/shared/colors.ts, ui.ts)           |
| 2025-12-19 | Math Flight 드래그 입력 버그 수정                      |
| 2025-12-19 | Speed Math 필기 모드 임시 비활성화 (인식률 이슈)       |
| 2025-12-15 | Speed Math 필기 인식 모드 구현 (TensorFlow.js + MNIST) |
| 2025-12-15 | Math Flight 규칙 갈아엎기 (중간값 찾기 게임으로 변경)  |
| 2025-12-15 | Math Flight MVP 구현 (자유 이동, 운석 충돌)            |
| 2025-12-14 | GAME_IDEAS.md 생성 (게임 아이디어 백로그)              |
| 2025-12-14 | Speed Math UI 개선 (3-2-1 카운트다운, 3문제 표시)      |
| 2025-12-14 | Speed Math MVP 구현 (숫자패드, 타이머, 결과화면)       |
| 2025-12-14 | Speed Math 게임 설계 문서 작성 (DESIGN.md)             |
| 2025-12-14 | React + Phaser 하이브리드 구조로 마이그레이션          |
| 2025-12-14 | 프로젝트 초기 환경 구축, 컨벤션 문서 작성              |

---

_마지막 업데이트: 2025-12-19_
