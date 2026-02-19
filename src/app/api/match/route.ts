import { NextRequest, NextResponse } from "next/server";
import { matchTrendsWithTitans } from "@/lib/llm";
import { loadTitanDb } from "@/lib/titan-db";
import { searchPapersForMatch } from "@/lib/semantic-scholar";
import { searchNaverNews } from "@/lib/naver";

// 타임아웃 래퍼 유틸리티
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { trends } = body;

        if (!trends || !Array.isArray(trends) || trends.length === 0) {
            return NextResponse.json({ success: false, error: "No trends provided" }, { status: 400 });
        }

        // 1. 프론트엔드에서 이미 페이징(5개씩)된 트렌드가 넘어오므로 그대로 사용
        const targetTrends = trends;

        // 2. 타이탄 DB 로드
        const titanDb = loadTitanDb();

        // 3. LLM을 통한 매칭 (타임아웃 25초)
        let matches = [];
        try {
            matches = await withTimeout(
                matchTrendsWithTitans(targetTrends, titanDb),
                25000,
                []
            );
        } catch (llmError) {
            console.error("LLM matching timed out or failed:", llmError);
            return NextResponse.json({ success: false, error: "Expert matching timed out" }, { status: 504 });
        }

        if (matches.length === 0) {
            return NextResponse.json({ success: false, error: "No matches found" }, { status: 404 });
        }

        // 4. 근거 자료 검색 (논문/뉴스) - 병렬 처리 + 개별 타임아웃
        const matchesWithEvidence = await Promise.all(
            matches.map(async (match) => {
                try {
                    // 논문 검색 (타임아웃 4초)
                    const papersPromise = searchPapersForMatch(
                        match.trend.keyword,
                        match.titan.nameEn || match.titan.name,
                        match.titan.methodologyEn || match.titan.methodology
                    );

                    const papers = await withTimeout(papersPromise, 4000, []);

                    // 논문이 없으면 뉴스 검색 (타임아웃 3초)
                    let news: any[] = [];
                    if (!papers || papers.length === 0) {
                        const newsQuery = `${match.trend.keyword} ${match.titan.name}`;
                        news = await withTimeout(
                            searchNaverNews(newsQuery),
                            3000,
                            []
                        );
                    }

                    return {
                        ...match,
                        papers: papers || [],
                        news: news || []
                    };
                } catch (err) {
                    console.error(`Evidence search failed for ${match.trend.keyword}:`, err);
                    // 검색 실패하더라도 매칭 결과는 반환
                    return { ...match, papers: [], news: [] };
                }
            })
        );

        return NextResponse.json({
            success: true,
            matches: matchesWithEvidence,
            count: matchesWithEvidence.length
        });

    } catch (error) {
        console.error("Match API Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
