# CLAUDE.md - 프로젝트 컨텍스트

> 이 문서는 AI 에이전트가 프로젝트를 빠르게 파악하기 위한 컨텍스트 문서입니다.
> 작업 시마다 업데이트됩니다.

---

## 📌 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | BrainTouch (브레인 터치) |
| **목적** | 앱인토스(App-in-Toss) 플랫폼에 웹뷰로 올릴 미니게임 |
| **게임 컨셉** | 터치를 통해 푸는 두뇌 미니게임들 모음 |
| **플랫폼** | 모바일 웹뷰 (토스 앱 내) |

---

## 🛠 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| **React** | ^18.2.0 | UI 프레임워크 |
| **React Router** | ^6.22.3 | 페이지 라우팅 |
| **Phaser 3** | ^3.80.1 | 2D 게임 엔진 (게임 코어만) |
| **TypeScript** | ^5.3.3 | 타입 안정성 |
| **Vite** | ^5.4.11 | 번들러 & 개발 서버 |
| **TailwindCSS** | ^3.4.3 | UI 스타일링 |

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
│      (brain-touch, puzzle-pop 등)       │
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
│   └── games/
│       └── brain-touch/            # Brain Touch 게임
│           ├── config.ts           # Phaser 설정
│           └── scenes/
│               └── MainScene.ts    # 메인 게임 씬
├── public/                         # 정적 에셋
│   └── assets/                     # 이미지, 오디오, 폰트
├── index.html                      # HTML 템플릿
├── package.json                    # 의존성 관리
├── tsconfig.json                   # TypeScript 설정
├── vite.config.ts                  # Vite 설정
├── tailwind.config.js              # TailwindCSS 설정
├── postcss.config.js               # PostCSS 설정
├── CONVENTION.md                   # 브랜치/커밋 컨벤션
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

### 🔲 예정
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

| 날짜 | 작업 내용 |
|------|-----------|
| 2025-12-14 | React + Phaser 하이브리드 구조로 마이그레이션 |
| 2025-12-14 | 프로젝트 초기 환경 구축, 컨벤션 문서 작성 |

---

*마지막 업데이트: 2025-12-14*
