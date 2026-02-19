// =============================================
// YouTube Data API v3 검색 모듈 (v3 - AI 큐레이션)
// =============================================
import { YouTubeVideo } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface Suggestion {
    person: string;     // 예: 일론 머스크
    topic: string;      // 예: 5분 단위 계획법 (타임박싱)
    category: string;   // 예: 생산성
    query: string;      // 예: 일론 머스크 타임박싱 하는법
}

/**
 * Gemini로 "따라 하기 좋은 구체적인 습관/방법" 10가지 기획
 */
async function generateHabitSuggestions(): Promise<Suggestion[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `전 세계적으로 유명한 인물들의 **구체적이고 실천 가능한** 자기계발 습관, 동기부여 방법, 경제 관리법, 마인드셋 등 **10가지**를 추천해주세요.

조건:
- 💡 **핵심**: "누가" 하는지보다 "무엇을" 배울 수 있는지가 명확해야 함 (예: 워렌 버핏의 '5/25 법칙', 아이유의 '귀차니즘 극복법')
- **따라 하기 쉬운 것**: 너무 추상적인 철학보다는 구체적인 행동 방법 위주
- **다양성**: 기업가, 투자자, 연예인, 운동선수, 작가 등 다양한 분야의 인물 포함
- **한국어 영상 존재 여부**: 유튜브에 한국어로 검색했을 때 관련 영상이 반드시 있을 만한 주제여야 함

응답 형식 (JSON 배열만 반환, 설명 X):
[
  {
    "person": "워렌 버핏",
    "topic": "목표 달성을 위한 5/25 법칙",
    "category": "목표관리",
    "query": "워렌 버핏 5/25 법칙"
  },
  {
    "person": "손흥민",
    "topic": "월드클래스의 기본기 훈련 루틴",
    "category": "자기관리",
    "query": "손흥민 훈련 루틴 동기부여"
  },
  ...
]

반드시 JSON 배열만 출력하세요.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);

        if (!jsonMatch) throw new Error('JSON 파싱 실패');

        const suggestions: Suggestion[] = JSON.parse(jsonMatch[0]);
        // 10개만 리턴
        return suggestions.slice(0, 10);
    } catch (error) {
        console.error('[AI] 제안 생성 실패, 폴백 사용:', error);
        return [
            { person: '일론 머스크', topic: '초생산성 타임박싱 기법', category: '시간관리', query: '일론 머스크 타임박싱' },
            { person: '워렌 버핏', topic: '복리의 마법과 장기 투자', category: '재테크', query: '워렌 버핏 복리 투자' },
            { person: '스티브 잡스', topic: '단순함의 미학 (미니멀리즘)', category: '사고법', query: '스티브 잡스 미니멀리즘' },
            { person: '손흥민', topic: '절대 포기하지 않는 멘탈 관리', category: '동기부여', query: '손흥민 멘탈 관리' },
            { person: '오타니 쇼헤이', topic: '목표 달성 만다라트 기법', category: '목표관리', query: '오타니 만다라트 계획표' },
            { person: '김연아', topic: '무념무상 멘탈 관리법', category: '마인드셋', query: '김연아 멘탈 관리' },
            { person: '페이커', topic: '꾸준함과 겸손의 힘', category: '자기관리', query: '페이커 독서 습관' },
            { person: '아이유', topic: '자존감 높이는 마인드셋', category: '멘탈케어', query: '아이유 자존감 조언' },
            { person: '마크 저커버그', topic: '단벌 신사 패션의 이유', category: '의사결정', query: '마크 저커버그 옷 똑같은 이유' },
            { person: '빌 게이츠', topic: '생각 주간(Think Week)', category: '휴식/생각', query: '빌 게이츠 생각 주간' },
        ];
    }
}

// 한글 포함 여부 체크
function hasKorean(text: string): boolean {
    return /[가-힣]/.test(text);
}

// ISO 8601 duration → 초 변환
function parseDuration(iso: string): number {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    const s = parseInt(match[3] || '0', 10);
    return h * 3600 + m * 60 + s;
}

export async function searchYouTubeVideos(
    offset: number = 0,
    usedIds: string[] = []
): Promise<{ videos: YouTubeVideo[]; hasMore: boolean }> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');

    // ★ 1. AI가 10가지 습관 제안 생성
    const suggestions = await generateHabitSuggestions();
    console.log('[YouTube] AI 제안 토픽:', suggestions.map(s => s.topic).join(', '));

    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set(usedIds);

    // ★ 2. 각 제안별로 최적의 영상 1개씩 검색
    for (const s of suggestions) {
        try {
            const searchParams = new URLSearchParams({
                part: 'snippet',
                q: s.query,
                type: 'video',
                order: 'relevance',
                regionCode: 'KR',
                relevanceLanguage: 'ko',
                maxResults: '3', // 상위 3개 중 가장 좋은 1개 선택
                key: apiKey,
            });

            const searchRes = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`);
            if (!searchRes.ok) continue;

            const searchData = await searchRes.json();
            if (!searchData.items || searchData.items.length === 0) continue;

            const videoIds = searchData.items
                .map((item: any) => item.id?.videoId)
                .filter((id: string) => id && !seenIds.has(id));

            if (videoIds.length === 0) continue;

            // 상세 정보 조회 (조회수, 길이 확인)
            const statsParams = new URLSearchParams({
                part: 'statistics,snippet,contentDetails',
                id: videoIds.join(','),
                key: apiKey,
            });

            const statsRes = await fetch(`${YOUTUBE_API_BASE}/videos?${statsParams}`);
            if (!statsRes.ok) continue;
            const statsData = await statsRes.json();

            let bestVideo: YouTubeVideo | null = null;
            let bestScore = -1;

            for (const item of statsData.items || []) {
                if (seenIds.has(item.id)) continue;

                const title = item.snippet?.title || '';
                // 한국어 포함 필수
                if (!hasKorean(title)) continue;

                // 숏폼 제외 (90초 미만)
                const duration = parseDuration(item.contentDetails?.duration || '');
                if (duration < 90) continue;

                // 조회수 (최소 1000회)
                const viewCount = parseInt(item.statistics?.viewCount || '0', 10);
                if (viewCount < 1000) continue;

                // 점수 산정: 조회수 높을수록 좋음 (간단히)
                const score = viewCount;

                if (score > bestScore) {
                    bestScore = score;
                    bestVideo = {
                        videoId: item.id,
                        title,
                        channelTitle: item.snippet?.channelTitle || '',
                        description: item.snippet?.description || '',
                        viewCount: viewCount.toLocaleString('ko-KR'),
                        publishedAt: item.snippet?.publishedAt || '',
                        thumbnailUrl: item.snippet?.thumbnails?.high?.url ||
                            item.snippet?.thumbnails?.medium?.url ||
                            item.snippet?.thumbnails?.default?.url || '',
                        youtubeUrl: `https://www.youtube.com/watch?v=${item.id}`,
                        suggestion: `${s.person}: ${s.topic}`,  // ★ AI 제안 멘트 추가
                        category: s.category
                    };
                }
            }

            if (bestVideo) {
                seenIds.add(bestVideo.videoId);
                allVideos.push(bestVideo);
            }
            // 너무 빨리 API 호출하면 제한 걸릴 수 있으니 딜레이
            await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
            console.error(`[Search] ${s.query} 검색 실패:`, error);
        }
    }

    // 결과 반환 (AI 제안 순서 유지하거나, 조회수 순 정렬 선택 가능. 일단 제안 순서 유지)
    return { videos: allVideos, hasMore: true };
}
