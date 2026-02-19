// =============================================
// YouTube Data API v3 검색 모듈
// =============================================
import { YouTubeVideo } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ★ 전부 한국어 키워드 — 한국 유튜버가 만든 유명인 분석 영상 위주
const KEYWORD_GROUPS = [
    // 그룹 1: 사고법·원칙
    [
        '일론 머스크 학습법', '일론 머스크 제1원칙', '일론 머스크 사고법',
        '스티브 잡스 사고방식', '제프 베조스 의사결정',
        '레이 달리오 원칙', '찰리 멍거 멘탈모델',
        '샘 올트만 생산성',
    ],
    // 그룹 2: 습관·루틴
    [
        '젠슨 황 습관', '젠슨 황 성공 비결',
        '빌 게이츠 독서', '빌 게이츠 습관',
        '워렌 버핏 하루', '워렌 버핏 습관',
        '앤드류 휴버만 루틴', '마크 저커버그 습관',
    ],
    // 그룹 3: 리더십·철학
    [
        '젠슨 황 리더십', '일론 머스크 경영',
        '사이먼 시넥 리더십', '잭 마 성공',
        '손정의 비전', '정주영 성공',
        '이건희 경영', '팀 쿡 리더십',
    ],
    // 그룹 4: 멘탈·성장
    [
        '데이비드 고긴스 멘탈', '조던 피터슨 자기계발',
        '토니 로빈스 동기부여', '네이벌 라비칸트',
        '제임스 클리어 습관', '아놀드 슈워제네거 규율',
        '손흥민 루틴', '김연아 멘탈',
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
    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set(usedIds);

    for (const keyword of selectedKeywords) {
        try {
            // ★ order=relevance (viewCount보다 관련성 높은 결과)
            // ★ videoDuration 제거 (medium 필터가 결과를 너무 줄임)
            // ★ publishedAfter 제거 (좋은 영상은 오래된 것도 많음)
            const searchParams = new URLSearchParams({
                part: 'snippet',
                q: keyword,
                type: 'video',
                order: 'relevance',
                regionCode: 'KR',
                relevanceLanguage: 'ko',
                maxResults: '10',
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
                // 최소 1000회 (너무 낮으면 품질 낮은 영상 포함됨)
                if (viewCount < 1000) continue;

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

            await new Promise(resolve => setTimeout(resolve, 100));
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

    return { videos: allVideos.slice(0, 10), hasMore: true };
}
