// =============================================
// YouTube Data API v3 검색 모듈
// =============================================
import { YouTubeVideo } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ★ 습관·원칙·사고법·리더십 중심 키워드 (경제 편중 해소)
const KEYWORD_GROUPS = [
    // 그룹 1: 사고법·원칙
    [
        '일론 머스크 제1원칙', 'Elon Musk first principles',
        '찰리 멍거 멘탈모델', '레이 달리오 원칙',
        '제프 베조스 의사결정', 'Jeff Bezos decision making',
        '스티브 잡스 사고방식', 'Steve Jobs think different',
        '샘 올트만 생산성', 'Sam Altman productivity',
    ],
    // 그룹 2: 습관·루틴·자기관리
    [
        '젠슨 황 습관', 'Jensen Huang daily routine',
        '빌 게이츠 독서 습관', 'Bill Gates reading habit',
        '앤드류 휴버만 루틴', 'Andrew Huberman morning routine',
        '팀 페리스 자기관리', 'Tim Ferriss habit',
        '오프라 윈프리 루틴', '마크 저커버그 습관',
        '오바마 루틴', '아놀드 슈워제네거 규율',
    ],
    // 그룹 3: 리더십·성공 철학
    [
        '젠슨 황 리더십', 'Jensen Huang leadership',
        '사이먼 시넥 리더십', 'Simon Sinek why',
        '잭 마 성공 철학', 'Jack Ma philosophy',
        '팀 쿡 리더십', 'Satya Nadella leadership',
        '일론 머스크 경영 철학', '손정의 비전',
    ],
    // 그룹 4: 멘탈·집중력·자기극복
    [
        '데이비드 고긴스 멘탈', 'David Goggins mindset',
        '조던 피터슨 자기계발', 'Jordan Peterson discipline',
        '토니 로빈스 동기부여', 'Tony Robbins motivation',
        '네이벌 라비칸트 지혜', 'Naval Ravikant wisdom',
        '제임스 클리어 습관', 'James Clear atomic habits',
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
