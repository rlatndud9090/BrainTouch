# 📋 개발 컨벤션 가이드

> 앱인토스 게임 프로젝트의 브랜치 및 커밋 컨벤션 규칙

---

## 🌿 브랜치 전략 (GitHub Flow 기반)

### 브랜치 종류

| 브랜치 | 용도 | 예시 |
|--------|------|------|
| `main` | 프로덕션 배포 브랜치 (항상 배포 가능 상태) | - |
| `feature/*` | 새 기능 개발 | `feature/brain-touch-main-menu` |
| `fix/*` | 버그 수정 | `fix/brain-touch-touch-input` |
| `refactor/*` | 코드 리팩토링 (기능 변화 없음) | `refactor/brain-touch-scene-structure` |
| `docs/*` | 문서 작업 | `docs/readme-update` |
| `chore/*` | 빌드, 설정, 의존성 등 | `chore/update-phaser-version` |

### 브랜치 네이밍 규칙

```
<type>/<game-name>-<description>
```

- **type**: `feature`, `fix`, `refactor`, `docs`, `chore`
- **game-name**: 게임 식별자 (예: `brain-touch`, `puzzle-pop`)
- **description**: 케밥 케이스(kebab-case)로 간결하게

#### ✅ 좋은 예시
```
feature/brain-touch-game-over-screen
fix/brain-touch-score-calculation
refactor/puzzle-pop-asset-loader
```

#### ❌ 나쁜 예시
```
feature/newFeature          # 게임명 없음, camelCase 사용
Feature/BrainTouch/Menu     # 대문자, 슬래시 과다
fix_bug                     # 언더스코어 사용
```

---

## 💬 커밋 메시지 컨벤션 (Conventional Commits)

### 커밋 메시지 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type (필수)

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat(brain-touch): 메인 메뉴 씬 추가` |
| `fix` | 버그 수정 | `fix(brain-touch): 터치 입력 오작동 수정` |
| `docs` | 문서 수정 | `docs: README 업데이트` |
| `style` | 코드 포맷팅, 세미콜론 등 (로직 변경 X) | `style: 코드 포맷팅 적용` |
| `refactor` | 리팩토링 (기능 변화 X) | `refactor(brain-touch): 씬 구조 개선` |
| `test` | 테스트 코드 | `test: 점수 계산 유닛 테스트 추가` |
| `chore` | 빌드, 설정, 의존성 등 | `chore: Phaser 버전 업데이트` |
| `perf` | 성능 개선 | `perf(brain-touch): 에셋 로딩 최적화` |

### Scope (선택)

- 게임명 또는 영향받는 모듈
- 예: `brain-touch`, `puzzle-pop`, `common`, `config`

### Subject (필수)

- 명령형, 현재 시제로 작성 (예: "추가", "수정", "변경")
- 첫 글자 소문자 (한글일 경우 무관)
- 마침표 없음
- 50자 이내 권장

### 커밋 예시

```bash
# 새 기능 추가
git commit -m "feat(brain-touch): 게임 오버 화면 추가"

# 버그 수정
git commit -m "fix(brain-touch): 점수가 음수로 표시되는 버그 수정"

# 리팩토링
git commit -m "refactor(brain-touch): MainScene 코드 분리"

# 설정 변경
git commit -m "chore: vite 빌드 설정 최적화"

# 초기 세팅
git commit -m "chore: 프로젝트 초기 환경 구축"
```

---

## 🔀 PR (Pull Request) 규칙

### PR 제목

커밋 메시지와 동일한 형식 사용:
```
feat(brain-touch): 메인 메뉴 및 게임 플레이 씬 구현
```

### PR 본문 템플릿

```markdown
## 📋 작업 내용
- 구현한 기능 또는 수정 사항 설명

## 🎯 관련 이슈
- closes #이슈번호

## 📸 스크린샷 (선택)
- UI 변경 시 첨부

## ✅ 체크리스트
- [ ] 로컬에서 테스트 완료
- [ ] 모바일 터치 테스트 완료
- [ ] `npm run build` 통과
```

---

## 📁 폴더 구조 규칙

```
src/
├── App.tsx                    # 라우팅 루트
├── main.tsx                   # React 진입점
├── assets/                    # 스프라이트/아이콘 등 정적 리소스
├── components/                # 공통 React 컴포넌트
├── pages/                     # Home/Game/Share 페이지
├── shared/                    # 공통 상수/유틸/공유 로직
└── games/                     # 게임별 모듈
    └── <game-id>/
        ├── config.ts          # 게임별 Phaser 설정
        ├── scenes/            # GameScene / ResultScene
        └── utils/             # 게임 로직 유틸
```

---

## 🏷️ 버전 관리 (Semantic Versioning)

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: 호환되지 않는 큰 변경
- **MINOR**: 하위 호환 기능 추가
- **PATCH**: 하위 호환 버그 수정

예: `1.0.0` → `1.1.0` (기능 추가) → `1.1.1` (버그 수정)

---

## ⚡ 빠른 참조

```bash
# 새 기능 브랜치 생성
git checkout -b feature/brain-touch-new-feature

# 커밋
git commit -m "feat(brain-touch): 새 기능 설명"

# 푸쉬
git push origin feature/brain-touch-new-feature

# PR 생성 후 main에 머지
```

---

> 📌 이 규칙은 팀 상황에 따라 유연하게 조정 가능합니다.
