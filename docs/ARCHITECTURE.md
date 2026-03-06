# ARCHITECTURE.md — 시스템 아키텍처

---

## 1. 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 브라우저                             │
│                                                                 │
│   [학생 UI]  ←→  [선생님 UI]  (Next.js App Router, React)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Next.js Application                         │  │
│  │                                                          │  │
│  │   App Router Pages          API Routes                   │  │
│  │   ──────────────            ─────────────────────────    │  │
│  │   /login                   /api/auth/[...nextauth]       │  │
│  │   /register                /api/questions                │  │
│  │   /(student)/dashboard     /api/sessions                 │  │
│  │   /(student)/test          /api/answers                  │  │
│  │   /(student)/recommend     /api/recommendations          │  │
│  │   /(teacher)/dashboard     /api/analytics                │  │
│  │   /(teacher)/students      /api/teacher/students         │  │
│  │   /(teacher)/students/[id] /api/admin/embed              │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐
│  Neon PostgreSQL │ │ HuggingFace  │ │  Anthropic API  │
│  (+ pgvector)   │ │ Inference API│ │  (Claude Haiku) │
│                 │ │              │ │                 │
│  - User         │ │ ko-sroberta- │ │  추천 이유 생성  │
│  - Question     │ │ multitask    │ │  (1–2문장)      │
│  - Answer       │ │  (768dim)    │ │                 │
│  - Recommendation│ │             │ │  Fallback:      │
│  - LlmUsage     │ └──────────────┘ │  Rule-based     │
└─────────────────┘                  └─────────────────┘
```

---

## 2. Next.js App Router 구조 설명

### 2.1 레이아웃 그룹

```
app/
├── (auth)/          # 인증 페이지 그룹 — 네비게이션 없는 심플 레이아웃
│   layout.tsx        (배경, 로고만 있는 레이아웃)
├── (student)/       # 학생 전용 — 미들웨어가 STUDENT 역할만 허용
│   layout.tsx        (학생 사이드바, 헤더 포함)
└── (teacher)/       # 선생님 전용 — 미들웨어가 TEACHER 역할만 허용
    layout.tsx        (선생님 사이드바, 헤더 포함)
```

### 2.2 미들웨어 라우팅 로직

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('next-auth.session-token');

  // 미인증 → 로그인 리다이렉트
  if (!token && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 역할 기반 라우트 보호 (JWT 디코딩)
  if (pathname.startsWith('/teacher') && token?.role !== 'TEACHER') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
```

### 2.3 서버 컴포넌트 vs 클라이언트 컴포넌트

| 컴포넌트 | 타입 | 이유 |
|---------|------|------|
| 대시보드 페이지 | Server | 초기 데이터를 서버에서 fetch (SEO, 성능) |
| QuestionCard | Client | 클릭 이벤트, 타이머 상태 필요 |
| 차트 컴포넌트 | Client | Recharts는 CSR 필요 |
| 추천 카드 | Server + Client | 목록은 서버, 버튼 인터랙션은 클라이언트 |

---

## 3. AI 추천 엔진 상세 플로우

```
학생이 오답 제출
       │
       ▼
POST /api/answers
  isCorrect = false
       │
       ▼ (비동기, 백그라운드)
recommendationService.refresh(userId)
       │
       ├─ Stage 1: 오답 패턴 분석
       │    ├── 최근 50개 오답 조회
       │    ├── 지문 유형별 오답률 계산
       │    ├── 가중치 적용 (최근 7일 × 1.5, 반복 오답 × 2.0)
       │    └── 취약 유형 TOP 3 추출
       │
       ├─ Stage 2: 유사 문제 탐색
       │    ├── 취약 유형의 최근 오답 문제 임베딩 조회
       │    ├── pgvector <=> 연산자로 상위 10개 유사 문제 검색
       │    ├── 이미 푼 문제 제외
       │    └── 추천 후보 5–10개 확보
       │
       ├─ Stage 3: 추천 이유 생성 (LLM)
       │    ├── 24시간 캐시 확인 (LlmUsage 테이블)
       │    ├── 일일 한도 확인 (3회)
       │    ├── Claude Haiku 호출:
       │    │     Input: 오답 패턴 요약 + 문제 메타데이터
       │    │     Output: "과학 지문 추론 문제에서 반복 오답. 유사 구조 연습용"
       │    └── 실패 시 Rule-based 이유 생성
       │
       └─ DB 저장: Recommendation upsert
```

### 3.1 Rule-based 추천 이유 생성 (Fallback)

```typescript
function generateRuleBasedReason(
  passageType: string,
  wrongRate: number,
  isRepeated: boolean
): string {
  const templates = [
    `${passageType} 영역 오답률 ${Math.round(wrongRate * 100)}% — 반복 연습 필요`,
    `최근 자주 틀린 ${passageType} 유형 문제`,
    `취약 영역 ${passageType} 집중 보완용`,
  ];
  return isRepeated ? templates[0] : templates[Math.floor(Math.random() * templates.length)];
}
```

---

## 4. 인증 플로우

```
클라이언트             NextAuth              DB
    │                    │                   │
    │── POST /api/auth ──▶│                   │
    │   {email, password} │                   │
    │                    │── findUser(email) ─▶│
    │                    │◀─ User ────────────│
    │                    │                   │
    │                    │── bcrypt.compare() │
    │                    │                   │
    │◀── Set-Cookie: ────│                   │
    │    session-token   │                   │
    │    (JWT, 7일)      │                   │
    │                    │                   │
    │── GET /dashboard ──▶│                   │
    │   (Cookie 포함)    │                   │
    │                    │── JWT 검증         │
    │◀── 200 OK ─────────│                   │
```

---

## 5. 데이터 플로우 (학생 문제 풀기)

```
1. GET /api/questions?category=독서&difficulty=HARD
   → Prisma: Question 조회 (passageTypeId 조인)
   → Response: { questions: [...], total: 45 }

2. POST /api/sessions
   → Prisma: TestSession 생성
   → Response: { sessionId: "..." }

3. POST /api/sessions/{id}/answers
   Body: { questionId, selectedOption, timeSpent }
   → 정오답 계산: selectedOption === question.answer
   → Prisma: Answer 생성
   → 오답이면 → recommendationService.refresh() 트리거
   → Response: { isCorrect, correctAnswer, explanation }
```

---

## 6. 배포 아키텍처 (Vercel)

```
GitHub main 브랜치
       │
       ▼ (자동 배포)
Vercel Production
  ├── Next.js 빌드 최적화
  ├── Edge Functions (API Routes)
  ├── CDN 캐싱 (정적 assets)
  └── 환경 변수 (Vercel 대시보드)
       │
       ├── Neon PostgreSQL (Connection Pooling)
       ├── HuggingFace Inference API
       └── Anthropic API (Claude Haiku)

PR 브랜치 → Vercel Preview URL (자동)
```

### 6.1 Next.js 빌드 최적화 포인트
- `next.config.ts`에서 불필요한 번들 제외
- 차트 라이브러리(Recharts) dynamic import로 지연 로딩
- 이미지 최적화: `next/image` 사용
- API Routes: Edge Runtime 사용 가능한 곳에 적용
