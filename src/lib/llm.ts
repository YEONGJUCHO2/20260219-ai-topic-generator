// =============================================
// Gemini 습관 분석 & 바이브 코딩 (v3)
// =============================================
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HabitSuggestion, HabitDetail, VibeCodingIdea } from './types';

// Gemini 인스턴스 (API 키 필요)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyzeHabit(habit: HabitSuggestion): Promise<{ detail: HabitDetail; vibeCoding: VibeCodingIdea }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // 1. 습관 상세 분석 & 실천 가이드 생성
  const habitPrompt = `
    다음 유명인의 습관/방법론을 상세히 분석하여 누구나 따라 할 수 있는 가이드로 만들어주세요.

    인물: ${habit.person}
    습관: ${habit.title}
    설명: ${habit.description}

    요구사항:
    1. **핵심 메시지**: 이 습관의 본질을 한 줄로 요약
    2. **상세 설명**: 왜 이 습관이 중요한지, 어떤 효과가 있는지 3~5줄로 설명
    3. **실천 가이드 (3단계)**: 당장 오늘부터 시작할 수 있는 구체적인 실행 단계 (Step 1, 2, 3)
    4. **적용 예시**: 일반인(직장인, 학생 등)이 삶에 적용했을 때의 시나리오

    응답 형식 (JSON만, 설명 X):
    {
      "coreMessage": "가장 중요한 20%에 집중하여 80%의 성과를 내라",
      "description": "...",
      "actionGuide": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
      "example": "직장인이 아침 9시에 가장 중요한 업무 하나를 끝내고..."
    }
    `;

  // 2. 바이브 코딩 아이디어 생성
  const vibePrompt = `
    이 습관("${habit.title}" - ${habit.person})을 내 삶에 정착시키기 위해,
    **나만을 위한 맞춤형 웹 앱(도구)**을 만든다면 어떤 기능이 필요할까요?
    Cursor나 Replit 같은 AI 코딩 툴에 복사해서 바로 만들 수 있는 기획안을 짜주세요.

    요구사항:
    - **앱 이름**: 직관적이고 매력적인 이름
    - **핵심 기능**: 습관 실천을 돕는 기능 3가지 (예: 타이머, 기록장, 우선순위 필터 등)
    - **구현 난이도**: 1(매우 쉬움) ~ 5(전문적)
    - **AI 프롬프트**: "이런 앱을 만들어줘"라고 AI에게 명령할 수 있는 상세 프롬프트 (HTML/CSS/JS 단일 파일 기준)

    응답 형식 (JSON만):
    {
      "appName": "5분 몰입 타이머",
      "description": "5분 동안 오직 한 가지 일에만 집중하도록 돕는 미니멀 타이머",
      "features": ["남은 시간 시각화", "방해 금지 모드", "성공 횟수 기록"],
      "techStack": ["HTML", "Vanilla JS", "CSS Grid"],
      "difficultyLevel": 2,
      "prompt": "검은 배경에 네온 컬러로 디자인된 5분 타이머 웹앱을 만들어줘. 시작 버튼을 누르면..."
    }
    `;

  try {
    const [habitResult, vibeResult] = await Promise.all([
      model.generateContent(habitPrompt),
      model.generateContent(vibePrompt)
    ]);

    const habitText = habitResult.response.text().trim();
    const vibeText = vibeResult.response.text().trim();

    const detailStr = habitText.match(/\{[\s\S]*\}/)?.[0] || '{}';
    const parsedDetail = JSON.parse(detailStr);

    // AI가 가끔 personName 등을 포함할 수도 있으니, 우리가 정의한 걸 우선시하도록 순서 조정
    const finalDetail: HabitDetail = {
      ...parsedDetail,
      personName: habit.person,
      personTitle: `${habit.category} 전문가`,
      difficulty: habit.difficulty
    };

    const vibeCoding: VibeCodingIdea = JSON.parse(vibeText.match(/\{[\s\S]*\}/)?.[0] || '{}');

    return {
      detail: finalDetail,
      vibeCoding
    };
  } catch (error) {
    console.error('[Analyze] 분석 실패:', error);
    throw new Error('AI 분석에 실패했습니다.');
  }
}
