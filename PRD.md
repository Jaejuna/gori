# PRD: 수능 국어 AI 취약 문제 추천 시스템

> **Version:** 1.0.0
> **Last Updated:** 2026-03-06
> **Status:** Ready for Ralph Loop Execution

---

## 1. 프로젝트 개요 (Project Overview)

### 1.1 한 줄 정의
학생의 수능 국어 오답 패턴을 AI로 분석해 취약한 지문 유형의 기출 문제를 자동 추천하고, 선생님이 이를 검토·확인할 수 있는 경량 웹 애플리케이션

### 1.2 핵심 가치
| 사용자 | 핵심 가치 |
|--------|-----------|
| 학생 | "나한테 맞는 취약 문제만 골라서 준다" → 효율적 복습 |
| 선생님 | "AI 추천 근거를 투명하게 보고 승인/조정할 수 있다" → 신뢰성 있는 학습 관리 |

### 1.3 범위 (Scope)
- **포함:** 수능 국어 기출 문제 (독서·문학·화작·언매), 오답 분석, AI 추천, 학생/선생님 대시보드
- **제외 (v1):** 수능 수학/영어, 모의고사 자체 생성, 결제/구독, 모바일 앱
- **이후 단계:** 수학·영어 확장, 학교/학원 단위 관리

---

## 2. 사용자 스토리 (User Stories)

### 2.1 학생 (Student)

#### US-S01: 회원가입 및 로그인
```
As a 학생
I want to 이메일+비밀번호로 가입하고 로그인하고 싶다
So that 나의 학습 기록이 저장된다

Acceptance Criteria:
- 이메일 형식 유효성 검사
- 비밀번호 최소 8자, 영문+숫자 포함
- 가입 시 선생님 코드(선택) 입력으로 선생님과 연결
- 로그인 상태 유지 (세션 7일)
```

#### US-S02: 문제 풀기
```
As a 학생
I want to 수능 기출 문제를 풀고 싶다
So that 나의 오답 기록이 쌓인다

Acceptance Criteria:
- 지문 유형 필터로 원하는 영역 선택 가능
- 5지선다 형식, 문제 번호·연도·월 표시
- 문제 풀기 시간 자동 측정
- 제출 즉시 정오답 확인 및 해설 표시
- 오답 시 "유사 문제 추천받기" 버튼 노출
```

#### US-S03: 취약 영역 대시보드
```
As a 학생
I want to 내 취약 지문 유형을 시각적으로 보고 싶다
So that 어디에 집중해야 하는지 파악한다

Acceptance Criteria:
- 지문 유형별 정답률 차트 (레이더 차트 또는 바 차트)
- 최근 30일 오답률 추이 그래프
- "가장 틀린 유형 TOP 3" 카드 표시
- 총 풀이 문제 수, 평균 정답률 통계
```

#### US-S04: AI 추천 문제 받기
```
As a 학생
I want to AI가 추천한 내 취약 문제들을 보고 싶다
So that 어떤 문제를 풀어야 할지 고민 없이 바로 시작할 수 있다

Acceptance Criteria:
- 홈 화면 "오늘의 추천 문제 3개" 섹션
- 각 추천 문제에 추천 이유 1줄 표시 (예: "과학 지문 오답률 67% - 유사 패턴 문제")
- 추천 문제를 바로 풀 수 있는 버튼
- 추천 갱신: 새 오답 발생 시 자동 업데이트
```

---

### 2.2 선생님 (Teacher)

#### US-T01: 선생님 회원가입 및 코드 발급
```
As a 선생님
I want to 선생님 계정을 만들고 고유 코드를 발급받고 싶다
So that 학생들이 내 반에 등록할 수 있다

Acceptance Criteria:
- 역할 선택: 학생 / 선생님
- 선생님 가입 시 6자리 반 코드 자동 발급
- 반 코드를 학생에게 공유하면 연결됨
```

#### US-T02: 학생 목록 및 현황 보기
```
As a 선생님
I want to 내 반 학생 전체의 학습 현황을 보고 싶다
So that 어느 학생이 어떤 영역에서 취약한지 한눈에 파악한다

Acceptance Criteria:
- 학생 목록: 이름, 최근 활동일, 평균 정답률, 취약 영역 TOP 1
- 정답률 낮은 순 정렬 옵션
- 학생 검색 기능
```

#### US-T03: 특정 학생 상세 분석
```
As a 선생님
I want to 특정 학생의 오답 패턴과 AI 추천 문제를 상세히 보고 싶다
So that 추천 문제가 합리적인지 판단하고 필요시 직접 조정할 수 있다

Acceptance Criteria:
- 학생별 지문 유형별 오답률 상세 차트
- 최근 오답 문제 목록 (문제 미리보기 포함)
- AI 추천 문제 목록과 각 추천 이유
- 선생님이 추천 문제를 "승인 ✓" / "제외 ✗" 처리 가능
- 선생님이 직접 추천 문제 추가 가능
```

#### US-T04: 추천 품질 모니터링
```
As a 선생님
I want to AI 추천의 전반적인 품질을 볼 수 있으면 좋겠다
So that 추천 시스템이 학생에게 도움이 되는지 확인한다

Acceptance Criteria:
- 추천 문제 풀이 후 정답률 통계 (추천 효과 지표)
- 선생님 승인율 표시
- 반 전체 가장 많이 틀리는 문제 TOP 5
```

---

## 3. 문제 데이터 구조 (Question Data Structure)

### 3.1 수능 국어 지문 유형 분류

```
국어
├── 독서 (Reading)
│   ├── 인문 (Humanities)
│   ├── 사회 (Social Studies)
│   ├── 과학 (Science)
│   ├── 기술 (Technology)
│   └── 예술 (Arts)
├── 문학 (Literature)
│   ├── 현대소설 (Modern Novel)
│   ├── 현대시 (Modern Poetry)
│   ├── 고전소설 (Classic Novel)
│   ├── 고전시가 (Classic Poetry)
│   └── 수필/극 (Essay/Drama)
├── 화법과 작문 (Speech & Writing)
└── 언어와 매체 (Language & Media)
```

### 3.2 문제 난이도 분류
- **EASY**: 정답률 60% 이상 (전국 기준)
- **MEDIUM**: 정답률 40–60%
- **HARD**: 정답률 40% 미만 (킬러·준킬러)

### 3.3 데이터 출처
- 공식 출처: https://www.suneung.re.kr/boardCnts/list.do?boardID=1500234&m=0403&s=suneung
- 수집 방식: 연도별 PDF 파싱 → 수동 검수 → DB 적재
- 시드 데이터: `prisma/seed/questions/` 폴더에 JSON 형태로 관리
- 최소 시드 데이터: 2019–2024년 수능 국어 (연도별 45문항 × 6년 = 270문항)

---

## 4. AI 추천 엔진 명세 (AI Recommendation Engine)

### 4.1 추천 로직 (3단계 파이프라인)

```
Stage 1: 오답 패턴 분석 (Rule-based)
  - 지문 유형별 오답률 계산
  - 최근 7일 vs 전체 오답 패턴 비교
  - 가중치: 최근 오답 × 1.5, 반복 오답 × 2.0

Stage 2: 유사 문제 탐색 (HuggingFace Embedding)
  - 모델: jhgan/ko-sroberta-multitask (무료, 한국어 특화)
  - 오답 문제의 임베딩 벡터 → 코사인 유사도 상위 10개 추출
  - 이미 푼 문제 제외

Stage 3: 추천 이유 생성 (LLM)
  - 모델: Claude claude-haiku-4-5 (저비용) 또는 gpt-4o-mini
  - 입력: 오답 패턴 요약 + 추천 문제 메타데이터
  - 출력: 1–2문장 추천 이유 (학생용 쉬운 언어)
  - 캐싱: 동일 패턴 추천 이유 24시간 캐시
```

### 4.2 추천 트리거 조건
1. 학생이 문제를 풀고 오답 제출 → 즉시 재계산
2. 최근 7일 동안 미갱신 → 자동 재계산 (cron: 매일 새벽 2시)
3. 선생님이 수동 갱신 요청

### 4.3 비용 최적화
| 작업 | 모델 | 예상 비용 |
|------|------|-----------|
| 임베딩 생성 | HuggingFace Inference API (무료 티어) | $0 |
| 추천 이유 생성 | Claude Haiku | ~$0.001/학생/추천 |
| 오답 패턴 분석 | Rule-based | $0 |

---

## 5. 비기능 요건 (Non-Functional Requirements)

### 5.1 성능
- 페이지 초기 로딩: < 2초 (Vercel Edge)
- 추천 엔진 응답: < 5초 (HuggingFace 임베딩 포함)
- DB 쿼리: < 200ms (Prisma + 인덱스 최적화)

### 5.2 배포 (Deployment)
- **플랫폼:** Vercel (프론트엔드 + Next.js API Routes)
- **DB:** Neon PostgreSQL (무료 티어 충분)
- **환경 변수:** `.env.local` → Vercel 환경 변수
- **CI/CD:** GitHub Actions → Vercel 자동 배포
- **모니터링:** Vercel Analytics (기본 제공)

### 5.3 보안
- 인증: NextAuth.js (Credentials + 추후 Google OAuth)
- 비밀번호: bcrypt 해싱
- API 라우트: 미들웨어로 역할 기반 접근 제어 (RBAC)
- 학생 데이터: 선생님은 자기 반 학생만 조회 가능

### 5.4 접근성
- 한국어 기본 (ko), 영어 미지원 (v1)
- 다크모드 미지원 (v1)
- 모바일 반응형 지원 (Next.js + Tailwind)

---

## 6. 기술 스택 (Tech Stack)

```yaml
Frontend:
  Framework: Next.js 14 (App Router)
  Styling: Tailwind CSS + shadcn/ui
  Charts: Recharts
  State: Zustand (전역) + React Query (서버 상태)
  Forms: React Hook Form + Zod

Backend:
  Runtime: Next.js API Routes (Edge-compatible)
  ORM: Prisma
  Auth: NextAuth.js v5
  Validation: Zod

Database:
  Primary: PostgreSQL (Neon - 무료 티어)
  Vector Search: pgvector extension (임베딩 저장)

AI / ML:
  Embeddings: HuggingFace Inference API (jhgan/ko-sroberta-multitask)
  LLM (추천 이유): Anthropic Claude Haiku / OpenAI gpt-4o-mini
  Fallback: Rule-based 추천 (LLM 장애 시)

DevOps:
  Hosting: Vercel
  CI/CD: GitHub Actions
  Linting: ESLint + Prettier
  Testing: Vitest + Testing Library + Playwright (E2E)
  Package Manager: pnpm
```

---

## 7. 제약 사항 및 가정 (Constraints & Assumptions)

1. 수능 기출 문제 저작권: 한국교육과정평가원(KICE) 문제는 교육 목적 비영리 사용 가정
2. 초기 시드 데이터는 수동 입력 또는 PDF 파싱으로 준비 (자동 크롤링 제외)
3. 무료 티어 기준: Neon DB 0.5GB, HuggingFace 무료 API, Vercel Hobby
4. 동시 사용자 < 100명 기준으로 설계 (v1)
5. 학생당 하루 최대 추천 LLM 호출: 3회 (비용 제어)
