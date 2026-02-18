// =============================================
// 논문 검색 API — POST /api/papers
// =============================================
import { NextRequest, NextResponse } from 'next/server';
import { searchPapers } from '@/lib/semantic-scholar';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query, limit = 5 } = body;

        if (!query) {
            return NextResponse.json(
                { success: false, error: '검색 쿼리가 필요합니다.' },
                { status: 400 }
            );
        }

        const papers = await searchPapers(query, limit);

        return NextResponse.json({
            success: true,
            count: papers.length,
            papers,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[논문 API] 에러:', error);
        return NextResponse.json(
            { success: false, error: '논문 검색 중 에러가 발생했습니다.' },
            { status: 500 }
        );
    }
}
