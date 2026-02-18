// =============================================
// 트렌드 수집 API — GET /api/trends
// =============================================
import { NextResponse } from 'next/server';
import { fetchNaverTrends } from '@/lib/naver';
import { fetchGoogleTrends } from '@/lib/google-trends';
import { TrendItem } from '@/lib/types';

export async function GET() {
    try {
        // 네이버 + Google Trends 데이터 병렬 수집
        const [naverTrends, googleTrends] = await Promise.all([
            fetchNaverTrends(),
            fetchGoogleTrends(),
        ]);

        // 병합 및 중복 제거
        const allTrends: TrendItem[] = [...naverTrends, ...googleTrends];

        // 점수 기준 내림차순 정렬
        allTrends.sort((a, b) => b.score - a.score);

        return NextResponse.json({
            success: true,
            count: allTrends.length,
            trends: allTrends,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[트렌드 API] 에러:', error);
        return NextResponse.json(
            { success: false, error: '트렌드 수집 중 에러가 발생했습니다.' },
            { status: 500 }
        );
    }
}
