// =============================================
// Gemini LLM 클라이언트 - 동적 전문가 탐색 포함
// =============================================
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Titan, TrendItem, MatchResult, VideoIdea } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function matchTrendsWithTitans(
  trends: TrendItem[],
  titanDb: Titan[]
): Promise<MatchResult[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `당신은 콘텐츠 전략 분석 전문가입니다.
아래 한국의 실시간 트렌드 키워드와 타이탄 방법론 DB를 분석하여, 각 트렌드에 가장 적합한 전문가와 방법론을 매칭해주세요.

## 작업 지시
1. **1차 — 시드 DB 매칭**: 아래 타이탄 DB에서 각 트렌드에 가장 적합한 전문가를 찾으세요.
2. **2차 — AI 동적 탐색**: 시드 DB에 없더라도, 해당 트렌드와 가장 관련성 높은 세계적 전문가/사상가/연구자를 추가로 1~2명 더 찾아서 추천하세요.
   - 특히 경제, 부동산, 투자 관련 트렌드라면 '워렌 버핏', '레이 달리오' 외에도 '하워드 막스', '나발 라비칸트', '피터 린치' 등 거장들의 철학을 연결하세요.

## 트렌드 데이터
${JSON.stringify(trends, null, 2)}

## 타이탄 방법론 DB (시드)
${JSON.stringify(titanDb, null, 2)}

## 출력 형식 (JSON 배열로 정확히 반환)
\`\`\`json
[
  {
    "trendKeyword": "트렌드 키워드",
    "titan": {
      "id": "고유id-영문-소문자",
      "name": "전문가 한국명",
      "nameEn": "Expert English Name",
      "methodology": "방법론 한국명",
      "methodologyEn": "Methodology English Name",
      "description": "방법론 설명 (한국어, 2~3문장)",
      "categories": ["카테고리"],
      "toolLevel": 1, // 1 또는 2
      "keywords": ["관련키워드"],
      "source": "seed_db 또는 ai_discovered"
    },
    "relevanceScore": 85,
    "reasoning": "이 트렌드에 이 전문가가 적합한 이유 (한국어, 2~3문장)"
  }
]
\`\`\`

규칙:
- 각 트렌드당 최소 2개의 매칭 결과를 제공하세요 (시드 DB 1개 + AI 발견 1개 이상)
- AI가 발견한 새로운 전문가(ai_discovered)의 경우, **해당 전문가의 방법론이 시스템이나 도구로 구현 가능한지 판단하여 toolLevel을 1 또는 2로 지정하세요.** (단순 조언이면 1, 시스템/도구/계산기면 2)
- source가 "ai_discovered"인 경우 반드시 실존하는 전문가만 추천하세요
- relevanceScore는 0~100 사이 정수로 표시하세요
- JSON만 반환하고, 다른 텍스트는 포함하지 마세요`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(jsonStr);

  return parsed.map((item: any) => ({
    trend: trends.find(t => t.keyword === item.trendKeyword) || trends[0],
    titan: item.titan as Titan,
    relevanceScore: item.relevanceScore as number,
    reasoning: item.reasoning as string,
    papers: [],
  }));
}

// ---------------------------------------------------------
// 단일 매칭에 대한 기획안 생성 (커스텀 프롬프트 지원)
// ---------------------------------------------------------
export async function generateVideoIdeas(
  match: MatchResult,
  customInstructions?: string
): Promise<VideoIdea[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // 기본 지침 (사용자 입력이 없을 경우 사용)
  const defaultInstructions = `당신은 유튜브 콘텐츠 기획 전문가입니다.
트렌드-전문가 매칭 결과를 바탕으로, 조회수가 폭발할 수 있는 유튜브 영상 기획안을 작성해주세요.

**[중요] 도구(Tool) 기획 지침**:
- 입력된 **'toolLevel' (${match.titan.toolLevel})**을 반드시 준수하세요.
- **Level 1**일 경우: 챗봇 프롬프트, 체크리스트, 워크시트, 질문 리스트 형태.
- **Level 2**일 경우: 계산기, 시뮬레이터, 대시보드, 웹 애플리케이션 형태.
`;

  // 최종 시스템 지침
  const systemInstruction = customInstructions?.trim()
    ? `당신은 콘텐츠 기획자입니다. 다음 사용자의 지침을 **최우선으로 반영**하여 기획안을 작성하세요.\n\n[사용자 지침]\n${customInstructions}`
    : defaultInstructions;

  const prompt = `${systemInstruction}

## 중요 요청사항 (필수 포함)
- **관련 유튜브 영상 (Youtube)**: 해당 전문가가 출연했거나 본인의 채널, 혹은 TED 강연 등 **실제로 존재하는 유명한 영상 링크**를 1개 찾아주세요.
- **추천 서적 (Book)**: 해당 전문가의 대표 저서나 방법론을 다룬 책을 1권 추천해주세요.

## 매칭 데이터
${JSON.stringify({
    trend: match.trend.keyword,
    category: match.trend.category,
    titan: match.titan.name,
    methodology: match.titan.methodology,
    toolLevel: match.titan.toolLevel, // AI는 이 값을 반드시 따라야 함
    reasoning: match.reasoning,
    papers: match.papers?.map(p => ({ title: p.title })),
  }, null, 2)}

## 도구(Tool) 개발 난이도 기준 (참고용)
- **Level 1**: 텍스트 봇 (질문/답변), 체크리스트
- **Level 2**: 웹앱 (계산기, 시각화, 트래커)

## 출력 형식 (JSON 배열 - 형식을 반드시 준수할 것)
\`\`\`json
[
  {
    "trend": "트렌드 키워드",
    "titanName": "전문가 이름",
    "methodology": "방법론 이름",
    "titles": [
      "영상 제목안 1",
      "영상 제목안 2",
      "영상 제목안 3"
    ],
    "thumbnailText": "썸네일 텍스트",
    "hookingPhrase": "후킹 문구",
    "paperCitation": "논문 인용구 (없으면 빈 문자열)",
    "relatedYoutube": {
      "title": "영상 제목",
      "channel": "채널명",
      "url": "URL"
    },
    "relatedBook": {
      "title": "책 제목",
      "author": "저자"
    },
    "toolConcept": {
      "name": "도구 이름",
      "description": "도구 설명",
      "features": ["기능1", "기능2"],
      "level": ${match.titan.toolLevel}
    }
  }
]
\`\`\`

JSON만 반환하세요.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}
