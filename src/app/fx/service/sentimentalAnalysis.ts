import axios from 'axios';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

interface ForexNewsItem
{
    title: string;
    description: string;
    link: string;
    source: string;
    snippet: string;
    publishedAt: string;
}

interface ForexSentimentResult
{
    technicalScore: number;      // Range from -1 (very bearish) to 1 (very bullish)
    newsScore: number;          // Range from -1 to 1
    volume: number;             // Number of analyzed items
    latestNews: {               // Recent relevant news
        source: string;
        impact: number;         // Impact score from -1 to 1
        title: string;
        link: string;
        category: 'economic' | 'political' | 'central_bank' | 'market' | 'other';
    }[];
    economicIndicators: {       // Recent and upcoming economic events
        event: string;
        date: string;
        impact: 'high' | 'medium' | 'low';
        actual?: string;
        forecast?: string;
        previous?: string;
    }[];
    keyFactors: string[];       // Key driving factors
}

export class ForexSentimentAnalysisService
{
    private GenerativeAI: ChatGoogleGenerativeAI;


    constructor ()
    {

        this.GenerativeAI = new ChatGoogleGenerativeAI({
            apiKey: "",
            model: "gemini-2.0-flash-exp",
            temperature: 0
        });
    }

    private async fetchForexNews(currencyPair: string): Promise<ForexNewsItem[]>
    {
        // Split currency pair and create search terms
        const [ baseCurrency, quoteCurrency ] = currencyPair.split('/');
        const searchQuery = `${baseCurrency} ${quoteCurrency} forex currency exchange rate central bank`;

        const response = await axios.get(
            `https://www.googleapis.com/customsearch/v1`,
            {
                params: {
                    // @ts-ignore
                    key: this.searchApiKey,
                    // @ts-ignore
                    cx: this.searchEngineId,
                    q: searchQuery,
                    dateRestrict: 'd2', // Last 2 days (forex moves fast)
                    num: 10,
                    sort: 'date'
                }
            }
        );

        if (!response.data.items) {
            return [];
        }

        return response.data.items.map((item: any) => ({
            title: item.title,
            description: item.snippet,
            link: item.link,
            source: item.displayLink || new URL(item.link).hostname,
            snippet: item.snippet,
            publishedAt: item.pagemap?.metatags?.[ 0 ]?.[ 'article:published_time' ] || new Date().toISOString()
        }));
    }

    private async analyzeForexImpact(text: string, currencyPair: string): Promise<{
        score: number;
        category: 'economic' | 'political' | 'central_bank' | 'market' | 'other';
    }>
    {
        const [ baseCurrency, quoteCurrency ] = currencyPair.split('/');
        const prompt = `Analyze this forex news for ${baseCurrency}/${quoteCurrency}. Return a JSON object with:
        1. score: number between -1 (very negative for ${baseCurrency}) and 1 (very positive for ${baseCurrency})
        2. category: one of ['economic', 'political', 'central_bank', 'market', 'other']

        News text: "${text}"`;

        const response = await this.GenerativeAI.invoke(prompt);
        try {
            // @ts-ignore
            const result = JSON.parse(response.content);
            return {
                score: Math.max(-1, Math.min(1, result.score)),
                category: result.category
            };
        } catch (e) {
            return { score: 0, category: 'other' };
        }
    }

    private async fetchEconomicIndicators(currencyPair: string)
    {
        // This would typically connect to a forex calendar API
        // For now, returning placeholder data
        return [
            {
                event: "Interest Rate Decision",
                date: new Date().toISOString(),
                impact: "high" as const,
                actual: "5.25%",
                forecast: "5.25%",
                previous: "5.00%"
            }
        ];
    }

    private identifyKeyFactors(news: ForexNewsItem[], indicators: any[]): string[]
    {
        // Extract key driving factors from news and economic indicators
        const factors = new Set<string>();

        // Add economic indicators as factors
        indicators.forEach(indicator =>
        {
            if (indicator.impact === 'high') {
                factors.add(`${indicator.event}: ${indicator.actual || 'Pending'}`);
            }
        });

        // Extract key phrases from news
        const keyPhrases = news
            .map(item => item.title)
            .join(' ')
            .toLowerCase()
            .match(/(?:rate|inflation|gdp|growth|policy|bank|economy|trade|deficit)\s+\w+/g) || [];

        keyPhrases.forEach(phrase => factors.add(phrase));

        return Array.from(factors).slice(0, 5);
    }

    public async analyzeForexSentiment(currencyPair: string): Promise<ForexSentimentResult>
    {
        const [ news, economicIndicators ] = await Promise.all([
            this.fetchForexNews(currencyPair),
            this.fetchEconomicIndicators(currencyPair)
        ]);

        if (news.length === 0) {
            return {
                technicalScore: 0,
                newsScore: 0,
                volume: 0,
                latestNews: [],
                economicIndicators: economicIndicators,
                keyFactors: []
            };
        }

        const newsAnalysisPromises = news.map(async (item) =>
        {
            const analysis = await this.analyzeForexImpact(
                `${item.title} ${item.snippet}`,
                currencyPair
            );

            return {
                source: item.source,
                impact: analysis.score,
                title: item.title,
                link: item.link,
                category: analysis.category
            };
        });

        const analyzedNews = await Promise.all(newsAnalysisPromises);
        const averageScore = analyzedNews.reduce((sum, item) => sum + item.impact, 0) / analyzedNews.length;

        return {
            technicalScore: 0, // This would come from technical analysis
            newsScore: averageScore,
            volume: analyzedNews.length,
            latestNews: analyzedNews,
            economicIndicators: economicIndicators,
            keyFactors: this.identifyKeyFactors(news, economicIndicators)
        };
    }
}
