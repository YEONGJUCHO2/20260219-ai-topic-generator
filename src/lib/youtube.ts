// =============================================
// YouTube Data API v3 검색 모듈
// =============================================
import { YouTubeVideo } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Gemini로 랜덤 유명인 5명 + 한국어 검색 키워드 생성
 */
async function generateRandomPersons(): Promise<{ name: string; query: string }[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `전 세계에서 유명한 인물 5명을 랜덤으로 추천해주세요.

조건:
- 각 인물은 자기계발, 습관, 성공 철학, 리더십, 학습법, 경영, 투자, 멘탈관리, 생산성 중 하나와 관련 있어야 합니다.
- 기업인, 투자자, 과학자, 작가, 운동선수, 정치인, 인플루언서 등 다양한 분야에서 골고루 선택하세요.
- 유튜브에서 이 인물에 대한 한국어 영상이 있을 만한 사람이어야 합니다.
- 매번 새로운 조합을 만들어주세요. 다양하게!
- 역사적 인물(벤자민 프랭클린, 나폴레옹 등)도 포함 가능합니다.

응답 형식 (반드시 JSON 배열만, 설명 없이):
[
  {"name": "일론 머스크", "query": "일론 머스크 학습법"},
  {"name": "오프라 윈프리", "query": "오프라 윈프리 아침 루틴"},
  {"name": "손흥민", "query": "손흥민 자기관리"},
  {"name": "워렌 버핏", "query": "워렌 버핏 습관"},
  {"name": "앤드류 휴버만", "query": "앤드류 휴버만 수면 루틴"}
]

반드시 한국어 query를 생성하세요. JSON 배열만 반환하세요.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('JSON 파싱 실패');

        const persons: { name: string; query: string }[] = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(persons) || persons.length === 0) throw new Error('빈 배열');

        return persons.slice(0, 5);
    } catch (error) {
        console.error('[LLM] 유명인 생성 실패, 폴백 사용:', error);
        // 폴백: 기본 인물 5명
        return [
            { name: '일론 머스크', query: '일론 머스크 습관' },
            { name: '젠슨 황', query: '젠슨 황 리더십' },
            { name: '빌 게이츠', query: '빌 게이츠 독서' },
            { name: '데이비드 고긴스', query: '데이비드 고긴스 멘탈' },
            { name: '스티브 잡스', query: '스티브 잡스 사고방식' },
        ];
    }
}

// 한글 포함 여부 체크
function hasKorean(text: string): boolean {
    return /[가-힣]/.test(text);
}

// ISO 8601 duration → 초 변환 (PT1H2M3S → 3723)
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
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    // ★ Gemini가 매번 새로운 유명인 5명 생성
    const persons = await generateRandomPersons();
    console.log('[YouTube] 이번 검색 인물:', persons.map(p => p.name).join(', '));

    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set(usedIds);

    for (const person of persons) {
        try {
            const searchParams = new URLSearchParams({
                part: 'snippet',
                q: person.query,
                type: 'video',
                order: 'relevance',
                regionCode: 'KR',
                relevanceLanguage: 'ko',
                maxResults: '8',
                key: apiKey,
            });

            const searchRes = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`);
            if (!searchRes.ok) {
                console.error(`[YouTube] 검색 실패 (${person.query}):`, searchRes.status);
                continue;
            }

            const searchData = await searchRes.json();
            if (!searchData.items || searchData.items.length === 0) continue;

            const videoIds = searchData.items
                .map((item: any) => item.id?.videoId)
                .filter((id: string) => id && !seenIds.has(id));

            if (videoIds.length === 0) continue;

            const statsParams = new URLSearchParams({
                part: 'statistics,snippet,contentDetails',
                id: videoIds.join(','),
                key: apiKey,
            });

            const statsRes = await fetch(`${YOUTUBE_API_BASE}/videos?${statsParams}`);
            if (!statsRes.ok) continue;

            const statsData = await statsRes.json();

            // 이 인물에서 가장 좋은 한국어 영상 1개 선택
            let bestVideo: YouTubeVideo | null = null;
            let bestViews = 0;

            for (const item of statsData.items || []) {
                if (seenIds.has(item.id)) continue;

                const title = item.snippet?.title || '';
                if (!hasKorean(title)) continue;

                // ★ 숏폼 제외 (90초 이하)
                const duration = parseDuration(item.contentDetails?.duration || '');
                if (duration < 90) continue;

                const viewCount = parseInt(item.statistics?.viewCount || '0', 10);
                if (viewCount < 500) continue;

                if (viewCount > bestViews) {
                    bestViews = viewCount;
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
                    };
                }
            }

            if (bestVideo) {
                seenIds.add(bestVideo.videoId);
                allVideos.push(bestVideo);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`[YouTube] 인물 "${person.name}" 검색 에러:`, error);
        }
    }

    // 조회수 높은순 정렬
    allVideos.sort((a, b) => {
        const aCount = parseInt(a.viewCount.replace(/,/g, ''), 10);
        const bCount = parseInt(b.viewCount.replace(/,/g, ''), 10);
        return bCount - aCount;
    });

    return { videos: allVideos, hasMore: true };
}
