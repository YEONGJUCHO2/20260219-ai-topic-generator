// =============================================
// YouTube Data API v3 검색 모듈
// =============================================
import { YouTubeVideo } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// 검색 키워드 풀 (랜덤 로테이션)
const SEARCH_KEYWORDS = [
    // 해외 유명인 + 습관/자기계발
    '일론 머스크 습관',
    '워렌 버핏 투자 원칙',
    '젠슨 황 리더십',
    '빌 게이츠 독서법',
    '제프 베조스 경제 습관',
    '앤드류 휴버만 루틴',
    '팀 페리스 자기관리',
    '마크 저커버그 습관',
    '레이 달리오 원칙',
    '찰리 멍거 투자',
    // 자기계발/공부법 일반
    '성공한 사람 습관',
    '부자 습관 루틴',
    '자기계발 루틴',
    '공부법 천재',
    '경제 관리 방법',
    '시간 관리 방법',
    '독서법 성공',
    '도파민 디톡스',
    '딥워크 집중력',
    '아침 루틴 성공',
];

/**
 * YouTube Data API v3로 인기 영상 검색
 * @param offset - 키워드 로테이션 오프셋
 * @param usedIds - 이미 사용한 영상 ID 목록
 * @returns 유튜브 영상 목록
 */
export async function searchYouTubeVideos(
    offset: number = 0,
    usedIds: string[] = []
): Promise<{ videos: YouTubeVideo[]; hasMore: boolean }> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    // 키워드 로테이션: offset에 따라 다른 키워드 3개 선택
    const keywordCount = SEARCH_KEYWORDS.length;
    const selectedKeywords: string[] = [];
    for (let i = 0; i < 3; i++) {
        const idx = (offset * 3 + i) % keywordCount;
        selectedKeywords.push(SEARCH_KEYWORDS[idx]);
    }

    // 30일 전 날짜 계산
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const publishedAfter = thirtyDaysAgo.toISOString();

    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set(usedIds);

    for (const keyword of selectedKeywords) {
        try {
            // 1단계: 검색 (search.list)
            const searchParams = new URLSearchParams({
                part: 'snippet',
                q: keyword,
                type: 'video',
                order: 'viewCount',
                publishedAfter,
                regionCode: 'KR',
                relevanceLanguage: 'ko',
                maxResults: '10',
                videoDuration: 'medium', // 4~20분
                key: apiKey,
            });

            const searchRes = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`);
            if (!searchRes.ok) {
                console.error(`[YouTube] 검색 실패 (${keyword}):`, searchRes.status);
                continue;
            }

            const searchData = await searchRes.json();
            if (!searchData.items || searchData.items.length === 0) continue;

            // 영상 ID 추출
            const videoIds = searchData.items
                .map((item: any) => item.id?.videoId)
                .filter((id: string) => id && !seenIds.has(id));

            if (videoIds.length === 0) continue;

            // 2단계: 통계 정보 가져오기 (videos.list)
            const statsParams = new URLSearchParams({
                part: 'statistics,snippet',
                id: videoIds.join(','),
                key: apiKey,
            });

            const statsRes = await fetch(`${YOUTUBE_API_BASE}/videos?${statsParams}`);
            if (!statsRes.ok) continue;

            const statsData = await statsRes.json();

            for (const item of statsData.items || []) {
                if (seenIds.has(item.id)) continue;
                seenIds.add(item.id);

                const viewCount = parseInt(item.statistics?.viewCount || '0', 10);
                // 최소 조회수 필터 (1만 이상)
                if (viewCount < 10000) continue;

                allVideos.push({
                    videoId: item.id,
                    title: item.snippet?.title || '',
                    channelTitle: item.snippet?.channelTitle || '',
                    description: item.snippet?.description || '',
                    viewCount: viewCount.toLocaleString('ko-KR'),
                    publishedAt: item.snippet?.publishedAt || '',
                    thumbnailUrl: item.snippet?.thumbnails?.high?.url ||
                        item.snippet?.thumbnails?.medium?.url ||
                        item.snippet?.thumbnails?.default?.url || '',
                    youtubeUrl: `https://www.youtube.com/watch?v=${item.id}`,
                });
            }

            // API 레이트 리밋 방지
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`[YouTube] 키워드 "${keyword}" 검색 에러:`, error);
        }
    }

    // 조회수 높은순 정렬
    allVideos.sort((a, b) => {
        const aCount = parseInt(a.viewCount.replace(/,/g, ''), 10);
        const bCount = parseInt(b.viewCount.replace(/,/g, ''), 10);
        return bCount - aCount;
    });

    // 상위 15개까지만 (AI 필터링용)
    const topVideos = allVideos.slice(0, 15);
    const hasMore = (offset + 1) * 3 < keywordCount;

    return { videos: topVideos, hasMore };
}
