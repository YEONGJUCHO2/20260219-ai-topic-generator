// =============================================
// 기획안 생성 API — POST /api/generate
// 단일 매칭 + 커스텀 프롬프트
// =============================================
import { NextRequest, NextResponse } from 'next/server';
import { generateVideoIdeas } from '@/lib/llm';
import { MatchResult } from '@/lib/types';
import { sendEmailReport } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const match: MatchResult = body.match;
        const customPrompt: string = body.customPrompt || '';
        const sendEmail: boolean = body.sendEmail || false;

        if (!match) {
            return NextResponse.json(
                { success: false, error: '매칭 데이터가 없습니다.' },
                { status: 400 }
            );
        }

        // 1. 기획안 생성 (단일)
        // generateVideoIdeas가 이제 배열을 반환하지만, 1개 항목만 요청했으므로 1개만 들어있는 배열이 옴
        const ideas = await generateVideoIdeas(match, customPrompt);

        // 2. 이메일 발송 (선택)
        let emailSent = false;
        if (sendEmail && ideas.length > 0) {
            try {
                await sendEmailReport([ideas[0]]); // 배열 형태로 전달
                emailSent = true;
            } catch (e) {
                console.error('이메일 발송 실패:', e);
            }
        }

        return NextResponse.json({
            success: true,
            count: ideas.length,
            ideas: ideas, // 배열 반환
            emailSent,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Generate API] 에러:', error);
        return NextResponse.json(
            { success: false, error: '기획안 생성 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
