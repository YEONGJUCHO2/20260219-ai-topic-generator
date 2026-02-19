import { NextRequest, NextResponse } from 'next/server';
import { analyzeHabit } from '@/lib/llm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { habit } = body; // habit: HabitSuggestion

        if (!habit || !habit.title || !habit.person) {
            return NextResponse.json({ success: false, error: '습관 정보 필요' }, { status: 400 });
        }

        const { detail, vibeCoding } = await analyzeHabit(habit);

        const result = {
            id: uuidv4(),
            suggestion: habit,
            detail,
            vibeCoding,
            createdAt: new Date().toISOString()
        };

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error('[Analyze API] 에러:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
