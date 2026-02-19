// =============================================
// YouTube Data API v3 검색 모듈
// =============================================
import { YouTubeVideo } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ★ 반드시 세계적으로 유명한 인물 이름이 들어간 키워드만 사용
const KEYWORD_GROUPS = [
    // 그룹 1: 테크/기업 리더
    [
        'Elon Musk habit', '일론 머스크 습관', '일론 머스크 루틴',
        'Jensen Huang leadership', '젠슨 황 성공 비결',
        'Bill Gates routine', '빌 게이츠 습관',
        'Jeff Bezos habit', '제프 베조스 경영',
        'Mark Zuckerberg routine', '마크 저커버그',
        'Steve Jobs philosophy', '스티브 잡스 습관',
        'Sam Altman productivity', '샘 올트만',
    ],
    // 그룹 2: 투자/경제 거물
    [
        'Warren Buffett investing', '워렌 버핏 습관',
        'Ray Dalio principles', '레이 달리오 원칙',
        'Charlie Munger wisdom', '찰리 멍거 투자 철학',
        'Peter Lynch investing', '피터 린치',
        'George Soros strategy', '조지 소로스',
        'Jim Rogers investing', '짐 로저스',
        'Howard Marks investing', '하워드 막스',
    ],
    // 그룹 3: 세계적 인플루언서/과학자
    [
        'Andrew Huberman routine', '앤드류 휴버만 루틴',
        'Tim Ferriss habit', '팀 페리스 습관',
        'Tony Robbins morning', '토니 로빈스',
        'Simon Sinek leadership', '사이먼 시넥',
        'Naval Ravikant', '네이벌 라비칸트',
        'Jordan Peterson habit', '조던 피터슨 습관',
        'David Goggins mindset', '데이비드 고긴스',
    ],
    // 그룹 4: 유명인 자기관리/독서/루틴
    [
        'Oprah Winfrey routine', '오프라 윈프리 습관',
        'Barack Obama routine', '오바마 루틴',
        'Arnold Schwarzenegger discipline', '아놀드 슈워제네거',
        'Jack Ma success', '마윈 성공 습관',
        'BTS RM reading', '손흥민 루틴',
        '이재용 습관', '김범수 카카오 습관',
    ],
];

function pickDiverseKeywords(): string[] {
    return KEYWORD_GROUPS.map(group => {
        const idx = Math.floor(Math.random() * group.length);
        return group[idx];
    });
}

export async function searchYouTubeVideos(
    offset: number = 0,
    usedIds: string[] = []
): Promise<{ videos: YouTubeVideo[]; hasMore: boolean }> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    const selectedKeywords = pickDiverseKeywords();

    // 90일로 확장 (30일은 너무 짧아서 결과 부족)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 90);
    const publishedAfter = daysAgo.toISOString();

    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set(usedIds);

    for (const keyword of selectedKeywords) {
        try {
            const searchParams = new URLSearchParams({
                part: 'snippet',
                q: keyword,
                type: 'video',
                order: 'viewCount',
                publishedAfter,
                maxResults: '10',
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
                seenIds.add(item.id);

                const viewCount = parseInt(item.statistics?.viewCount || '0', 10);
                if (viewCount < 5000) continue;

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

    const topVideos = allVideos.slice(0, 20);
    return { videos: topVideos, hasMore: true };
}
