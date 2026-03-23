# 🧠 Brain Touch

앱인토스(App-in-Toss) 플랫폼용 숫자 두뇌 게임 모음

## 기술 스택

- **Phaser 3** - 2D 게임 엔진
- **React 18 + React Router** - 화면/라우팅
- **TypeScript** - 타입 안정성
- **Vite** - 빠른 개발 서버 & 번들러
- **Tailwind CSS** - UI 스타일링
- **Capacitor (Android)** - 모바일 패키징

## 시작하기

### 의존성 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 으로 접속

### 프로덕션 빌드

```bash
npm run build
```

`dist/` 폴더에 빌드 결과물 생성

### 빌드 미리보기

```bash
npm run preview
```

## 프로젝트 구조

```
BrainTouch/
├── src/
│   ├── assets/                # 스프라이트/아이콘 등 정적 리소스
│   ├── components/            # React 컴포넌트 (PhaserGame, GameCard)
│   ├── games/                 # 게임별 모듈
│   │   └── <game-id>/
│   │       ├── config.ts      # 해당 게임 Phaser 설정
│   │       ├── scenes/        # GameScene / ResultScene 등
│   │       └── utils/         # 게임별 로직 유틸
│   ├── pages/                 # 라우트 페이지 (Home, Game)
│   ├── shared/                # 공통 UI/상수 로직
│   ├── App.tsx                # 라우팅 루트
│   └── main.tsx               # React 진입점
├── android/                   # Capacitor Android 프로젝트
├── dist/                # 빌드 결과물
├── index.html           # HTML 템플릿
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 앱인토스 배포

빌드 후 `dist/` 폴더의 내용물을 웹 서버에 배포하고,
토스 앱인토스 설정에서 해당 URL을 웹뷰로 연결하면 됩니다.
