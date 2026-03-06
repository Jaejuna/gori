# AGENTS.md — AI Agent Instructions for Ralph Loop

> **이 파일은 Ralph Loop 에이전트가 매 이터레이션 시작 시 반드시 읽어야 하는 핵심 지침서입니다.**
> 모든 에이전트 지시사항은 이 파일 + `PROGRESS.md` 를 기준으로 동작합니다.

---

## 0. 플러그인 실행 정보 (Claude Code Ralph Wiggum Plugin)

이 프로젝트는 **Claude Code Ralph Wiggum 플러그인**(`/ralph-loop` 슬래시 커맨드)으로 실행됩니다.

### 실행 커맨드
```
/ralph-loop "Read AGENTS.md and PROGRESS.md. Find the first task where passes=false. Implement it fully. Run pnpm typecheck && pnpm lint && pnpm test && pnpm build. If all pass, commit with conventional commit message and update PROGRESS.md passes to true. If all tasks are complete, output <promise>COMPLETE</promise>." --completion-promise "COMPLETE" --max-iterations 20
```

### 플러그인 동작 원리
- Stop 훅이 Claude의 종료 시도를 가로채 **동일 프롬프트를 자동 재주입**
- 매 이터레이션은 **새 컨텍스트**로 시작 → 이 파일과 `PROGRESS.md`가 유일한 상태 저장소
- `<promise>COMPLETE</promise>` 출력 시 루프 자동 종료
- 중단: `/cancel-ralph`

### 에이전트 필수 준수사항
- 종료 전 반드시 `PROGRESS.md`의 해당 태스크 `passes: true` 업데이트
- 완료 신호는 반드시 정확히 `<promise>COMPLETE</promise>` 로 출력 (변형 금지)

---

## 1. 프로젝트 컨텍스트

이 프로젝트는 **수능 국어 AI 취약 문제 추천 시스템**입니다.

- **스택:** Next.js 14 (App Router) + Prisma + PostgreSQL(Neon) + NextAuth.js
- **AI:** HuggingFace 임베딩(무료) + Claude Haiku / GPT-4o-mini (유료 fallback 구조)
- **배포:** Vercel (경량 배포 최우선)
- **패키지 매니저:** `pnpm` (반드시 사용, npm/yarn 금지)
- **상세 스펙:** `PRD.md` 참조
- **태스크 목록:** `PROGRESS.md` 참조

---

## 2. 이터레이션 규칙 (Ralph Loop Core Rules)

### 2.1 매 이터레이션 시작 시
1. `PROGRESS.md`를 읽고 `passes: false`인 첫 번째 태스크를 선택
2. `AGENTS.md` (이 파일)을 읽어 컨벤션 숙지
3. **한 번에 하나의 태스크만** 구현
4. 구현 → 테스트 → 커밋 → `PROGRESS.md` 업데이트 → 종료

### 2.2 완료 기준
- 태스크의 모든 `acceptance_criteria`를 만족해야 `passes: true`로 표시
- 테스트가 실패하면 `passes: false` 유지, 실패 원인을 `notes`에 기록
- 모든 태스크 `passes: true` → `<promise>COMPLETE</promise>` 출력 후 종료

### 2.3 절대 하지 말 것
- ❌ 여러 태스크를 한 이터레이션에 동시 처리
- ❌ 테스트 없이 `passes: true` 마킹
- ❌ `.env.local` 파일을 git에 커밋
- ❌ `pnpm` 대신 `npm` 또는 `yarn` 사용
- ❌ `any` 타입 남용 (TypeScript strict mode 필수)
- ❌ 콘솔에 민감 정보(API Key, 비밀번호) 출력

---

## 3. 프로젝트 구조 (Directory Structure)

```
suneung-ai/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 레이아웃 그룹
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (student)/                # 학생 레이아웃 그룹
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── test/page.tsx
│   │   ├── test/[questionId]/page.tsx
│   │   └── recommendations/page.tsx
│   ├── (teacher)/                # 선생님 레이아웃 그룹
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── students/page.tsx
│   │   └── students/[studentId]/page.tsx
│   └── api/                      # API Routes
│       ├── auth/[...nextauth]/route.ts
│       ├── questions/route.ts
│       ├── answers/route.ts
│       ├── recommendations/route.ts
│       └── analytics/route.ts
├── components/                   # 공유 컴포넌트
│   ├── ui/                       # shadcn/ui 기반 기본 컴포넌트
│   ├── charts/                   # Recharts 래퍼 컴포넌트
│   ├── question/                 # 문제 표시 관련 컴포넌트
│   └── layout/                   # 헤더, 사이드바 등
├── lib/                          # 유틸리티 & 서비스
│   ├── auth.ts                   # NextAuth 설정
│   ├── db.ts                     # Prisma 클라이언트 싱글톤
│   ├── ai/
│   │   ├── embeddings.ts         # HuggingFace 임베딩 서비스
│   │   ├── recommendation.ts     # 추천 엔진 메인
│   │   └── llm.ts                # Claude/GPT 클라이언트
│   └── utils.ts
├── prisma/
│   ├── schema.prisma             # DB 스키마
│   ├── migrations/               # 마이그레이션 파일
│   └── seed/
│       ├── index.ts              # 시드 엔트리포인트
│       └── questions/            # 문제 JSON 데이터
│           ├── 2024_11.json
│           └── ...
├── types/                        # TypeScript 타입 정의
│   ├── index.ts
│   ├── question.ts
│   └── recommendation.ts
├── hooks/                        # React 커스텀 훅
├── stores/                       # Zustand 스토어
├── __tests__/                    # 테스트 파일
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                         # 문서
├── .github/
│   └── workflows/
│       └── ci.yml                # GitHub Actions CI
├── AGENTS.md                     # ← 이 파일
├── PROGRESS.md                   # Ralph Loop 태스크 목록
├── PRD.md                        # 제품 요구사항
├── .env.local.example            # 환경 변수 템플릿
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
└── playwright.config.ts
```

---

## 4. 코딩 컨벤션 (Coding Conventions)

### 4.1 TypeScript
```typescript
// ✅ 올바른 예시
interface Question {
  id: string;
  year: number;
  month: 6 | 11;
  passageType: PassageType;
}

// ❌ 금지: any 사용
const data: any = fetchData(); // 금지

// ✅ unknown 사용 후 타입 가드
const data: unknown = fetchData();
if (isQuestion(data)) { ... }
```

### 4.2 파일 네이밍
| 항목 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `QuestionCard.tsx` |
| 훅 | camelCase, `use` 접두사 | `useRecommendations.ts` |
| 유틸리티 | camelCase | `formatScore.ts` |
| 상수 | UPPER_SNAKE_CASE | `PASSAGE_TYPES.ts` |
| API 라우트 | lowercase | `route.ts` |

### 4.3 컴포넌트 작성 규칙
```typescript
// ✅ 올바른 컴포넌트 패턴
interface QuestionCardProps {
  question: Question;
  onAnswer: (optionIndex: number) => void;
  isLoading?: boolean;
}

export function QuestionCard({ question, onAnswer, isLoading = false }: QuestionCardProps) {
  // ...
}

// ✅ Server Component vs Client Component 명확히 구분
// 상단에 'use client' 없으면 Server Component
// 이벤트 핸들러, useState, useEffect 있으면 반드시 'use client'
```

### 4.4 API 라우트 패턴
```typescript
// ✅ 표준 API 응답 형식
type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code: string;
};

// ✅ 에러 처리 필수
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return Response.json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }
    // ...
  } catch (error) {
    console.error('[API Error]', error);
    return Response.json({ success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
```

### 4.5 Prisma 사용 규칙
```typescript
// ✅ lib/db.ts의 싱글톤 클라이언트 사용
import { db } from '@/lib/db';

// ✅ select로 필요한 필드만 조회
const question = await db.question.findUnique({
  where: { id },
  select: { id: true, content: true, options: true, passageType: true },
});

// ❌ 금지: 매번 새 PrismaClient 생성
const prisma = new PrismaClient(); // 금지
```

---

## 5. 환경 변수 (Environment Variables)

`.env.local.example` 파일을 참조하여 `.env.local` 생성:

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."   # Neon 필수

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# AI - LLM
ANTHROPIC_API_KEY="..."         # Claude Haiku
OPENAI_API_KEY="..."            # GPT-4o-mini fallback (선택)

# AI - Embeddings
HUGGINGFACE_API_KEY="..."       # HuggingFace Inference API

# Feature Flags
NEXT_PUBLIC_USE_LLM="true"      # false면 rule-based만 사용
```

---

## 6. 테스트 실행 방법

```bash
# 단위/통합 테스트 (Vitest)
pnpm test

# 특정 파일만
pnpm test recommendation.test.ts

# 테스트 커버리지 (80% 이상 유지)
pnpm test:coverage

# E2E 테스트 (Playwright)
pnpm test:e2e

# 타입 체크
pnpm typecheck

# 린트
pnpm lint
```

### 6.1 태스크 완료 체크리스트
태스크를 `passes: true`로 마킹하기 전 반드시 확인:

```bash
pnpm typecheck   # TypeScript 오류 없음
pnpm lint        # ESLint 오류 없음
pnpm test        # 관련 테스트 모두 통과
pnpm build       # 빌드 성공
```

---

## 7. 데이터베이스 마이그레이션 절차

```bash
# 스키마 변경 후
pnpm prisma migrate dev --name [변경_내용_설명]

# 프로덕션 배포 시
pnpm prisma migrate deploy

# 클라이언트 재생성
pnpm prisma generate

# 시드 데이터 적재
pnpm prisma db seed
```

---

## 8. 발견된 패턴 및 주의사항 (Learnings — 에이전트가 업데이트)

> 이 섹션은 Ralph Loop 에이전트가 각 이터레이션에서 발견한 패턴, 주의사항, 해결책을 누적 기록합니다.
> 새 에이전트 인스턴스가 이 섹션을 읽어 과거 실수를 반복하지 않도록 합니다.

### 초기 설정 주의사항
- Neon PostgreSQL은 `DATABASE_URL` 외에 `DIRECT_URL`이 반드시 필요 (Prisma 마이그레이션)
- `pgvector` extension은 Neon 대시보드에서 수동 활성화 필요
- Next.js App Router에서 `cookies()`는 Server Component와 Route Handler에서만 사용 가능
- shadcn/ui 설치 시: `pnpm dlx shadcn@latest init`

### AI 서비스 주의사항
- HuggingFace 무료 티어는 cold start로 첫 응답 10–30초 소요 → 타임아웃 30초로 설정
- Claude Haiku 응답은 항상 JSON 파싱 실패 케이스 처리 필요
- 임베딩 벡터는 768차원 (ko-sroberta-multitask 기준)

<!-- 에이전트: 아래에 발견한 패턴을 추가하세요 -->
