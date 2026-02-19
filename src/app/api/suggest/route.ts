import { NextRequest, NextResponse } from 'next/server';
import { generateHabits } from '@/lib/habit';

// ★ 중요: 매번 새로운 결과를 위해 캐싱 끄기
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const habits = await generateHabits();
        return NextResponse.json({ success: true, habits });
    } catch (error) {
        console.error('[API/suggest] 에러:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
