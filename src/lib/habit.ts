import { GoogleGenerativeAI } from '@google/generative-ai';
import { HabitSuggestion } from './types';
import { v4 as uuidv4 } from 'uuid';

// 폴백 데이터 (항상 준비된 데이터, 셔플해서 사용)
const FALLBACK_POOL: HabitSuggestion[] = [
  { id: '', person: '일론 머스크', title: '5분 타임박싱', description: '하루를 5분 단위로 쪼개어 극도로 집중하는 시간 관리법', category: '생산성', difficulty: 'Hard' },
  { id: '', person: '워렌 버핏', title: '5/25 법칙', description: '가장 중요한 5가지를 위해 나머지 20가지를 포기하는 전략', category: '목표관리', difficulty: 'Easy' },
  { id: '', person: '빌 게이츠', title: '생각 주간 (Think Week)', description: '외부와 단절하고 오로지 독서와 생각에만 잠기는 시간', category: '사고법', difficulty: 'Medium' },
  { id: '', person: '손흥민', title: '기본기 훈련 루틴', description: '매일 같은 시간에 같은 훈련을 반복하며 감각을 유지하는 규율', category: '자기관리', difficulty: 'Medium' },
  { id: '', person: '스티브 잡스', title: '단순함의 미학', description: '불필요한 것을 모두 제거하고 본질만 남기는 미니멀리즘 사고', category: '디자인/사고', difficulty: 'Medium' },
  { id: '', person: '오타니 쇼헤이', title: '만다라트 계획표', description: '목표 달성을 위한 64개의 세부 실행 계획 수립', category: '목표관리', difficulty: 'Hard' },
  { id: '', person: '아이유', title: '자존감 일기', description: '스스로를 칭찬하고 위로하며 멘탈을 단단하게 만드는 글쓰기', category: '멘탈케어', difficulty: 'Easy' },
  { id: '', person: '페이커', title: '겸손과 평정심', description: '승리에도 들뜨지 않고 패배에도 무너지지 않는 부동심 유지', category: '마인드셋', difficulty: 'Hard' },
  { id: '', person: '제프 베조스', title: '후회 최소화 프레임워크', description: '80세의 내가 이 선택을 후회할까? 기준으로 결정하기', category: '의사결정', difficulty: 'Easy' },
  { id: '', person: '마크 저커버그', title: '같은 옷 입기 전략', description: '사소한 의사결정 에너지를 아껴 중요한 일에 쓰는 효율성', category: '생산성', difficulty: 'Easy' },
  { id: '', person: '김연아', title: '무념무상 훈련법', description: '잡념을 버리고 지금 이 순간의 동작에만 집중하는 몰입', category: '멘탈', difficulty: 'Hard' },
  { id: '', person: '노발 라비칸트', title: '행복은 선택이다', description: '행복은 외부 조건이 아니라 내가 선택하는 해석의 문제', category: '철학', difficulty: 'Medium' },
  { id: '', person: '오프라 윈프리', title: '감사 일기', description: '매일 감사한 일 5가지를 적으며 긍정적 뇌 회로 만들기', category: '멘탈케어', difficulty: 'Easy' },
  { id: '', person: '팀 페리스', title: '두려움 설정 (Fear Setting)', description: '최악의 상황을 구체적으로 적어보고 두려움의 실체를 파악하기', category: '용기', difficulty: 'Medium' },
  { id: '', person: '레이 달리오', title: '극단적 투명성', description: '자신의 약점과 실수를 솔직하게 공개하고 피드백을 수용하기', category: '성장', difficulty: 'Hard' },
];

function getFallbackData(): HabitSuggestion[] {
  // 랜덤 셔플 후 10개 선택 (ID 새로 생성)
  const shuffled = [...FALLBACK_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 10).map(item => ({ ...item, id: uuidv4() }));
}

export async function generateHabits(): Promise<HabitSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  // API 키 없으면 바로 폴백
  if (!apiKey) {
    console.warn('[AI] GEMINI_API_KEY 없음, 데모 데이터 사용');
    return getFallbackData();
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // 매번 다른 결과를 위해 현재 시간과 랜덤 시드를 프롬프트에 포함
  const seed = Date.now().toString() + Math.random().toString();

  const prompt = `전 세계 유명인들의 실천 가능한 **자기계발 습관, 사고법, 성공 원칙** 10가지를 추천해주세요.
    
    [중요] **매번 완전히 새로운 인물과 주제를 조합해서 다양하게 추천해주세요.**
    (Seed: ${seed})

    조건:
    - **구체적이여야 함**: "열심히 살아라"가 아니라 "5분 타임박싱", "5/25 목표 설정법" 처럼 구체적인 방법론 제시.
    - **다양한 분야**: 기업인(머스크, 잡스), 투자자(버핏, 멍거), 작가(팀 페리스), 스포츠(손흥민, 고긴스), 멘탈관리, 철학자, 예술가 등.
    - **중복 최소화**: 뻔한 인물만 하지 말고, 역사적 인물이나 새로운 분야의 리더도 포함.
    - **난이도**: Easy(누구나 당장 가능), Medium(노력 필요), Hard(강력한 의지 필요)

    응답 형식 (JSON 배열만 반환, 설명 X):
    [
      {
        "person": "워렌 버핏",
        "title": "5/25 목표 설정법",
        "description": "25가지 목표를 적고, 상위 5개를 제외한 나머지는 버리는 선택과 집중 전략",
        "category": "생산성",
        "difficulty": "Easy"
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
      description: s.description || s.title,
      category: s.category || '기타',
      difficulty: (s.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium'
    }));
  } catch (error) {
    console.error('[AI] 습관 생성 실패, 폴백 사용:', error);
    return getFallbackData();
  }
}
