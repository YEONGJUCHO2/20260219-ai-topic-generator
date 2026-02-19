import { NextRequest, NextResponse } from 'next/server';
import { searchYouTubeVideos } from '@/lib/youtube';
import { filterFamousOnly } from '@/lib/llm';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const usedIdsParam = searchParams.get('usedIds') || '';
        const usedIds = usedIdsParam ? usedIdsParam.split(',') : [];

        // 1. YouTube API로 영상 검색
        const { videos: rawVideos, hasMore } = await searchYouTubeVideos(offset, usedIds);

        if (rawVideos.length === 0) {
            return NextResponse.json({
                success: true,
                videos: [],
                hasMore: false,
                message: '검색 결과가 없습니다. 다른 키워드로 시도해보세요.',
            });
        }

        // 2. AI 필터링: 유명인 영상만 추출
        const famousVideos = await filterFamousOnly(rawVideos);

        // 3. 상위 5개만 반환
        const top5 = famousVideos.slice(0, 5);

        return NextResponse.json({
            success: true,
            videos: top5,
            hasMore,
            count: top5.length,
        });
    } catch (error) {
        console.error('[API /youtube] 에러:', error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
