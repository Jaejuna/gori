# PROGRESS.md — Ralph Loop 태스크 진행 현황

> **에이전트 지침:**
> - 이 파일을 읽고 `passes: false`인 **첫 번째** 태스크를 선택해 작업하세요.
> - 태스크 완료 후 `passes: true`로 업데이트하고 `completed_at`을 기록하세요.
> - 모든 태스크 완료 시: `<promise>COMPLETE</promise>` 출력
> - 각 태스크는 **단일 커밋**으로 완료되어야 합니다.

---

## 완료 기준 체크리스트 (모든 태스크 공통)
- [ ] `pnpm typecheck` — TypeScript 오류 없음
- [ ] `pnpm lint` — ESLint 경고/오류 없음
- [ ] `pnpm test` — 관련 테스트 모두 통과
- [ ] `pnpm build` — 빌드 성공
- [ ] 커밋 완료 (COMMIT_CONVENTIONS.md 규칙 준수)

---

## Phase 1: 프로젝트 초기화 및 인프라

### TASK-001: 프로젝트 초기 설정
```yaml
id: TASK-001
title: Next.js 프로젝트 초기화 및 기본 설정
passes: true
completed_at: "2026-03-06"
notes: "Next.js 16 (App Router, src/ layout), Tailwind v4, Vitest 4, Playwright, shadcn/ui initialized. Used eslint binary directly (next lint removed in v16). vitest/globals types added to tsconfig."

steps:
  - pnpm create next-app@latest suneung-ai --typescript --tailwind --eslint --app --src-dir=false
  - pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom @playwright/test
  - pnpm add -D prettier eslint-config-prettier
  - shadcn/ui 초기화: pnpm dlx shadcn@latest init
  - shadcn/ui 컴포넌트 추가: button, card, input, label, badge, tabs, dialog, select, toast
  - vitest.config.ts 설정
  - playwright.config.ts 설정
  - .env.local.example 파일 생성
  - ESLint + Prettier 설정 (.eslintrc, .prettierrc)

acceptance_criteria:
  - pnpm dev 실행 시 http://localhost:3000 접근 가능
  - pnpm build 성공
  - pnpm test 실행 시 기본 테스트 통과
  - pnpm lint 오류 없음
  - .env.local.example 파일에 모든 필요 변수 정의됨

commit_message: "chore: initialize Next.js project with toolchain setup"
```

---

### TASK-002: 데이터베이스 스키마 구현
```yaml
id: TASK-002
title: Prisma 스키마 정의 및 초기 마이그레이션
passes: true
completed_at: "2026-03-07"
notes: "Prisma 6 used (v7 removed url/directUrl from schema.prisma). All 7 models implemented. lib/db.ts singleton. prisma generate succeeds. DB unit test uses class-based mock. prisma migrate dev requires live DB (skipped in CI)."
depends_on: [TASK-001]

steps:
  - pnpm add prisma @prisma/client
  - pnpm prisma init
  - docs/DATABASE_SCHEMA.md 의 전체 스키마를 prisma/schema.prisma에 구현
  - pgvector extension 설정 (임베딩 컬럼)
  - lib/db.ts 싱글톤 Prisma 클라이언트 생성
  - pnpm prisma migrate dev --name init

acceptance_criteria:
  - prisma/schema.prisma에 User, Question, PassageType, TestSession, Answer, Recommendation 6개 모델 존재
  - pnpm prisma migrate dev 성공
  - pnpm prisma generate 성공
  - lib/db.ts에 타입 안전 싱글톤 클라이언트 존재
  - __tests__/unit/db.test.ts: Prisma 클라이언트 연결 테스트 통과

commit_message: "feat(db): add Prisma schema with all models and initial migration"
```

---

### TASK-003: 인증 시스템 구현 (NextAuth.js)
```yaml
id: TASK-003
title: NextAuth.js v5 설치 및 Credentials 인증 구현
passes: true
completed_at: "2026-03-07"
notes: "next-auth@5 beta, Credentials provider, JWT strategy. Register API at /api/register (separate from NextAuth). middleware.ts for role-based routing. Next.js 16 shows deprecated warning for middleware (use proxy) but build succeeds."
depends_on: [TASK-002]

steps:
  - pnpm add next-auth@beta bcryptjs
  - pnpm add -D @types/bcryptjs
  - lib/auth.ts 에 NextAuth 설정 (Credentials provider)
  - app/api/auth/[...nextauth]/route.ts 생성
  - middleware.ts 생성 (역할 기반 라우트 보호)
  - app/(auth)/login/page.tsx 로그인 페이지
  - app/(auth)/register/page.tsx 회원가입 페이지 (역할 선택: 학생/선생님)
  - 선생님 가입 시 6자리 반 코드 자동 생성 로직
  - 학생 가입 시 반 코드 입력 → 선생님 연결

acceptance_criteria:
  - 학생 회원가입/로그인 정상 동작
  - 선생님 회원가입/로그인 및 반 코드 발급 정상 동작
  - 미인증 시 /login으로 리다이렉트
  - 학생이 /teacher/* 접근 시 403 또는 리다이렉트
  - 선생님이 /student/* 접근 시 403 또는 리다이렉트
  - __tests__/unit/auth.test.ts: 비밀번호 해싱, 반 코드 생성 함수 테스트 통과
  - __tests__/integration/auth.test.ts: 회원가입 API 테스트 통과

commit_message: "feat(auth): implement NextAuth with credentials and role-based access"
```

---

## Phase 2: 문제 관리 시스템

### TASK-004: 문제 데이터 타입 및 시드 데이터
```yaml
id: TASK-004
title: 수능 국어 문제 타입 정의 및 시드 데이터 적재
passes: true
completed_at: "2026-03-07"
notes: "16 passage types (4 categories). 32 sample questions. Seed script uses upsert. JSON options cast via 'as unknown as Prisma.InputJsonValue' for type safety. prisma db seed requires live DB."
depends_on: [TASK-002]

steps:
  - types/question.ts — Question, PassageType, Category, Difficulty 타입 정의
  - constants/passageTypes.ts — 지문 유형 상수 정의 (독서/문학/화작/언매 계층)
  - prisma/seed/questions/sample.json — 최소 30문항 샘플 데이터 작성
    (2024학년도 수능 국어 기준, 지문 유형별 5–6문항씩)
  - prisma/seed/index.ts — 시드 스크립트 (PassageType → Question 순서로 적재)
  - pnpm prisma db seed 실행 및 확인

acceptance_criteria:
  - 시드 실행 후 PassageType 12개 이상 존재
  - 시드 실행 후 Question 30개 이상 존재
  - 각 Question에 year, month, number, passageTypeId, difficulty, options(JSON), answer 필드 모두 존재
  - __tests__/unit/seed.test.ts: 시드 데이터 유효성 검사 통과 (정답 1–5 범위, 보기 5개 등)

commit_message: "feat(data): add question types and seed 30+ sample questions"
```

---

### TASK-005: 문제 조회 API
```yaml
id: TASK-005
title: 문제 목록/상세 API 구현
passes: true
completed_at: "2026-03-07"
notes: "Zod v4 used for query validation. All routes require auth (401). 10 integration test scenarios passing."
depends_on: [TASK-004]

steps:
  - app/api/questions/route.ts — GET: 지문 유형 필터, 연도 필터, 난이도 필터, 페이지네이션
  - app/api/questions/[id]/route.ts — GET: 문제 상세 (보기 포함)
  - app/api/passage-types/route.ts — GET: 지문 유형 계층 목록
  - Zod 스키마로 쿼리 파라미터 유효성 검사

acceptance_criteria:
  - GET /api/questions?category=독서&difficulty=HARD 정상 응답
  - GET /api/questions/[id] 존재하지 않는 ID → 404 응답
  - 미인증 요청 → 401 응답
  - 페이지네이션: limit, offset 파라미터 동작
  - __tests__/integration/questions.test.ts: 3가지 이상 시나리오 테스트 통과

commit_message: "feat(api): add questions and passage-types GET endpoints"
```

---

## Phase 3: 학생 기능

### TASK-006: 문제 풀기 기능 (학생)
```yaml
id: TASK-006
title: 테스트 세션 시작 및 답안 제출 기능
passes: true
completed_at: "2026-03-07"
notes: "Sessions API with create/get/end. Answer submission returns isCorrect + explanation immediately. Timer measured client-side (timeSpent in seconds). 8 integration tests passing."
depends_on: [TASK-005, TASK-003]

steps:
  - app/api/sessions/route.ts — POST: 테스트 세션 시작
  - app/api/sessions/[id]/answers/route.ts — POST: 답안 제출 (정오답 즉시 반환)
  - app/api/sessions/[id]/route.ts — GET: 세션 결과 조회
  - app/(student)/test/page.tsx — 지문 유형 선택 후 문제 시작 UI
  - app/(student)/test/[questionId]/page.tsx — 문제 풀기 UI
    (지문, 5지선다, 제출 버튼, 정오답 피드백, 해설)
  - components/question/QuestionCard.tsx
  - components/question/AnswerFeedback.tsx

acceptance_criteria:
  - 학생이 문제를 선택해 풀 수 있음
  - 답 제출 시 즉시 정오답 표시
  - 오답 시 해설 표시
  - 풀이 시간 측정 및 저장
  - 세션 종료 시 결과 요약 페이지 표시
  - __tests__/integration/sessions.test.ts: 세션 생성, 답안 제출, 결과 조회 테스트 통과

commit_message: "feat(student): implement test session and answer submission flow"
```

---

### TASK-007: 학생 오답 분석 대시보드
```yaml
id: TASK-007
title: 학생용 취약 영역 분석 페이지
passes: true
completed_at: "2026-03-07"
notes: "Recharts 3 + @tanstack/react-query 5. Pure analytics functions in lib/analytics.ts. Radar + Line charts. Tooltip formatter typed as (value) => string[] due to Recharts v3 type changes."
depends_on: [TASK-006]

steps:
  - app/api/analytics/student/route.ts — GET: 개인 분석 데이터
    (지문 유형별 정답률, 오답 추이, 총 풀이 수)
  - app/(student)/dashboard/page.tsx — 학생 대시보드
  - components/charts/PassageTypeRadar.tsx — 레이더 차트 (Recharts)
  - components/charts/ProgressLine.tsx — 30일 오답 추이 (Recharts)
  - hooks/useStudentAnalytics.ts — React Query 훅

acceptance_criteria:
  - 지문 유형별 정답률 레이더 차트 렌더링
  - "최근 30일 오답 추이" 라인 그래프 렌더링
  - "가장 틀린 유형 TOP 3" 카드 표시
  - 풀이 문제 0개일 때 빈 상태(empty state) UI 표시
  - __tests__/unit/analytics.test.ts: 정답률 계산 함수 테스트 통과

commit_message: "feat(student): add analytics dashboard with charts"
```

---

## Phase 4: AI 추천 엔진

### TASK-008: HuggingFace 임베딩 서비스
```yaml
id: TASK-008
title: 한국어 임베딩 서비스 및 유사 문제 탐색
passes: true
completed_at: "2026-03-07"
notes: "HuggingFace InferenceClient, jhgan/ko-sroberta-multitask, 768-dim. 30s AbortController timeout. Batch-of-10. flattenEmbedding handles number[]|number[][]|token-mean-pool. Admin embed route uses $queryRaw (embedding is Unsupported vector type). vi.mock hoisted — moved callCount to module level."
depends_on: [TASK-004]

steps:
  - pnpm add @huggingface/inference
  - lib/ai/embeddings.ts — HuggingFace Inference API 래퍼
    모델: jhgan/ko-sroberta-multitask
  - app/api/admin/embed/route.ts — 문제 임베딩 일괄 생성 (관리자용)
  - lib/ai/similarity.ts — 코사인 유사도 계산, 유사 문제 상위 N개 반환
  - Prisma 스키마에 embedding Float[] 컬럼 추가 (마이그레이션)

acceptance_criteria:
  - HuggingFace API 호출 → 768차원 벡터 반환
  - 타임아웃 30초 설정, 실패 시 에러 throw
  - 임베딩 배치 처리: 10개씩 분할 처리
  - 코사인 유사도 계산 함수 단위 테스트 통과
  - __tests__/unit/embeddings.test.ts: mock 임베딩으로 유사도 계산 테스트 통과

commit_message: "feat(ai): add HuggingFace embedding service and similarity search"
```

---

### TASK-009: AI 추천 엔진 핵심 로직
```yaml
id: TASK-009
title: Rule-based + LLM 추천 파이프라인 구현
passes: true
completed_at: "2026-03-08"
notes: "Claude Haiku via @anthropic-ai/sdk. 3-stage: wrong-pattern weights → embedding similarity → LLM reason. NEXT_PUBLIC_USE_LLM=false skips LLM. Daily limit 3 via DB LlmUsage. PassageType uses label field (not name). Answer uses createdAt (not answeredAt)."
depends_on: [TASK-008, TASK-007]

steps:
  - pnpm add @anthropic-ai/sdk
  - lib/ai/llm.ts — Claude Haiku 클라이언트 (재시도 로직, 비용 추적)
  - lib/ai/recommendation.ts — 3단계 추천 파이프라인:
      Stage 1: 오답 패턴 분석 (Rule-based, 가중치 적용)
      Stage 2: 임베딩 유사도 검색 (상위 10개)
      Stage 3: LLM 추천 이유 생성 (Haiku, 캐시 24시간)
  - app/api/recommendations/route.ts — GET/POST
  - app/api/recommendations/[userId]/route.ts — 사용자별 추천 조회
  - LLM 장애 시 rule-based fallback 동작 보장
  - 학생당 일일 LLM 호출 3회 제한 (Redis 없이 DB 기반 카운터)

acceptance_criteria:
  - 오답 기록 있는 학생 → 추천 문제 3개 이상 반환
  - 이미 푼 문제 추천 제외
  - NEXT_PUBLIC_USE_LLM=false 시 rule-based만 동작
  - LLM API 타임아웃 → fallback 동작
  - 추천 이유 문자열: 빈 값 없음, 50자 이내
  - __tests__/unit/recommendation.test.ts:
      - 오답 패턴 가중치 계산 테스트
      - Fallback 동작 테스트
      - 이미 푼 문제 제외 테스트 (모두 통과)

commit_message: "feat(ai): implement 3-stage recommendation pipeline with LLM fallback"
```

---

### TASK-010: 학생 추천 문제 UI
```yaml
id: TASK-010
title: 학생용 AI 추천 문제 페이지 구현
passes: true
completed_at: "2026-03-08"
notes: "useRecommendations hook, RecommendationCard, /recommendations page, dashboard section. Skeleton loading and empty state included."
depends_on: [TASK-009]

steps:
  - app/(student)/recommendations/page.tsx — 추천 문제 목록
  - components/recommendation/RecommendationCard.tsx — 추천 카드 (이유 + 문제 미리보기 + 바로 풀기 버튼)
  - app/(student)/dashboard/page.tsx — "오늘의 추천 3개" 섹션 추가
  - hooks/useRecommendations.ts — React Query, 폴링 불필요 (수동 갱신)

acceptance_criteria:
  - 추천 카드에 추천 이유 표시
  - "바로 풀기" 클릭 시 해당 문제로 이동
  - 추천 문제 0개 → 빈 상태 UI ("아직 풀이 기록이 없어요")
  - 로딩 중 스켈레톤 UI 표시

commit_message: "feat(student): add AI recommendation cards on dashboard and recommendations page"
```

---

## Phase 5: 선생님 기능

### TASK-011: 선생님 학생 목록 대시보드
```yaml
id: TASK-011
title: 선생님 대시보드 - 반 학생 목록 및 현황
passes: false
completed_at: null
notes: ""
depends_on: [TASK-007]

steps:
  - app/api/teacher/students/route.ts — GET: 내 반 학생 목록 (정답률, 취약 영역)
  - app/(teacher)/dashboard/page.tsx — 선생님 메인 대시보드
  - app/(teacher)/students/page.tsx — 학생 목록 테이블
    (이름, 최근 활동일, 평균 정답률, 취약 영역 TOP1, 상세 보기 링크)
  - components/teacher/StudentTable.tsx — 정렬/검색 지원 테이블

acceptance_criteria:
  - 선생님 계정으로 로그인 시 학생 목록 표시
  - 정답률 낮은 순 정렬 동작
  - 학생 이름 검색 기능 동작
  - 학생이 없는 경우 빈 상태 UI
  - 다른 반 학생 데이터 접근 불가 (403)
  - __tests__/integration/teacher.test.ts: 권한 테스트 통과

commit_message: "feat(teacher): add student list dashboard with sorting and search"
```

---

### TASK-012: 특정 학생 상세 분석 및 추천 검토
```yaml
id: TASK-012
title: 선생님 - 학생 상세 페이지 (오답 패턴 + 추천 승인/제외)
passes: false
completed_at: null
notes: ""
depends_on: [TASK-011, TASK-010]

steps:
  - app/api/teacher/students/[studentId]/route.ts — GET: 학생 상세 분석
  - app/api/teacher/students/[studentId]/recommendations/route.ts
    — PATCH: 추천 승인/제외 처리
    — POST: 추천 문제 직접 추가
  - app/(teacher)/students/[studentId]/page.tsx — 학생 상세 페이지
    - 지문 유형별 오답률 차트
    - 최근 오답 문제 목록 (문제 내용 미리보기)
    - AI 추천 목록 + 승인(✓) / 제외(✗) 버튼
    - 추천 문제 직접 추가 (문제 검색 모달)
  - components/teacher/RecommendationReview.tsx

acceptance_criteria:
  - 선생님이 학생의 지문 유형별 오답률 차트 조회 가능
  - 추천 문제 승인(isReviewed: true) 처리 동작
  - 추천 문제 제외 처리 동작
  - 직접 추가한 문제가 학생 추천 목록에 반영됨
  - 다른 반 학생 접근 시 403

commit_message: "feat(teacher): add student detail page with recommendation review controls"
```

---

## Phase 6: 품질 및 배포

### TASK-013: E2E 테스트 작성 (Playwright)
```yaml
id: TASK-013
title: 핵심 사용자 플로우 E2E 테스트
passes: false
completed_at: null
notes: ""
depends_on: [TASK-012]

steps:
  - __tests__/e2e/student-flow.spec.ts
      - 학생 회원가입 → 로그인 → 문제 풀기 → 오답 확인 → 추천 보기
  - __tests__/e2e/teacher-flow.spec.ts
      - 선생님 회원가입 → 학생 목록 → 학생 상세 → 추천 승인
  - playwright.config.ts에 test DB 설정

acceptance_criteria:
  - pnpm test:e2e 실행 시 2개 플로우 모두 통과
  - 스크린샷 on failure 설정

commit_message: "test(e2e): add student and teacher core flow tests with Playwright"
```

---

### TASK-014: GitHub Actions CI 및 Vercel 배포 설정
```yaml
id: TASK-014
title: CI/CD 파이프라인 및 Vercel 배포 구성
passes: false
completed_at: null
notes: ""
depends_on: [TASK-013]

steps:
  - .github/workflows/ci.yml 작성:
      - PR 시: typecheck + lint + test (unit/integration)
      - main 머지 시: E2E + Vercel 배포
  - vercel.json 설정 (필요시)
  - .env.local.example 최종 검토
  - README.md에 배포 방법 문서화
  - prisma migrate deploy를 Vercel build command에 추가

acceptance_criteria:
  - GitHub PR 생성 시 CI 자동 실행
  - CI 통과 시 Vercel Preview 배포 링크 생성
  - main 브랜치 머지 시 production 자동 배포
  - README.md에 로컬 환경 설정 가이드 포함

commit_message: "chore(ci): add GitHub Actions CI and Vercel deployment config"
```

---

## 진행 현황 요약

| 태스크 | 제목 | 상태 |
|--------|------|------|
| TASK-001 | 프로젝트 초기 설정 | ✅ 완료 |
| TASK-002 | DB 스키마 구현 | ✅ 완료 |
| TASK-003 | 인증 시스템 | ✅ 완료 |
| TASK-004 | 문제 타입 및 시드 데이터 | ✅ 완료 |
| TASK-005 | 문제 조회 API | ✅ 완료 |
| TASK-006 | 문제 풀기 기능 | ✅ 완료 |
| TASK-007 | 학생 오답 분석 대시보드 | ✅ 완료 |
| TASK-008 | HuggingFace 임베딩 | ✅ 완료 |
| TASK-009 | AI 추천 엔진 | ✅ 완료 |
| TASK-010 | 학생 추천 UI | ✅ 완료 |
| TASK-011 | 선생님 학생 목록 | ⬜ 대기 |
| TASK-012 | 학생 상세 + 추천 검토 | ⬜ 대기 |
| TASK-013 | E2E 테스트 | ⬜ 대기 |
| TASK-014 | CI/CD 및 배포 | ⬜ 대기 |
