// =============================================
// Semantic Scholar 학술 논문 검색
// =============================================
import { AcademicPaper } from './types';

const BASE_URL = 'https://api.semanticscholar.org/graph/v1';

export async function searchPapers(
    query: string,
    limit: number = 5
): Promise<AcademicPaper[]> {
    try {
        const params = new URLSearchParams({
            query,
            limit: String(limit),
            fields: 'title,authors,year,citationCount,url,abstract,venue',
        });

        const response = await fetch(`${BASE_URL}/paper/search?${params}`, {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('[Semantic Scholar] API 에러:', response.status);
            return [];
        }

        const data = await response.json();

        if (!data.data || data.data.length === 0) {
            return [];
        }

        return data.data
            .map((paper: {
                title: string;
                authors: { name: string }[];
                year: number;
                citationCount: number;
                url: string;
                abstract: string;
                venue: string;
            }) => ({
                title: paper.title || '',
                authors: (paper.authors || []).map((a: { name: string }) => a.name),
                year: paper.year || 0,
                citationCount: paper.citationCount || 0,
                url: paper.url || `https://www.semanticscholar.org/`,
                abstract: paper.abstract || '',
                venue: paper.venue || '',
            }))
            .filter((p: AcademicPaper) => p.title && p.year > 0)
            .sort((a: AcademicPaper, b: AcademicPaper) => b.citationCount - a.citationCount);
    } catch (error) {
        console.error('[Semantic Scholar] 검색 에러:', error);
        return [];
    }
}

export async function searchPapersForMatch(
    trendKeyword: string,
    expertName: string,
    methodology: string
): Promise<AcademicPaper[]> {
    // 여러 검색 쿼리를 조합하여 가장 관련성 높은 논문 찾기
    const queries = [
        `${methodology} ${trendKeyword}`,
        `${expertName} ${methodology}`,
        trendKeyword,
    ];

    const allPapers: AcademicPaper[] = [];
    const seenTitles = new Set<string>();

    for (const query of queries) {
        const papers = await searchPapers(query, 3);
        for (const paper of papers) {
            if (!seenTitles.has(paper.title)) {
                seenTitles.add(paper.title);
                allPapers.push(paper);
            }
        }
        // API 레이트 리밋 방지를 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 인용 수 기준 정렬 후 상위 5개 반환
    return allPapers
        .sort((a, b) => b.citationCount - a.citationCount)
        .slice(0, 5);
}
