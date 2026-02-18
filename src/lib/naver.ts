// =============================================
// 네이버 DataLab 검색어 트렌드 API 클라이언트
// =============================================
import { TrendItem, NewsArticle } from './types';

const NAVER_API_URL = 'https://openapi.naver.com/v1/datalab/search';
const NAVER_NEWS_API_URL = 'https://openapi.naver.com/v1/search/news.json';

// 카테고리별 모니터링 키워드 그룹 (자기계발 70%, 경제/시사 30% 비율 목표)
// 자기계발: 5개 그룹, 경제/시사: 2개 그룹 -> 5:2 ≈ 71%:29%
const KEYWORD_GROUPS = [
    // --- 자기계발 (70%) ---
    {
        groupName: '취업/커리어',
        keywords: ['취업', '이직', '면접', '자소서', '연봉협상', '퇴사', '커리어패스'],
        category: '커리어/의사결정',
    },
    {
        groupName: '학습/시험',
        keywords: ['공무원시험', '수능', '토익', '자격증', '공부법', '노트필기', '독학'],
        category: '학습/시험',
    },
    {
        groupName: '창업/부업',
        keywords: ['창업', '부업', '스마트스토어', '전자책', '퍼스널브랜딩', '1인기업'],
        category: '비즈니스/창업',
    },
    {
        groupName: '자기관리/멘탈',
        keywords: ['다이어트', '운동루틴', '미라클모닝', '명상', '멘탈관리', '자존감'],
        category: '멘탈/자기관리',
    },
    {
        groupName: '생산성/도구',
        keywords: ['시간관리', '노션', 'AI활용', '업무효율', '재택근무', '플래너'],
        category: '생산성/효율',
    },

    // --- 경제/시사 (30%) ---
    {
        groupName: '경제/투자',
        keywords: ['재테크', '부동산', '아파트', '주식', '비트코인', '청약', '절세'],
        category: '경제/재테크',
    },
    {
        groupName: '시사/트렌드',
        keywords: ['정책', '지원금', 'AI트렌드', '고령화', '환경문제', '전기차', '최신뉴스'],
        category: '시사/이슈',
    },
];

export async function fetchNaverTrends(): Promise<TrendItem[]> {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn('[네이버 API] 키가 설정되지 않았습니다. 데모 데이터를 사용합니다.');
        return getDemoNaverTrends();
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const results: TrendItem[] = [];

    for (const group of KEYWORD_GROUPS) {
        try {
            const body = {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                timeUnit: 'date',
                keywordGroups: [
                    {
                        groupName: group.groupName,
                        keywords: group.keywords,
                    },
                ],
            };

            const response = await fetch(NAVER_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Naver-Client-Id': clientId,
                    'X-Naver-Client-Secret': clientSecret,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                console.error(`[네이버 API] ${group.groupName} 조회 실패:`, response.status);
                continue;
            }

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const ratios = data.results[0].data || [];
                const values = ratios.map((r: { ratio: number }) => r.ratio);
                const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
                const latest = values[values.length - 1] || 0;

                // 점수 계산 (최근 검색량이 평균 대비 얼마나 높은가)
                let score = 50;
                if (avg > 0) {
                    score = Math.round((latest / avg) * 100);
                }
                const adjustedScore = Math.min(Math.max(score, 60), 99); // 60~99점 사이로 보정

                results.push({
                    keyword: group.groupName,
                    source: 'naver',
                    category: group.category,
                    score: adjustedScore,
                    description: `최근 7일간 검색량 급상승 (${group.groupName})`,
                });
            }
        } catch (error) {
            console.error(`[네이버 API] ${group.groupName} 에러:`, error);
        }
    }

    return results.length > 0 ? results : getDemoNaverTrends();
}

// 뉴스 검색 API
export async function searchNaverNews(query: string): Promise<NewsArticle[]> {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) return [];

    try {
        const response = await fetch(`${NAVER_NEWS_API_URL}?query=${encodeURIComponent(query)}&display=3&sort=sim`, {
            method: 'GET',
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
            },
        });

        if (!response.ok) return [];

        const data = await response.json();
        return (data.items || []).map((item: any) => ({
            title: item.title.replace(/<[^>]+>/g, ''),
            originallink: item.originallink,
            link: item.link,
            description: item.description.replace(/<[^>]+>/g, ''),
            pubDate: item.pubDate,
        }));
    } catch (error) {
        console.error('[네이버 뉴스] 검색 실패:', error);
        return [];
    }
}

function getDemoNaverTrends(): TrendItem[] {
    return [
        // --- 자기계발 (70%) ---
        {
            keyword: '직장인 이직 준비',
            source: 'naver',
            category: '커리어/의사결정',
            score: 88,
            description: '[데모] 상반기 채용 시즌 대비 이직 관심 증가',
        },
        {
            keyword: '미라클모닝 챌린지',
            source: 'naver',
            category: '멘탈/자기관리',
            score: 92,
            description: '[데모] 새해 맞이 아침 루틴 형성 붐',
        },
        {
            keyword: '노션 포트폴리오',
            source: 'naver',
            category: '생산성/효율',
            score: 85,
            description: '[데모] 노션을 활용한 개성 있는 포트폴리오 제작',
        },
        {
            keyword: 'AI 활용 부업',
            source: 'naver',
            category: '비즈니스/창업',
            score: 95,
            description: '[데모] 챗GPT 등을 활용한 자동화 수익 모델 관심',
        },
        {
            keyword: '2026 공무원 시험',
            source: 'naver',
            category: '학습/시험',
            score: 82,
            description: '[데모] 시험 일정 발표로 인한 수험생 검색 유입',
        },
        {
            keyword: '영어 회화 독학',
            source: 'naver',
            category: '학습/시험',
            score: 78,
            description: '[데모] 자기개발 목적의 실용 영어 학습 수요',
        },
        {
            keyword: '글쓰기 루틴',
            source: 'naver',
            category: '습관 형성',
            score: 75,
            description: '[데모] 퍼스널 브랜딩을 위한 매일 글쓰기',
        },

        // --- 경제/시사 (30%) ---
        {
            keyword: '비트코인 신고가',
            source: 'naver',
            category: '경제/재테크',
            score: 98,
            description: '[데모] 암호화폐 시장 급등으로 인한 투자 열기',
        },
        {
            keyword: '부동산 청약 완화',
            source: 'naver',
            category: '경제/재테크',
            score: 91,
            description: '[데모] 정부의 규제 완화 발표 직후 검색 폭증',
        },
        {
            keyword: '저출산 대책 발표',
            source: 'naver',
            category: '시사/이슈',
            score: 84,
            description: '[데모] 사회적 이슈에 대한 관심 집중',
        },
    ];
}
