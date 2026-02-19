// =============================================
// v3 타입 정의 — AI 습관 멘토링
// =============================================

export interface HabitSuggestion {
    id: string;              // 고유 ID (UUID 등)
    person: string;          // 인물 (예: 워렌 버핏)
    title: string;           // 습관 제목 (예: 5/25 법칙)
    description: string;     // 한 줄 설명
    category: string;        // 카테고리 (생산성, 투자, 멘탈 등)
    difficulty: 'Easy' | 'Medium' | 'Hard'; // 실천 난이도
}

export interface HabitDetail {
    personName: string;
    personTitle: string;
    coreMessage: string;
    description: string;     // 상세 설명
    actionGuide: string[];   // 실천 가이드 3단계
    example: string;         // 구체적 예시
    difficulty?: string;
}

export interface VibeCodingIdea {
    appName: string;
    description: string;
    features: string[];
    techStack: string[];
    difficultyLevel: 1 | 2 | 3 | 4 | 5;
    prompt: string;
}

export interface AnalysisResult {
    id: string;
    suggestion: HabitSuggestion;
    detail: HabitDetail;
    vibeCoding: VibeCodingIdea;
    createdAt: string;
}
