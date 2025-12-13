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
| **Phaser 3** | ^3.80.1 | 2D 게임 엔진 |
| **TypeScript** | ^5.3.3 | 타입 안정성 |
| **Vite** | ^5.4.11 | 번들러 & 개발 서버 |

---

## 📁 프로젝트 구조

```
BrainTouch/
├── src/
│   ├── main.ts              # 진입점 - Phaser 게임 인스턴스 생성
│   ├── game/
│   │   └── config.ts        # Phaser 게임 설정 (스케일, 물리엔진 등)
│   └── scenes/
│       └── MainScene.ts     # 메인 씬 (현재 타이틀 화면)
├── public/                  # 정적 에셋 (아직 없음)
│   └── assets/              # 이미지, 오디오, 폰트
├── index.html               # HTML 엔트리 (모바일 최적화 메타태그)
├── package.json             # 의존성 관리
├── tsconfig.json            # TypeScript 설정
├── vite.config.ts           # Vite 설정 (상대경로 빌드)
├── CONVENTION.md            # 브랜치/커밋 컨벤션 규칙
├── README.md                # 프로젝트 문서
└── CLAUDE.md                # 이 파일 (AI 컨텍스트)
```

---

## 📄 주요 파일 설명

### `src/main.ts`
- Phaser.Game 인스턴스 생성
- 윈도우 리사이즈 이벤트 핸들링

### `src/game/config.ts`
- Phaser 게임 설정 객체
- 스케일 모드: `Phaser.Scale.RESIZE` (반응형)
- 물리엔진: Arcade (gravity 없음)
- 멀티터치 3개 지원

### `src/scenes/MainScene.ts`
- 현재 유일한 씬
- 타이틀 텍스트 "🧠 Brain Touch" 표시
- 터치 시 콘솔 로그 출력 (추후 게임 씬으로 전환 예정)

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
- [x] 기본 프로젝트 구조 생성
- [x] 모바일 웹뷰 최적화 설정
- [x] 개발 컨벤션 문서 작성
- [x] GitHub 리포지토리 연결 및 초기 커밋

### 🔲 예정
- [ ] 게임 기획 및 디자인
- [ ] 게임 플레이 씬 구현
- [ ] 에셋 추가 (이미지, 사운드)
- [ ] 앱인토스 연동 테스트

---

## 🔗 관련 링크

- **GitHub**: https://github.com/rlatndud9090/BrainTouch (Private)
- **앱인토스 개발자 문서**: https://developers-apps-in-toss.toss.im/

---

## 📝 최근 변경 이력

| 날짜 | 작업 내용 |
|------|-----------|
| 2025-12-14 | 프로젝트 초기 환경 구축, 컨벤션 문서 작성 |

---

*마지막 업데이트: 2025-12-14*

