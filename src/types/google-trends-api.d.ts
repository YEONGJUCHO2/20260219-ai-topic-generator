declare module 'google-trends-api' {
    interface TrendOptions {
        geo?: string;
        trendDate?: Date;
        hl?: string;
        category?: number;
    }

    interface InterestOptions {
        keyword: string | string[];
        startTime?: Date;
        endTime?: Date;
        geo?: string;
        hl?: string;
        category?: number;
        property?: string;
    }

    const googleTrends: {
        dailyTrends: (options: TrendOptions) => Promise<string>;
        realTimeTrends: (options: TrendOptions) => Promise<string>;
        interestOverTime: (options: InterestOptions) => Promise<string>;
        interestByRegion: (options: InterestOptions) => Promise<string>;
        relatedTopics: (options: InterestOptions) => Promise<string>;
        relatedQueries: (options: InterestOptions) => Promise<string>;
    };

    export default googleTrends;
}
