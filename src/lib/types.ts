// =============================================
// AI 주제 추천 에이전트 - 타입 정의
// =============================================

export interface Titan {
    id: string;
    name: string;
    nameEn: string;
    methodology: string;
    methodologyEn: string;
    description: string;
    categories: string[];
    toolLevel: 1 | 2; // Level 1: 즉시 실행(종이/펜), Level 2: 시스템 구축(디지털/심화)
    keywords: string[];
    source: 'seed_db' | 'ai_discovered';
}

export interface TrendItem {
    keyword: string;
    source: 'naver' | 'google';
    category: string;
    score: number;
    description?: string;
}

export interface AcademicPaper {
    title: string;
    authors: string[];
    year: number;
    citationCount: number;
    url: string;
    abstract: string;
    venue: string;
}

export interface NewsArticle {
    title: string;
    originallink: string;
    link: string;
    description: string;
    pubDate: string;
}

export interface MatchResult {
    trend: TrendItem;
    titan: Titan;
    relevanceScore: number;
    reasoning: string;
    papers?: AcademicPaper[]; // 관련 논문 (선택)
    news?: NewsArticle[];     // 논문 없을 시 뉴스 (대체)
}

export interface ToolConcept {
    name: string;
    level: 1 | 2;
    description: string;
    features: string[];
}

export interface VideoIdea {
    trend: string;
    titanName: string;
    methodology: string;
    titles: string[];
    thumbnailText: string;
    hookingPhrase: string;
    paperCitation: string;
    // 신규 추가: 관련 유튜브 및 서적 정보
    relatedYoutube: {
        title: string;
        channel: string;
        url: string;
    } | null;
    relatedBook: {
        title: string;
        author: string;
    } | null;
    toolConcept: ToolConcept;
}

export interface AgentResult {
    generatedAt: string;
    trends: TrendItem[];
    matches: MatchResult[];
    ideas: VideoIdea[];
}
