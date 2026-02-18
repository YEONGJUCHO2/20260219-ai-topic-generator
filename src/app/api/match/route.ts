// =============================================
// LLM 매칭 API — POST /api/match
// 동적 전문가 탐색 포함
// =============================================
import { NextRequest, NextResponse } from 'next/server';
import { matchTrendsWithTitans } from '@/lib/llm';
import { searchPapersForMatch } from '@/lib/semantic-scholar';
import { loadTitanDb } from '@/lib/titan-db';
import { searchNaverNews } from '@/lib/naver';
import { TrendItem } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const trends: TrendItem[] = body.trends;

        if (!trends || trends.length === 0) {
            return NextResponse.json(
                { success: false, error: '트렌드 데이터가 필요합니다.' },
                { status: 400 }
            );
        }

        // 타이탄 DB 로드
        const titanDb = loadTitanDb();

        // Gemini를 통한 매칭 (시드 DB + AI 동적 탐색)
        const matches = await matchTrendsWithTitans(trends, titanDb);

        // 각 매칭에 대해 관련 논문 검색 (논문 없으면 뉴스 검색)
        const matchesWithPapers = await Promise.all(
            matches.map(async (match) => {
                const papers = await searchPapersForMatch(
                    match.trend.keyword,
                    match.titan.nameEn || match.titan.name,
                    match.titan.methodologyEn || match.titan.methodology
                );

                let news = undefined;
                // 논문이 하나도 없으면 뉴스 기사를 검색하여 보완
                if (!papers || papers.length === 0) {
                    try {
                        const query = `${match.trend.keyword} ${match.titan.name}`;
                        news = await searchNaverNews(query);
                    } catch (e) {
                        console.error('뉴스 검색 실패', e);
                    }
                }

                return { ...match, papers, news };
            })
        );

        return NextResponse.json({
            success: true,
            count: matchesWithPapers.length,
            matches: matchesWithPapers,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[매칭 API] 에러:', error);
        return NextResponse.json(
            { success: false, error: '매칭 중 에러가 발생했습니다.' },
            { status: 500 }
        );
    }
}
