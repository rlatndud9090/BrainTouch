# 🧠 Brain Touch

앱인토스(App-in-Toss) 플랫폼용 Phaser3 게임

## 기술 스택

- **Phaser 3** - 2D 게임 엔진
- **TypeScript** - 타입 안정성
- **Vite** - 빠른 개발 서버 & 번들러

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
│   ├── main.ts          # 진입점
│   ├── game/
│   │   └── config.ts    # Phaser 게임 설정
│   └── scenes/
│       └── MainScene.ts # 메인 씬
├── public/              # 정적 에셋 (추후 생성)
├── dist/                # 빌드 결과물
├── index.html           # HTML 템플릿
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 앱인토스 배포

빌드 후 `dist/` 폴더의 내용물을 웹 서버에 배포하고,
토스 앱인토스 설정에서 해당 URL을 웹뷰로 연결하면 됩니다.

