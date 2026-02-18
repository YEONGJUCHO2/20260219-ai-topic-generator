// =============================================
// Google Trends 데이터 수집
// =============================================
import { TrendItem } from './types';

export async function fetchGoogleTrends(): Promise<TrendItem[]> {
    try {
        // google-trends-api는 CommonJS 모듈이므로 동적 import
        const googleTrends = await import('google-trends-api');

        const results = await googleTrends.default.dailyTrends({
            geo: 'KR',
            trendDate: new Date(),
        });

        const parsed = JSON.parse(results);
        const trendingSearches =
            parsed?.default?.trendingSearchesDays?.[0]?.trendingSearches || [];

        const categoryMap: Record<string, string> = {
            Business: '비즈니스/창업',
            Education: '학습/시험',
            Health: '멘탈/자기관리',
            'Science/Tech': '생산성/효율',
            Entertainment: '기타',
            Sports: '기타',
        };

        return trendingSearches.slice(0, 10).map(
            (item: {
                title: { query: string };
                formattedTraffic: string;
                articles?: { title: string }[];
                relatedQueries?: { query: string }[];
            }, index: number) => {
                const traffic = item.formattedTraffic || '10K+';
                const trafficNum = parseInt(traffic.replace(/[^0-9]/g, '')) || 10;
                const score = Math.min(100, Math.round(100 - index * 8 + trafficNum / 10));

                // 간단한 카테고리 추정 (키워드 기반)
                let category = '기타';
                const keyword = item.title.query.toLowerCase();
                if (/시험|공부|학습|대학|수능|자격/.test(keyword)) category = '학습/시험';
                else if (/취업|이직|면접|연봉|커리어/.test(keyword)) category = '커리어/의사결정';
                else if (/창업|투자|주식|부동산|사업|돈/.test(keyword)) category = '비즈니스/창업';
                else if (/건강|운동|다이어트|멘탈|스트레스/.test(keyword)) category = '멘탈/자기관리';
                else if (/ai|생산성|효율|기술|앱/.test(keyword)) category = '생산성/효율';
                else if (/습관|루틴|목표/.test(keyword)) category = '습관 형성';

                void categoryMap; // suppress unused warning

                return {
                    keyword: item.title.query,
                    source: 'google' as const,
                    category,
                    score,
                    description: `Google Trends 일일 트렌드 — 검색량: ${traffic}`,
                };
            }
        );
    } catch (error) {
        console.error('[Google Trends] 에러:', error);
        return getDemoGoogleTrends();
    }
}

function getDemoGoogleTrends(): TrendItem[] {
    return [
        {
            keyword: 'ChatGPT 활용법',
            source: 'google',
            category: '생산성/효율',
            score: 92,
            description: '[데모] AI 도구 활용 관련 검색 급증',
        },
        {
            keyword: '습관 만들기 66일',
            source: 'google',
            category: '습관 형성',
            score: 85,
            description: '[데모] 습관 형성 관련 검색 증가',
        },
        {
            keyword: '재테크 초보 가이드',
            source: 'google',
            category: '비즈니스/창업',
            score: 80,
            description: '[데모] 재테크 관련 검색 증가',
        },
    ];
}
