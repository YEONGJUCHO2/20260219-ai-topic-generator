import { NextRequest, NextResponse } from 'next/server';
import { searchYouTubeVideos } from '@/lib/youtube';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const usedIdsParam = searchParams.get('usedIds') || '';
        const usedIds = usedIdsParam ? usedIdsParam.split(',') : [];

        // YouTube API로 한국 영상 검색 (이미 유명인 이름 매칭 + 정렬됨)
        const { videos, hasMore } = await searchYouTubeVideos(offset, usedIds);

        if (videos.length === 0) {
            return NextResponse.json({
                success: true,
                videos: [],
                hasMore: false,
                count: 0,
                message: '검색 결과가 없습니다. 다시 시도해보세요.',
            });
        }

        // 상위 5개 반환
        const top5 = videos.slice(0, 5);

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
