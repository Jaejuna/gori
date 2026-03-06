# COMMIT_CONVENTIONS.md — Git 커밋 컨벤션

> Conventional Commits v1.0 기반 + 프로젝트 맞춤 확장

---

## 1. 커밋 메시지 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### 필수 규칙
- **제목(subject)**: 영어, 소문자 시작, 마침표(.) 없음, **72자 이내**
- **scope**: 소문자, 하이픈(-)으로 구분
- **본문(body)**: 필요시 작성, 줄 바꿈으로 제목과 구분, 72자/줄 권장
- **footer**: Breaking change, Issue 링크 등

---

## 2. Type 목록

| Type | 사용 시기 | 예시 |
|------|----------|------|
| `feat` | 새 기능 추가 | `feat(auth): add teacher class code generation` |
| `fix` | 버그 수정 | `fix(recommendation): exclude already-solved questions` |
| `refactor` | 기능 변경 없는 코드 개선 | `refactor(ai): extract embedding service to separate module` |
| `test` | 테스트 추가/수정 | `test(api): add recommendation endpoint integration tests` |
| `docs` | 문서만 변경 | `docs: update AGENTS.md with pgvector setup notes` |
| `chore` | 빌드, 설정, 패키지 변경 | `chore: add Playwright E2E test configuration` |
| `style` | 코드 포맷, 세미콜론 등 (로직 변경 없음) | `style: format recommendation service with prettier` |
| `perf` | 성능 개선 | `perf(db): add composite index on Answer(userId, createdAt)` |
| `ci` | CI/CD 변경 | `ci: add coverage threshold check to GitHub Actions` |
| `revert` | 이전 커밋 되돌리기 | `revert: "feat(ai): add LLM integration"` |

---

## 3. Scope 목록 (프로젝트 맞춤)

| Scope | 해당 영역 |
|-------|---------|
| `auth` | 인증, 세션, 역할 관리 |
| `db` | Prisma 스키마, 마이그레이션, 시드 데이터 |
| `api` | API Routes 전반 |
| `student` | 학생 페이지, 학생 전용 컴포넌트 |
| `teacher` | 선생님 페이지, 선생님 전용 컴포넌트 |
| `ai` | AI 추천 엔진, 임베딩, LLM |
| `question` | 문제 관련 (조회, 풀기, 피드백) |
| `recommendation` | 추천 시스템 전반 |
| `analytics` | 오답 분석, 통계 |
| `ui` | 공용 컴포넌트, 스타일 |
| `ci` | GitHub Actions, 배포 |
| `test` | 테스트 설정, 테스트 파일 |

---

## 4. 실제 예시

### 기능 추가
```
feat(ai): implement 3-stage recommendation pipeline

- Stage 1: rule-based weak point analysis with time weighting
- Stage 2: HuggingFace embedding similarity search via pgvector
- Stage 3: Claude Haiku reason generation with daily limit (3/day)

Includes rule-based fallback when LLM is unavailable.
```

### 버그 수정
```
fix(recommendation): prevent duplicate recommendations on rapid answer submission

Multiple rapid answer submissions were triggering concurrent
recommendation refreshes, causing duplicate DB entries.
Fixed by adding unique constraint upsert and debouncing the trigger.
```

### 데이터베이스 변경
```
feat(db): add LlmUsage model for daily API call tracking

Adds LlmUsage table with (userId, date) unique constraint to
enforce 3 LLM calls per student per day limit.
```

### 테스트
```
test(ai): add unit tests for recommendation engine

- add tests for weighted score calculation
- add fallback behavior tests
- add duplicate exclusion tests

Coverage: lib/ai/recommendation.ts → 94%
```

### Ralph Loop 태스크 완료 커밋
```
feat(db): add Prisma schema with all models and initial migration

Implements TASK-002 from PROGRESS.md.

Models: User, Question, PassageType, TestSession, Answer,
Recommendation, LlmUsage

Includes pgvector extension for embedding similarity search.
All acceptance criteria verified:
- pnpm prisma migrate dev: ✓
- pnpm prisma generate: ✓
- unit tests: ✓ (3/3 pass)
```

---

## 5. Ralph Loop 커밋 규칙

Ralph Loop 에이전트는 각 태스크 완료 후 **단 하나의 커밋**을 생성합니다.

### 필수 포함 사항
1. 해당 태스크 ID 언급 (예: `Implements TASK-003`)
2. 완료된 acceptance criteria 목록 (`✓` 표시)
3. 테스트 통과 여부

### 커밋 전 체크리스트
```bash
# 커밋 전 반드시 실행
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

모든 명령어가 성공적으로 통과된 후에만 커밋합니다.

---

## 6. 금지 사항

```
# ❌ 금지: WIP 커밋
git commit -m "WIP"
git commit -m "fix"
git commit -m "update"

# ❌ 금지: 너무 많은 변경 하나의 커밋
git commit -m "feat: add auth, questions, recommendations, charts, tests"

# ❌ 금지: .env.local 포함
# .gitignore에 반드시 포함되어야 함

# ✅ 올바른 예: 명확하고 단일 목적
git commit -m "feat(auth): add teacher class code generation and validation"
```

---

## 7. .gitignore 필수 항목

```gitignore
# 환경 변수 (절대 커밋 금지)
.env
.env.local
.env.*.local

# Next.js 빌드
.next/
out/

# 의존성
node_modules/

# 테스트 결과
coverage/
playwright-report/
test-results/

# Prisma
prisma/migrations/20*/  # 마이그레이션은 커밋 O, 단 생성된 클라이언트는 X

# OS
.DS_Store
Thumbs.db
```
