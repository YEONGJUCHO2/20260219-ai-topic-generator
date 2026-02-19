import { NextRequest, NextResponse } from 'next/server';
import { analyzeHabit } from '@/lib/llm';
import { YouTubeVideo } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const video: YouTubeVideo = body.video;

        if (!video || !video.title) {
            return NextResponse.json(
                { success: false, error: '영상 정보가 필요합니다.' },
                { status: 400 }
            );
        }

        // Gemini 2.5 Pro로 분석
        const { analysis, vibeCoding } = await analyzeHabit(video);

        return NextResponse.json({
            success: true,
            analysis,
            vibeCoding,
        });
    } catch (error) {
        console.error('[API /analyze] 에러:', error);
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
