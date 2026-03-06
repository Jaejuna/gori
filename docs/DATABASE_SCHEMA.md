# DATABASE_SCHEMA.md — Prisma 스키마 전체 명세

> **참조 파일:** `prisma/schema.prisma`
> **DB:** PostgreSQL (Neon) + pgvector extension

---

## 전체 스키마

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [vector]  // pgvector for embedding similarity search
}

// ─────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────

enum Role {
  STUDENT
  TEACHER
}

enum Category {
  독서      // Reading
  문학      // Literature
  화법과작문 // Speech & Writing
  언어와매체 // Language & Media
}

enum Difficulty {
  EASY    // 정답률 60% 이상
  MEDIUM  // 40–60%
  HARD    // 40% 미만
}

// ─────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // bcrypt hashed
  role      Role
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 선생님 전용: 반 코드 (6자리 영숫자)
  classCode String?  @unique

  // 학생 → 선생님 연결
  teacherId String?
  teacher   User?    @relation("TeacherStudents", fields: [teacherId], references: [id])
  students  User[]   @relation("TeacherStudents")

  // 관계
  testSessions    TestSession[]
  answers         Answer[]
  recommendations Recommendation[]

  @@index([role])
  @@index([teacherId])
}

// ─────────────────────────────────────────────────
// QUESTION
// ─────────────────────────────────────────────────

model PassageType {
  id       String   @id @default(cuid())
  category Category
  subType  String   // "인문", "과학", "현대소설", "화법과작문" 등
  label    String   // 화면 표시용 레이블

  questions Question[]

  @@unique([category, subType])
}

model Question {
  id     String @id @default(cuid())
  year   Int    // 출제 연도 (예: 2024)
  month  Int    // 6 또는 11

  // 원본 문제 번호 (수능 기준 1–45)
  number Int

  // 문제 본문
  passage String?  // 지문 (없는 경우도 있음)
  content String   // 문항 질문

  // 보기: JSON 배열 [{index: 1, text: "..."}, ...]
  options Json

  // 정답 (1–5)
  answer     Int
  explanation String?  // 해설

  difficulty    Difficulty
  tags          String[]

  passageTypeId String
  passageType   PassageType @relation(fields: [passageTypeId], references: [id])

  // 임베딩 벡터 (HuggingFace ko-sroberta-multitask → 768차원)
  embedding Unsupported("vector(768)")?

  createdAt DateTime @default(now())

  answers         Answer[]
  recommendations Recommendation[]

  @@unique([year, month, number])
  @@index([passageTypeId])
  @@index([year, month])
  @@index([difficulty])
}

// ─────────────────────────────────────────────────
// TEST SESSION & ANSWERS
// ─────────────────────────────────────────────────

model TestSession {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  startedAt DateTime  @default(now())
  endedAt   DateTime?

  answers Answer[]

  @@index([userId])
}

model Answer {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  questionId String
  question   Question @relation(fields: [questionId], references: [id])
  sessionId  String
  session    TestSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  selectedOption Int      // 학생이 선택한 보기 번호 (1–5)
  isCorrect      Boolean
  timeSpent      Int?     // 풀이 시간 (초)
  createdAt      DateTime @default(now())

  @@unique([userId, questionId, sessionId])  // 같은 세션에서 동일 문제 중복 방지
  @@index([userId, isCorrect])
  @@index([userId, createdAt])
  @@index([questionId])
}

// ─────────────────────────────────────────────────
// RECOMMENDATION
// ─────────────────────────────────────────────────

model Recommendation {
  id         String   @id @default(cuid())
  userId     String
  question   Question @relation(fields: [questionId], references: [id])
  questionId String

  // AI 생성 추천 이유
  reason String

  // 추천 점수 (0.0–1.0)
  score Float

  // 선생님 검토 상태
  isReviewedByTeacher Boolean @default(false)
  teacherApproved     Boolean? // null=미검토, true=승인, false=제외

  // 추천 생성 방법
  source String @default("AI") // "AI" | "TEACHER_ADDED"

  // 학생이 이 추천을 통해 문제를 풀었는지
  isCompleted Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, questionId])  // 같은 문제 중복 추천 방지
  @@index([userId, teacherApproved])
  @@index([userId, isCompleted])
}

// ─────────────────────────────────────────────────
// LLM USAGE TRACKING (비용 제어)
// ─────────────────────────────────────────────────

model LlmUsage {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime @default(now()) @db.Date
  callCount Int      @default(0)

  @@unique([userId, date])
  @@index([userId, date])
}
```

---

## 인덱스 설계 근거

| 인덱스 | 이유 |
|--------|------|
| `Answer(userId, isCorrect)` | 학생별 오답 조회 (가장 빈번한 쿼리) |
| `Answer(userId, createdAt)` | 최근 30일 오답 추이 계산 |
| `Question(passageTypeId)` | 지문 유형별 문제 필터 |
| `Recommendation(userId, teacherApproved)` | 선생님 검토 목록 조회 |
| `LlmUsage(userId, date)` | 일일 LLM 호출 횟수 체크 |

---

## 주요 쿼리 패턴

### 1. 학생 지문 유형별 오답률 계산
```typescript
// lib/analytics.ts
export async function getStudentPassageTypeStats(userId: string) {
  const answers = await db.answer.findMany({
    where: { userId },
    include: {
      question: {
        include: { passageType: true },
      },
    },
  });

  const stats = answers.reduce((acc, answer) => {
    const key = answer.question.passageType.subType;
    if (!acc[key]) acc[key] = { total: 0, wrong: 0 };
    acc[key].total += 1;
    if (!answer.isCorrect) acc[key].wrong += 1;
    return acc;
  }, {} as Record<string, { total: number; wrong: number }>);

  return Object.entries(stats).map(([subType, { total, wrong }]) => ({
    subType,
    wrongRate: total > 0 ? wrong / total : 0,
    total,
  }));
}
```

### 2. 추천 생성 시 이미 푼 문제 제외
```typescript
const answeredQuestionIds = await db.answer.findMany({
  where: { userId },
  select: { questionId: true },
});

const candidates = await db.question.findMany({
  where: {
    id: { notIn: answeredQuestionIds.map(a => a.questionId) },
    passageTypeId: { in: weakPassageTypeIds },
  },
  take: 20,
});
```

### 3. 임베딩 유사도 검색 (pgvector)
```typescript
// Prisma의 $queryRaw로 pgvector 사용
const similar = await db.$queryRaw<Question[]>`
  SELECT id, content, year, month, number, "passageTypeId"
  FROM "Question"
  WHERE embedding IS NOT NULL
    AND id NOT IN (${Prisma.join(excludeIds)})
  ORDER BY embedding <=> ${Prisma.raw(`'[${targetEmbedding.join(',')}]'::vector`)}
  LIMIT 10
`;
```
