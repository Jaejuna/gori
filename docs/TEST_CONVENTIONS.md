# TEST_CONVENTIONS.md — 테스트 작성 규칙 및 컨벤션

---

## 1. 테스트 계층 구조

```
__tests__/
├── unit/          # 순수 함수, 유틸리티, 비즈니스 로직
├── integration/   # API Routes, DB 연동 테스트
└── e2e/           # 전체 사용자 플로우 (Playwright)
```

### 커버리지 목표

| 레이어 | 목표 커버리지 |
|--------|-------------|
| Unit | **90% 이상** |
| Integration | **80% 이상** |
| E2E | 핵심 플로우 2개 (학생/선생님) |

---

## 2. 도구 설정

### 2.1 Vitest (Unit + Integration)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',  // React 컴포넌트 테스트용
    globals: true,
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
      },
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.*',
        'prisma/',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
});
```

### 2.2 테스트 셋업 파일

```typescript
// __tests__/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Prisma 모킹
vi.mock('@/lib/db', () => ({
  db: {
    question: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    answer: { findMany: vi.fn(), create: vi.fn() },
    recommendation: { upsert: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    lLMUsage: { upsert: vi.fn() },
  },
}));

// 환경 변수
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXT_PUBLIC_USE_LLM = 'false';
```

### 2.3 Playwright (E2E)

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 3. 단위 테스트 (Unit Tests)

### 3.1 네이밍 규칙

```typescript
// 파일: __tests__/unit/[모듈명].test.ts
// 형식: describe('모듈/함수명') > it('should [행동] when [조건]')

describe('analyzeWeakPoints', () => {
  it('should return empty array when no answers exist', async () => { ... });
  it('should weight recent answers 1.5x more than older answers', async () => { ... });
  it('should sort by weighted score descending', async () => { ... });
});
```

### 3.2 비즈니스 로직 테스트 예시

```typescript
// __tests__/unit/recommendation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateFallbackReason } from '@/lib/ai/recommendation';
import { calculatePassageTypeStats } from '@/lib/analytics';

describe('generateFallbackReason', () => {
  it('should return a non-empty string', () => {
    const reason = generateFallbackReason('과학', 0.7);
    expect(reason).toBeTruthy();
    expect(reason.length).toBeLessThanOrEqual(50);
  });

  it('should include passage type in reason', () => {
    const reason = generateFallbackReason('과학', 0.7);
    expect(reason).toContain('과학');
  });
});

describe('calculatePassageTypeStats', () => {
  it('should calculate wrong rate correctly', () => {
    const answers = [
      { isCorrect: false, passageType: { subType: '과학' } },
      { isCorrect: false, passageType: { subType: '과학' } },
      { isCorrect: true,  passageType: { subType: '과학' } },
      { isCorrect: false, passageType: { subType: '인문' } },
    ];
    const stats = calculatePassageTypeStats(answers as any);
    expect(stats['과학'].wrongRate).toBeCloseTo(0.667, 2);
    expect(stats['인문'].wrongRate).toBe(1.0);
  });

  it('should return empty stats for empty answers', () => {
    const stats = calculatePassageTypeStats([]);
    expect(Object.keys(stats)).toHaveLength(0);
  });
});
```

### 3.3 유틸리티 함수 테스트

```typescript
// __tests__/unit/auth.test.ts
import { generateClassCode, validateClassCode } from '@/lib/auth';

describe('generateClassCode', () => {
  it('should generate 6-character alphanumeric code', () => {
    const code = generateClassCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('should generate unique codes on repeated calls', () => {
    const codes = new Set(Array.from({ length: 100 }, generateClassCode));
    expect(codes.size).toBeGreaterThan(90); // 최소 90% 고유
  });
});
```

---

## 4. 통합 테스트 (Integration Tests)

통합 테스트는 실제 DB 대신 **인메모리 SQLite** 또는 **Prisma 모킹** 사용.

### 4.1 API Route 테스트 패턴

```typescript
// __tests__/integration/questions.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET } from '@/app/api/questions/route';

describe('GET /api/questions', () => {
  it('should return 401 when not authenticated', async () => {
    const request = new Request('http://localhost:3000/api/questions');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return questions filtered by category', async () => {
    // 인증된 세션 모킹
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', role: 'STUDENT' } });
    vi.mocked(db.question.findMany).mockResolvedValue(mockQuestions);

    const request = new Request('http://localhost:3000/api/questions?category=독서');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.questions).toHaveLength(mockQuestions.length);
  });

  it('should return 400 for invalid category', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', role: 'STUDENT' } });

    const request = new Request('http://localhost:3000/api/questions?category=invalid');
    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
```

### 4.2 권한(RBAC) 테스트 필수 항목

모든 `(teacher)` 라우트 API에 대해 반드시 포함:

```typescript
// __tests__/integration/teacher.test.ts

it('should return 403 when student accesses teacher endpoint', async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: 'student-1', role: 'STUDENT' } });
  const response = await GET(new Request('http://localhost:3000/api/teacher/students'));
  expect(response.status).toBe(403);
});

it('should return 403 when teacher accesses another teacher\'s student', async () => {
  vi.mocked(auth).mockResolvedValue({ user: { id: 'teacher-2', role: 'TEACHER' } });
  vi.mocked(db.user.findUnique).mockResolvedValue({
    ...mockStudent,
    teacherId: 'teacher-1', // 다른 선생님 소속
  });
  const response = await GET(
    new Request('http://localhost:3000/api/teacher/students/student-1')
  );
  expect(response.status).toBe(403);
});
```

---

## 5. E2E 테스트 (Playwright)

### 5.1 학생 플로우

```typescript
// __tests__/e2e/student-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Student Core Flow', () => {
  test('student can register, solve a question, and view recommendations', async ({ page }) => {
    // 1. 회원가입
    await page.goto('/register');
    await page.selectOption('[data-testid="role-select"]', 'STUDENT');
    await page.fill('[data-testid="email"]', 'test-student@example.com');
    await page.fill('[data-testid="password"]', 'Password123!');
    await page.fill('[data-testid="name"]', '테스트 학생');
    await page.click('[data-testid="register-btn"]');
    await expect(page).toHaveURL('/dashboard');

    // 2. 문제 풀기
    await page.click('[data-testid="start-test-btn"]');
    await expect(page.locator('[data-testid="question-card"]')).toBeVisible();
    await page.click('[data-testid="option-2"]'); // 오답 선택
    await page.click('[data-testid="submit-btn"]');
    await expect(page.locator('[data-testid="answer-feedback"]')).toBeVisible();

    // 3. 대시보드에서 통계 확인
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="stats-card"]')).toBeVisible();

    // 4. 추천 페이지 확인
    await page.goto('/recommendations');
    // 추천이 생성될 시간 대기 (비동기 처리)
    await page.waitForTimeout(2000);
  });
});
```

### 5.2 선생님 플로우

```typescript
// __tests__/e2e/teacher-flow.spec.ts
test.describe('Teacher Core Flow', () => {
  test('teacher can view students and review recommendations', async ({ page }) => {
    // 1. 선생님 로그인 (미리 생성된 계정 사용)
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'teacher@example.com');
    await page.fill('[data-testid="password"]', 'Password123!');
    await page.click('[data-testid="login-btn"]');
    await expect(page).toHaveURL('/teacher/dashboard');

    // 2. 학생 목록 확인
    await page.goto('/teacher/students');
    await expect(page.locator('[data-testid="student-table"]')).toBeVisible();

    // 3. 학생 상세 및 추천 검토
    await page.click('[data-testid="student-row"]:first-child');
    await expect(page.locator('[data-testid="passage-type-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="recommendation-list"]')).toBeVisible();

    // 추천 승인
    await page.click('[data-testid="approve-recommendation"]:first-child');
    await expect(page.locator('[data-testid="approved-badge"]')).toBeVisible();
  });
});
```

---

## 6. 테스트 ID 컨벤션 (`data-testid`)

E2E 테스트 대상 요소에는 반드시 `data-testid` 속성 추가:

| 요소 | data-testid |
|------|------------|
| 로그인 버튼 | `login-btn` |
| 회원가입 버튼 | `register-btn` |
| 역할 선택 | `role-select` |
| 이메일 입력 | `email` |
| 비밀번호 입력 | `password` |
| 문제 카드 | `question-card` |
| 보기 N번 | `option-{N}` |
| 제출 버튼 | `submit-btn` |
| 정오답 피드백 | `answer-feedback` |
| 통계 카드 | `stats-card` |
| 학생 테이블 | `student-table` |
| 추천 목록 | `recommendation-list` |
| 추천 승인 버튼 | `approve-recommendation` |
| 추천 제외 버튼 | `reject-recommendation` |
| 지문 유형 차트 | `passage-type-chart` |

---

## 7. 모킹 (Mocking) 가이드

### 7.1 Prisma 모킹
```typescript
// 항상 __tests__/setup.ts의 전역 모킹 사용
// 개별 테스트에서 오버라이드:
import { db } from '@/lib/db';
import { vi } from 'vitest';

vi.mocked(db.question.findMany).mockResolvedValueOnce([
  { id: 'q-1', content: '...', year: 2024, month: 11, ... }
]);
```

### 7.2 외부 API 모킹 (HuggingFace, Claude)
```typescript
// AI 서비스는 항상 모킹 (비용 + 속도)
vi.mock('@/lib/ai/embeddings', () => ({
  getEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
  batchEmbed: vi.fn().mockResolvedValue([new Array(768).fill(0.1)]),
}));

vi.mock('@/lib/ai/llm', () => ({
  generateRecommendationReason: vi.fn().mockResolvedValue('과학 지문 집중 강화 문제'),
}));
```

---

## 8. CI에서 테스트 실행

```yaml
# .github/workflows/ci.yml (테스트 관련 부분)
- name: Run unit and integration tests
  run: pnpm test --reporter=github

- name: Run type check
  run: pnpm typecheck

- name: Check test coverage
  run: pnpm test:coverage
  # coverage 미달 시 CI 실패 (vitest.config.ts thresholds)
```
