export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type Category = '독서' | '문학' | '화법과작문' | '언어와매체';

export interface PassageType {
  id: string;
  category: Category;
  subType: string;
  label: string;
}

export interface QuestionOption {
  index: number;
  text: string;
}

export interface Question {
  id: string;
  year: number;
  month: number;
  number: number;
  passage?: string | null;
  content: string;
  options: QuestionOption[];
  answer: number;
  explanation?: string | null;
  difficulty: Difficulty;
  tags: string[];
  passageTypeId: string;
  passageType?: PassageType;
  createdAt: Date;
}

export interface SeedQuestion {
  year: number;
  month: number;
  number: number;
  passage?: string;
  content: string;
  options: QuestionOption[];
  answer: number;
  explanation?: string;
  difficulty: Difficulty;
  tags: string[];
  passageTypeKey: string; // key matching PASSAGE_TYPES constant
}
