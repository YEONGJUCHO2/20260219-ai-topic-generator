// =============================================
// YouTube Data API v3 검색 모듈
// =============================================
import { YouTubeVideo } from './types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ★ 전부 한국어 키워드 — 한국 유튜버가 만든 유명인 분석 영상 위주
const KEYWORD_GROUPS = [
    // 그룹 1: 사고법·원칙
    [
        '일론 머스크 제1원칙', '일론 머스크 습관', '일론 머스크 성공',
        '스티브 잡스 사고방식', '스티브 잡스 습관',
        '제프 베조스 의사결정', '제프 베조스 성공 비결',
        '레이 달리오 원칙', '찰리 멍거 멘탈모델',
        '샘 올트만 생산성',
    ],
    // 그룹 2: 습관·루틴·자기관리
    [
        '젠슨 황 습관', '젠슨 황 성공 비결', '젠슨 황 루틴',
        '빌 게이츠 독서 습관', '빌 게이츠 루틴',
        '마크 저커버그 습관', '워렌 버핏 하루 루틴',
        '앤드류 휴버만 루틴', '앤드류 휴버만 수면',
        '팀 페리스 자기관리', '오프라 윈프리 아침 루틴',
    ],
    // 그룹 3: 리더십·성공 철학
    [
        '젠슨 황 리더십', '사이먼 시넥 리더십',
        '잭 마 성공 철학', '마윈 경영',
        '일론 머스크 경영 철학', '손정의 비전',
        '팀 쿡 리더십', '이재용 습관',
        '정주영 성공', '이건희 경영 철학',
    ],
    // 그룹 4: 멘탈·집중력·자기극복
    [
        '데이비드 고긴스 멘탈', '데이비드 고긴스 극복',
        '조던 피터슨 자기계발', '조던 피터슨 습관',
        '토니 로빈스 동기부여', '네이벌 라비칸트 부자',
        '제임스 클리어 습관의 힘', '아놀드 슈워제네거 규율',
        '손흥민 루틴', '김연아 멘탈',
    ],
];

// 유명인 이름 목록 (제목 매칭용)
const FAMOUS_NAMES = [
    '일론 머스크', 'elon musk', '머스크',
    '젠슨 황', 'jensen huang',
    '빌 게이츠', 'bill gates', '게이츠',
    '스티브 잡스', 'steve jobs', '잡스',
    '제프 베조스', 'jeff bezos', '베조스',
    '마크 저커버그', 'mark zuckerberg', '저커버그',
    '워렌 버핏', 'warren buffett', '버핏',
    '찰리 멍거', 'charlie munger', '멍거',
    '레이 달리오', 'ray dalio', '달리오',
    '샘 올트만', 'sam altman', '올트만',
    '팀 쿡', 'tim cook',
    '앤드류 휴버만', 'andrew huberman', '휴버만',
    '팀 페리스', 'tim ferriss', '페리스',
    '토니 로빈스', 'tony robbins', '로빈스',
    '사이먼 시넥', 'simon sinek', '시넥',
    '조던 피터슨', 'jordan peterson', '피터슨',
    '데이비드 고긴스', 'david goggins', '고긴스',
    '네이벌 라비칸트', 'naval ravikant',
    '제임스 클리어', 'james clear',
    '오프라 윈프리', 'oprah',
    '아놀드 슈워제네거', 'arnold',
    '잭 마', '마윈', 'jack ma',
    '손정의', '손흥민', '김연아',
    '이재용', '정주영', '이건희',
    '오바마', 'obama',
];

function pickDiverseKeywords(): string[] {
    return KEYWORD_GROUPS.map(group => {
        const idx = Math.floor(Math.random() * group.length);
        return group[idx];
    });
}

/**
 * 제목에 유명인 이름이 포함되어 있는지 체크
 */
function containsFamousName(title: string): boolean {
    const lower = title.toLowerCase();
    return FAMOUS_NAMES.some(name => lower.includes(name.toLowerCase()));
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

    // 180일 (반년) — 충분한 결과 확보
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 180);
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
                regionCode: 'KR',
                relevanceLanguage: 'ko',
                maxResults: '15',
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
                if (viewCount < 3000) continue;

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

    // 유명인 이름이 제목에 있는 영상 우선
    const famous = allVideos.filter(v => containsFamousName(v.title));
    const others = allVideos.filter(v => !containsFamousName(v.title));

    // 조회수 높은순 정렬
    famous.sort((a, b) => {
        const aCount = parseInt(a.viewCount.replace(/,/g, ''), 10);
        const bCount = parseInt(b.viewCount.replace(/,/g, ''), 10);
        return bCount - aCount;
    });
    others.sort((a, b) => {
        const aCount = parseInt(a.viewCount.replace(/,/g, ''), 10);
        const bCount = parseInt(b.viewCount.replace(/,/g, ''), 10);
        return bCount - aCount;
    });

    // 유명인 영상 우선 + 나머지로 보충 (최소 10개)
    const combined = [...famous, ...others].slice(0, 10);

    return { videos: combined, hasMore: true };
}
