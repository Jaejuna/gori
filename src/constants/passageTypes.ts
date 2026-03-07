import type { Category } from '@/types/question';

export interface PassageTypeDefinition {
  key: string;
  category: Category;
  subType: string;
  label: string;
}

export const PASSAGE_TYPES: PassageTypeDefinition[] = [
  // 독서 (Reading)
  { key: '독서_인문', category: '독서', subType: '인문', label: '독서 - 인문' },
  { key: '독서_사회', category: '독서', subType: '사회', label: '독서 - 사회' },
  { key: '독서_과학', category: '독서', subType: '과학', label: '독서 - 과학' },
  { key: '독서_기술', category: '독서', subType: '기술', label: '독서 - 기술' },
  { key: '독서_예술', category: '독서', subType: '예술', label: '독서 - 예술' },

  // 문학 (Literature)
  { key: '문학_현대시', category: '문학', subType: '현대시', label: '문학 - 현대시' },
  { key: '문학_고전시가', category: '문학', subType: '고전시가', label: '문학 - 고전시가' },
  { key: '문학_현대소설', category: '문학', subType: '현대소설', label: '문학 - 현대소설' },
  { key: '문학_고전소설', category: '문학', subType: '고전소설', label: '문학 - 고전소설' },
  { key: '문학_수필', category: '문학', subType: '수필', label: '문학 - 수필' },

  // 화법과작문 (Speech & Writing)
  { key: '화법과작문_화법', category: '화법과작문', subType: '화법', label: '화법과작문 - 화법' },
  { key: '화법과작문_작문', category: '화법과작문', subType: '작문', label: '화법과작문 - 작문' },
  {
    key: '화법과작문_화법과작문',
    category: '화법과작문',
    subType: '화법과작문',
    label: '화법과작문 - 통합',
  },

  // 언어와매체 (Language & Media)
  { key: '언어와매체_언어', category: '언어와매체', subType: '언어', label: '언어와매체 - 언어' },
  { key: '언어와매체_매체', category: '언어와매체', subType: '매체', label: '언어와매체 - 매체' },
  {
    key: '언어와매체_통합',
    category: '언어와매체',
    subType: '언어와매체',
    label: '언어와매체 - 통합',
  },
];

export const PASSAGE_TYPE_MAP: Record<string, PassageTypeDefinition> = Object.fromEntries(
  PASSAGE_TYPES.map((pt) => [pt.key, pt]),
);
