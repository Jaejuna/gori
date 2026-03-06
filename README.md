# 수능 국어 AI 취약 문제 추천 시스템

> 학생의 오답 패턴을 AI로 분석해 수능 국어 기출 문제를 맞춤 추천하는 웹 앱

---

## 빠른 시작

### 로컬 환경 설정

```bash
# 1. 저장소 클론
git clone https://github.com/[username]/suneung-ai.git
cd suneung-ai

# 2. 의존성 설치 (pnpm 필수)
pnpm install

# 3. 환경 변수 설정
cp .env.local.example .env.local
# .env.local 편집 후 아래 값 채우기:
# DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY, HUGGINGFACE_API_KEY

# 4. DB 설정
pnpm prisma migrate dev
pnpm prisma db seed

# 5. 개발 서버 시작
pnpm dev
# → http://localhost:3000
```

### 테스트 실행

```bash
pnpm test           # 단위 + 통합 테스트
pnpm test:coverage  # 커버리지 확인
pnpm test:e2e       # E2E 테스트 (서버 실행 필요)
pnpm typecheck      # TypeScript 타입 체크
pnpm lint           # ESLint
```

---

## 프로젝트 구조

```
suneung-ai/
├── app/           # Next.js App Router 페이지 & API
├── components/    # 공유 React 컴포넌트
├── lib/           # 비즈니스 로직, AI 서비스
├── prisma/        # DB 스키마 & 시드 데이터
├── __tests__/     # 테스트 파일
└── docs/          # 상세 문서
```

---

## 주요 문서

| 문서 | 설명 |
|------|------|
| [PRD.md](./PRD.md) | 제품 요구사항 전체 스펙 |
| [AGENTS.md](./AGENTS.md) | Ralph Loop 에이전트 지침 |
| [PROGRESS.md](./PROGRESS.md) | 태스크 진행 현황 (Ralph Loop) |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 시스템 아키텍처 |
| [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | Prisma 스키마 전체 명세 |
| [docs/AI_ENGINE.md](./docs/AI_ENGINE.md) | AI 추천 엔진 상세 |
| [docs/TEST_CONVENTIONS.md](./docs/TEST_CONVENTIONS.md) | 테스트 작성 규칙 |
| [docs/COMMIT_CONVENTIONS.md](./docs/COMMIT_CONVENTIONS.md) | Git 커밋 컨벤션 |

---

## 기술 스택

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Recharts
- **Backend:** Next.js API Routes, Prisma, NextAuth.js v5
- **DB:** PostgreSQL (Neon) + pgvector
- **AI:** HuggingFace (임베딩, 무료) + Claude Haiku (추천 이유)
- **배포:** Vercel

---

## Ralph Loop로 빌드하기

이 프로젝트는 **Claude Code Ralph Wiggum 플러그인**으로 자율 빌드할 수 있도록 설계되어 있습니다.

### 실행 명령어

Claude Code 터미널에서 프로젝트 루트로 이동 후 아래 슬래시 커맨드 입력:

```
/ralph-loop "Read AGENTS.md and PROGRESS.md. Find the first task where passes=false. Implement it fully. Run pnpm typecheck && pnpm lint && pnpm test && pnpm build. If all pass, commit with conventional commit message and update PROGRESS.md passes to true. If all tasks are complete, output <promise>COMPLETE</promise>." --completion-promise "COMPLETE" --max-iterations 20
```

### 동작 방식

1. Claude가 태스크 구현 시도 후 종료하려 하면 Stop 훅이 가로채 동일 프롬프트를 재주입
2. 매 이터레이션마다 `PROGRESS.md`를 읽어 다음 `passes=false` 태스크를 선택
3. 전체 완료 시 `<promise>COMPLETE</promise>` 출력 → 루프 자동 종료

### 중단하기

```
/cancel-ralph
```

> ⚠️ `--max-iterations 20` 은 안전장치. 태스크가 14개이므로 여유있게 설정.

---

## Vercel 배포

```bash
# 1. Vercel CLI 설치
pnpm add -g vercel

# 2. 로그인 및 프로젝트 연결
vercel login
vercel link

# 3. 환경 변수 설정 (Vercel 대시보드에서)
# DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET,
# ANTHROPIC_API_KEY, HUGGINGFACE_API_KEY

# 4. 배포
vercel --prod
```

**중요:** Vercel Build Command에 마이그레이션 포함:
```
prisma migrate deploy && next build
```

---

## 환경 변수 목록

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL Connection Pooling URL |
| `DIRECT_URL` | ✅ | Neon PostgreSQL Direct URL (마이그레이션용) |
| `NEXTAUTH_SECRET` | ✅ | NextAuth 암호화 키 (32자 이상 랜덤 문자열) |
| `NEXTAUTH_URL` | ✅ | 앱 기본 URL (로컬: http://localhost:3000) |
| `ANTHROPIC_API_KEY` | ✅ | Claude Haiku API 키 |
| `HUGGINGFACE_API_KEY` | ✅ | HuggingFace Inference API 키 |
| `OPENAI_API_KEY` | ❌ | GPT-4o-mini fallback (선택) |
| `NEXT_PUBLIC_USE_LLM` | ❌ | "false"로 설정 시 rule-based만 사용 (기본: "true") |
