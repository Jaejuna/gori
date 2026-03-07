import { PrismaClient, Prisma } from '@prisma/client';
import { PASSAGE_TYPES } from '../../src/constants/passageTypes';
import type { SeedQuestion } from '../../src/types/question';
import sampleQuestions from './questions/sample.json';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Upsert PassageTypes
  console.log(`  Creating ${PASSAGE_TYPES.length} passage types...`);
  const passageTypeIdMap: Record<string, string> = {};

  for (const pt of PASSAGE_TYPES) {
    const created = await db.passageType.upsert({
      where: { category_subType: { category: pt.category, subType: pt.subType } },
      update: { label: pt.label },
      create: { category: pt.category, subType: pt.subType, label: pt.label },
    });
    passageTypeIdMap[pt.key] = created.id;
  }

  console.log(`  ✓ ${PASSAGE_TYPES.length} passage types created`);

  // 2. Upsert Questions
  const questions = sampleQuestions as SeedQuestion[];
  console.log(`  Creating ${questions.length} questions...`);

  for (const q of questions) {
    const passageTypeId = passageTypeIdMap[q.passageTypeKey];
    if (!passageTypeId) {
      throw new Error(`Unknown passageTypeKey: ${q.passageTypeKey}`);
    }

    await db.question.upsert({
      where: { year_month_number: { year: q.year, month: q.month, number: q.number } },
      update: {
        passage: q.passage ?? null,
        content: q.content,
        options: q.options as unknown as Prisma.InputJsonValue,
        answer: q.answer,
        explanation: q.explanation ?? null,
        difficulty: q.difficulty,
        tags: q.tags,
        passageTypeId,
      },
      create: {
        year: q.year,
        month: q.month,
        number: q.number,
        passage: q.passage ?? null,
        content: q.content,
        options: q.options as unknown as Prisma.InputJsonValue,
        answer: q.answer,
        explanation: q.explanation ?? null,
        difficulty: q.difficulty,
        tags: q.tags,
        passageTypeId,
      },
    });
  }

  console.log(`  ✓ ${questions.length} questions created`);
  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
