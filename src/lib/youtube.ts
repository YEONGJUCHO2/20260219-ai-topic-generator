// =============================================
// YouTube Data API v3 검색 모듈
// =============================================
import { YouTubeVideo } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ★ 인물별 키워드 — 매번 다른 인물을 검색해서 다양성 보장
const PERSON_KEYWORDS: { name: string; queries: string[] }[] = [
    { name: '일론 머스크', queries: ['일론 머스크 학습법', '일론 머스크 습관', '일론 머스크 제1원칙', '일론 머스크 성공 비결'] },
    { name: '젠슨 황', queries: ['젠슨 황 습관', '젠슨 황 리더십', '젠슨 황 성공 비결', '엔비디아 젠슨 황'] },
    { name: '빌 게이츠', queries: ['빌 게이츠 독서', '빌 게이츠 습관', '빌 게이츠 성공', '빌 게이츠 루틴'] },
    { name: '스티브 잡스', queries: ['스티브 잡스 사고방식', '스티브 잡스 습관', '스티브 잡스 명언', '스티브 잡스 철학'] },
    { name: '워렌 버핏', queries: ['워렌 버핏 습관', '워렌 버핏 투자 원칙', '워렌 버핏 하루', '워렌 버핏 독서'] },
    { name: '제프 베조스', queries: ['제프 베조스 의사결정', '제프 베조스 리더십', '제프 베조스 성공'] },
    { name: '마크 저커버그', queries: ['마크 저커버그 습관', '마크 저커버그 루틴', '저커버그 경영'] },
    { name: '레이 달리오', queries: ['레이 달리오 원칙', '레이 달리오 성공', '레이 달리오 인생 원칙'] },
    { name: '찰리 멍거', queries: ['찰리 멍거 멘탈모델', '찰리 멍거 지혜', '찰리 멍거 투자 철학'] },
    { name: '샘 올트만', queries: ['샘 올트만 생산성', '샘 올트만 AI', '샘 올트만 성공'] },
    { name: '앤드류 휴버만', queries: ['앤드류 휴버만 루틴', '앤드류 휴버만 수면', '휴버만 집중력', '휴버만 습관'] },
    { name: '팀 페리스', queries: ['팀 페리스 자기관리', '팀 페리스 습관', '팀 페리스 루틴'] },
    { name: '사이먼 시넥', queries: ['사이먼 시넥 리더십', '사이먼 시넥 WHY', '사이먼 시넥 동기부여'] },
    { name: '조던 피터슨', queries: ['조던 피터슨 자기계발', '조던 피터슨 습관', '조던 피터슨 인생 조언'] },
    { name: '데이비드 고긴스', queries: ['데이비드 고긴스 멘탈', '고긴스 극복', '고긴스 자기규율'] },
    { name: '토니 로빈스', queries: ['토니 로빈스 동기부여', '토니 로빈스 성공', '토니 로빈스 습관'] },
    { name: '손정의', queries: ['손정의 비전', '손정의 경영', '손정의 성공'] },
    { name: '아놀드 슈워제네거', queries: ['아놀드 슈워제네거 규율', '슈워제네거 성공', '슈워제네거 습관'] },
    { name: '제임스 클리어', queries: ['제임스 클리어 습관', '아토믹 해빗', '습관의 힘'] },
    { name: '네이벌 라비칸트', queries: ['네이벌 라비칸트', '네이벌 라비칸트 부자', '네이벌 라비칸트 지혜'] },
    { name: '잭 마', queries: ['잭 마 성공', '마윈 경영', '잭 마 창업'] },
    { name: '손흥민', queries: ['손흥민 루틴', '손흥민 습관', '손흥민 자기관리'] },
    { name: '정주영', queries: ['정주영 성공', '정주영 경영 철학', '정주영 리더십'] },
    { name: '이건희', queries: ['이건희 경영', '이건희 삼성', '이건희 리더십'] },
];

// 한글 포함 여부 체크
function hasKorean(text: string): boolean {
    return /[가-힣]/.test(text);
}

/**
 * 인물 목록에서 랜덤 5명 선택 (매번 다른 인물)
 */
function pickRandomPersons(count: number): typeof PERSON_KEYWORDS {
    const shuffled = [...PERSON_KEYWORDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

export async function searchYouTubeVideos(
    offset: number = 0,
    usedIds: string[] = []
): Promise<{ videos: YouTubeVideo[]; hasMore: boolean }> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    // ★ 매번 랜덤 5명 선택 → 최소 5개 영상 보장
    const persons = pickRandomPersons(5);
    const allVideos: YouTubeVideo[] = [];
    const seenIds = new Set(usedIds);

    for (const person of persons) {
        try {
            // 인물별 쿼리 중 1개 랜덤 선택
            const query = person.queries[Math.floor(Math.random() * person.queries.length)];

            const searchParams = new URLSearchParams({
                part: 'snippet',
                q: query,
                type: 'video',
                order: 'relevance',
                regionCode: 'KR',
                relevanceLanguage: 'ko',
                maxResults: '8',
                key: apiKey,
            });

            const searchRes = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`);
            if (!searchRes.ok) {
                console.error(`[YouTube] 검색 실패 (${query}):`, searchRes.status);
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

            // 이 인물에서 가장 좋은 한국어 영상 1개만 선택
            let bestVideo: YouTubeVideo | null = null;
            let bestViews = 0;

            for (const item of statsData.items || []) {
                if (seenIds.has(item.id)) continue;

                const title = item.snippet?.title || '';
                // ★ 한국어 제목 영상만 (영어 영상 제외)
                if (!hasKorean(title)) continue;

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
