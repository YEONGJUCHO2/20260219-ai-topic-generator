// =============================================
// Gemini 2.5 Pro 분석 엔진 (v2)
// =============================================
import { GoogleGenerativeAI } from '@google/generative-ai';
import { YouTubeVideo, HabitAnalysis, VibeCodingIdea } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * 유튜브 영상 목록에서 "누구나 아는 유명인"만 필터링
 */
export async function filterFamousOnly(videos: YouTubeVideo[]): Promise<YouTubeVideo[]> {
  if (videos.length === 0) return [];

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const videoList = videos.map((v, i) => `${i}. "${v.title}" (채널: ${v.channelTitle})`).join('\n');

  const prompt = `아래 유튜브 영상 목록에서 **세계적으로 유명한 인물**이 주인공으로 다뤄지는 영상만 골라주세요.

매우 엄격한 기준 (반드시 아래에 해당해야만 포함):
- ✅ 포함: 일론 머스크, 워렌 버핏, 젠슨 황, 빌 게이츠, 제프 베조스, 마크 저커버그, 스티브 잡스, 팀 쿡, 샘 올트만
- ✅ 포함: 레이 달리오, 찰리 멍거, 피터 린치, 조지 소로스, 짐 로저스
- ✅ 포함: 앤드류 휴버만, 팀 페리스, 토니 로빈스, 사이먼 시넥, 조던 피터슨, 데이비드 고긴스, 네이벌 라비칸트
- ✅ 포함: 오프라 윈프리, 오바마, 아놀드 슈워제네거, 잭 마(마윈)
- ✅ 포함: 손흥민, 이재용, BTS 등 한국인이라면 전국민이 아는 수준만
- ❌ 절대 제외: 일반 유튜버, 대학생 브이로거, 하버드/스탠퍼드 학생 브이로그
- ❌ 절대 제외: 채널 구독자가 100만 미만인 무명 인플루언서
- ❌ 절대 제외: "~친구들", "~의 하루", "~브이로그" 같은 일상 콘텐츠
- ❌ 절대 제외: 영상 제목에 유명인 이름이 없고 일반적인 자기계발 팁만 다루는 영상

핵심: 영상의 주인공이나 핵심 소재가 **위키피디아에 단독 문서가 있을 정도로 유명한 인물**이어야 합니다.

영상 목록:
${videoList}

응답 형식 (JSON 배열, 인덱스만):
[0, 3, 7]

해당하는 영상이 없으면 빈 배열 [] 을 반환하세요.
반드시 JSON 배열만 반환하세요. 설명 없이 숫자 배열만.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // JSON 파싱
    const jsonMatch = text.match(/\[[\d\s,]*\]/);
    if (!jsonMatch) return videos.slice(0, 5); // 파싱 실패 시 원본 5개 반환

    const indices: number[] = JSON.parse(jsonMatch[0]);
    const filtered = indices
      .filter(i => i >= 0 && i < videos.length)
      .map(i => videos[i]);

    return filtered.length > 0 ? filtered : videos.slice(0, 5);
  } catch (error) {
    console.error('[LLM] 유명인 필터링 에러:', error);
    return videos.slice(0, 5);
  }
}

/**
 * 선택된 유튜브 영상의 유명인 습관을 AI 분석
 */
export async function analyzeHabit(
  video: YouTubeVideo
): Promise<{ analysis: HabitAnalysis; vibeCoding: VibeCodingIdea }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `아래 유튜브 영상의 내용을 분석해주세요.

## 영상 정보
- 제목: ${video.title}
- 채널: ${video.channelTitle}
- 조회수: ${video.viewCount}회
- 설명: ${video.description.slice(0, 500)}

## 분석 요청

이 영상에서 다루는 유명인의 습관/공부법/자기관리/경제관리 방법에 대해 아래 형식으로 분석해주세요.

### 반드시 아래 JSON 형식으로만 응답하세요:

\`\`\`json
{
  "analysis": {
    "personName": "인물 이름 (예: 일론 머스크)",
    "personTitle": "인물 직함 (예: 테슬라·스페이스X CEO)",
    "coreMessage": "이 습관의 핵심을 한 줄로 (예: 하루를 5분 단위로 쪼개서 시간의 밀도를 극대화한다)",
    "description": "이 습관/방법론에 대한 상세 설명. 왜 효과적인지, 어떤 원리가 있는지 3~5줄로 설명",
    "actionGuide": [
      "1단계: 구체적인 실행 방법 (초보자도 바로 시작할 수 있게)",
      "2단계: 심화 단계 (1주일 후)",
      "3단계: 습관화 단계 (1달 후)"
    ],
    "example": "직장인 A씨(28세, 마케팅)가 이 방법을 적용한다면... (구체적 시나리오로 100자 이상)"
  },
  "vibeCoding": {
    "appName": "이 습관을 실행/추적할 수 있는 앱 이름 (예: 타임 블록 매니저)",
    "description": "앱이 하는 일 한 줄 설명",
    "features": [
      "핵심 기능 1",
      "핵심 기능 2",
      "핵심 기능 3"
    ],
    "techStack": ["HTML/CSS", "JavaScript"],
    "difficultyLevel": 2,
    "prompt": "AI에게 이 앱을 만들어달라고 할 때 사용할 프롬프트. 기능, UI, 동작을 구체적으로 설명한 200자 이상의 프롬프트."
  }
}
\`\`\`

### 난이도 기준 (바이브 코딩 구현 난이도):
- Level 1: HTML/CSS만으로 구현 (정적 페이지, 체크리스트)
- Level 2: JavaScript 필요 (타이머, 계산기, 로컬 저장)
- Level 3: API 연동 (차트, 외부 데이터, DB)
- Level 4: 백엔드 서버 필요 (인증, 동기화)
- Level 5: AI/ML 또는 복잡한 시스템

반드시 위 JSON 형식으로만 응답하세요. JSON 외의 텍스트는 포함하지 마세요.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // JSON 블록 추출
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  const parsed = JSON.parse(jsonStr);

  return {
    analysis: parsed.analysis,
    vibeCoding: {
      ...parsed.vibeCoding,
      difficultyLevel: Math.min(5, Math.max(1, parsed.vibeCoding.difficultyLevel || 2)),
    },
  };
}
