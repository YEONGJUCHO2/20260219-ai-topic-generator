import { GoogleGenerativeAI } from '@google/generative-ai';
import { HabitSuggestion } from './types';
import { v4 as uuidv4 } from 'uuid';

export async function generateHabits(): Promise<HabitSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  // API 키가 없거나 에러 발생 시 사용할 폴백 데이터
  const fallbackHabits: HabitSuggestion[] = [
    { id: uuidv4(), person: '일론 머스크', title: '5분 타임박싱', description: '하루를 5분 단위로 쪼개어 극도로 집중하는 시간 관리법', category: '생산성', difficulty: 'Hard' },
    { id: uuidv4(), person: '워렌 버핏', title: '5/25 법칙', description: '가장 중요한 5가지를 위해 나머지 20가지를 포기하는 전략', category: '목표관리', difficulty: 'Easy' },
    { id: uuidv4(), person: '빌 게이츠', title: '생각 주간 (Think Week)', description: '외부와 단절하고 오로지 독서와 생각에만 잠기는 시간', category: '사고법', difficulty: 'Medium' },
    { id: uuidv4(), person: '손흥민', title: '기본기 훈련 루틴', description: '매일 같은 시간에 같은 훈련을 반복하며 감각을 유지하는 규율', category: '자기관리', difficulty: 'Medium' },
    { id: uuidv4(), person: '스티브 잡스', title: '단순함의 미학', description: '불필요한 것을 모두 제거하고 본질만 남기는 미니멀리즘 사고', category: '디자인/사고', difficulty: 'Medium' },
    { id: uuidv4(), person: '오타니 쇼헤이', title: '만다라트 계획표', description: '목표 달성을 위한 64개의 세부 실행 계획 수립', category: '목표관리', difficulty: 'Hard' },
    { id: uuidv4(), person: '아이유', title: '자존감 일기', description: '스스로를 칭찬하고 위로하며 멘탈을 단단하게 만드는 글쓰기', category: '멘탈케어', difficulty: 'Easy' },
    { id: uuidv4(), person: '페이커', title: '겸손과 평정심', description: '승리에도 들뜨지 않고 패배에도 무너지지 않는 부동심 유지', category: '마인드셋', difficulty: 'Hard' },
  ];

  if (!apiKey) {
    console.warn('[AI] GEMINI_API_KEY 없음, 데모 데이터 사용');
    return fallbackHabits;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `전 세계 유명인들의 실천 가능한 **자기계발 습관, 사고법, 성공 원칙** 10가지를 추천해주세요.

조건:
- **구체적이여야 함**: "열심히 살아라"가 아니라 "5분 타임박싱", "5/25 목표 설정법" 처럼 구체적인 방법론 제시.
- **다양한 분야**: 기업인(머스크, 잡스), 투자자(버핏, 멍거), 작가(팀 페리스), 스포츠(손흥민, 고긴스), 멘탈관리(휴버만) 등.
- **난이도**: Easy(누구나 당장 가능), Medium(노력 필요), Hard(강력한 의지 필요)

응답 형식 (JSON 배열만 반환, 설명 X):
[
  {
    "person": "워렌 버핏",
    "title": "5/25 목표 설정법",
    "description": "25가지 목표를 적고, 상위 5개를 제외한 나머지는 버리는 선택과 집중 전략",
    "category": "생산성",
    "difficulty": "Easy"
  },
  {
    "person": "데이비드 고긴스",
    "title": "40% 법칙",
    "description": "한계라고 느낄 때 실제로는 40%밖에 쓰지 않았다는 멘탈 리셋 기법",
    "category": "멘탈",
    "difficulty": "Hard"
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) throw new Error('JSON 파싱 실패');

    const rawSuggestions: any[] = JSON.parse(jsonMatch[0]);

    return rawSuggestions.map(s => ({
      id: uuidv4(),
      person: s.person,
      title: s.title,
      description: s.description,
      category: s.category,
      difficulty: s.difficulty as 'Easy' | 'Medium' | 'Hard'
    }));
  } catch (error) {
    console.error('[AI] 습관 생성 실패, 폴백 사용:', error);
    return fallbackHabits;
  }
}
