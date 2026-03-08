import { useQuery } from '@tanstack/react-query';

interface RecommendationQuestion {
  id: string;
  content: string;
  difficulty: string;
  passageType: { label: string };
}

export interface Recommendation {
  id: string;
  questionId: string;
  score: number;
  reason: string;
  source: string;
  isCompleted: boolean;
  question: RecommendationQuestion;
}

interface RecommendationsResponse {
  success: boolean;
  data: Recommendation[];
}

export function useRecommendations() {
  return useQuery<Recommendation[]>({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const res = await fetch('/api/recommendations');
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      const json: RecommendationsResponse = await res.json();
      return json.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
