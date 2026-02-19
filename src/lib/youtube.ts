// =============================================
// YouTube Data API v3 검색 모듈
// =============================================
import { YouTubeVideo } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// 카테고리별 키워드 (각 카테고리에서 1개씩 뽑아서 다양성 보장)
const KEYWORD_GROUPS = [
    // 그룹 1: 기업인/리더
    [
        '일론 머스크 습관', '젠슨 황 리더십', '빌 게이츠 독서법',
        '제프 베조스 습관', '마크 저커버그 습관', '스티브 잡스 습관',
        '잭 마 성공', '팀 쿡 리더십',
    ],
    // 그룹 2: 투자/경제
    [
        '워렌 버핏 투자 원칙', '레이 달리오 원칙', '찰리 멍거 투자',
        '피터 린치 투자', '조지 소로스 투자', '부자 습관 루틴',
        '경제 관리 방법', '재테크 성공 습관',
    ],
    // 그룹 3: 자기계발/학자/인플루언서
    [
        '앤드류 휴버만 루틴', '팀 페리스 자기관리', '토니 로빈스 습관',
        '짐 론 성공', '사이먼 시넥 리더십', '아담 그랜트 심리학',
        '도파민 디톡스', '딥워크 집중력',
    ],
    // 그룹 4: 공부법/루틴
    [
        '성공한 사람 아침 루틴', '천재 공부법', '시간 관리 방법',
        '독서법 성공', '자기계발 루틴', '아침 루틴 성공',
        '하버드 공부법', '미라클 모닝',
    ],
];

/**
 * 각 그룹에서 1개씩 랜덤으로 뽑아 다양한 인물 보장
 */
function pickDiverseKeywords(): string[] {
    return KEYWORD_GROUPS.map(group => {
        const idx = Math.floor(Math.random() * group.length);
        return group[idx];
    });
}

/**
 * YouTube Data API v3로 인기 영상 검색
 */
export async function searchYouTubeVideos(
    offset: number = 0,
    usedIds: string[] = []
): Promise<{ videos: YouTubeVideo[]; hasMore: boolean }> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    // 각 카테고리에서 1개씩 → 4개 키워드 (다양한 인물 보장)
    const selectedKeywords = pickDiverseKeywords();

    // 30일 전 날짜 계산
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const publishedAfter = thirtyDaysAgo.toISOString();

    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set(usedIds);
    const seenChannels = new Set<string>(); // 같은 채널 중복 방지

    for (const keyword of selectedKeywords) {
        try {
            const searchParams = new URLSearchParams({
                part: 'snippet',
                q: keyword,
                type: 'video',
                order: 'viewCount',
                publishedAfter,
                regionCode: 'KR',
                relevanceLanguage: 'ko',
                maxResults: '8',
                videoDuration: 'medium',
                key: apiKey,
            });

            const searchRes = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`);
            if (!searchRes.ok) {
                console.error(`[YouTube] 검색 실패 (${keyword}):`, searchRes.status);
                continue;
            }

            const searchData = await searchRes.json();
            if (!searchData.items || searchData.items.length === 0) continue;

            const videoIds = searchData.items
                .map((item: any) => item.id?.videoId)
                .filter((id: string) => id && !seenIds.has(id));

            if (videoIds.length === 0) continue;

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

                const channel = item.snippet?.channelTitle || '';
                // 같은 채널에서 최대 1개만 (다양성 보장)
                if (seenChannels.has(channel)) continue;

                seenIds.add(item.id);
                seenChannels.add(channel);

                const viewCount = parseInt(item.statistics?.viewCount || '0', 10);
                if (viewCount < 5000) continue;

                allVideos.push({
                    videoId: item.id,
                    title: item.snippet?.title || '',
                    channelTitle: channel,
                    description: item.snippet?.description || '',
                    viewCount: viewCount.toLocaleString('ko-KR'),
                    publishedAt: item.snippet?.publishedAt || '',
                    thumbnailUrl: item.snippet?.thumbnails?.high?.url ||
                        item.snippet?.thumbnails?.medium?.url ||
                        item.snippet?.thumbnails?.default?.url || '',
                    youtubeUrl: `https://www.youtube.com/watch?v=${item.id}`,
                });
            }

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

    const topVideos = allVideos.slice(0, 15);

    return { videos: topVideos, hasMore: true };
}
