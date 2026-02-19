// =============================================
// v2 타입 정의 — 유명인 습관 분석기
// =============================================

export interface YouTubeVideo {
    videoId: string;
    title: string;
    channelTitle: string;
    description: string;
    viewCount: string;       // "1,234,567"
    publishedAt: string;     // ISO date
    thumbnailUrl: string;
    youtubeUrl: string;      // https://youtube.com/watch?v=...
}

export interface HabitAnalysis {
    personName: string;      // 예: 일론 머스크
    personTitle: string;     // 예: 테슬라·스페이스X CEO
    coreMessage: string;     // 핵심 한 줄 요약
    description: string;     // 상세 설명 (3~5줄)
    actionGuide: string[];   // 내 것으로 만드는 3단계
    example: string;         // 구체적 적용 예시
}

export interface VibeCodingIdea {
    appName: string;          // 앱 이름
    description: string;      // 앱 설명
    features: string[];       // 핵심 기능 3개
    techStack: string[];      // 예: ["HTML/CSS", "JavaScript"]
    difficultyLevel: 1 | 2 | 3 | 4 | 5;  // 바이브 코딩 구현 난이도
    prompt: string;           // AI에 복사-붙여넣기용 프롬프트
}

export interface AnalysisResult {
    id: string;
    video: YouTubeVideo;
    analysis: HabitAnalysis;
    vibeCoding: VibeCodingIdea;
    createdAt: string;       // ISO date
}
