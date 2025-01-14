import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { basicConfig } from "../../../config/configs";
import yahooFinance from 'yahoo-finance2';
import moment from "moment";
import { calculateIndicators, candleStickPatternsIdentifier, summarizeIndicators, summarizePatterns, technicallyAnalyze } from "../../../utils/candleStickPattern";
import { Quote } from "yahoo-finance2/dist/esm/src/modules/quote";
import { ForexNews } from "./scraper";


export class PredictService
{
    private GenerativeAI: ChatGoogleGenerativeAI;
    constructor ()
    {
        this.GenerativeAI = new ChatGoogleGenerativeAI({
            apiKey: basicConfig.generativeIA.apiKey,
            model: "gemini-2.0-flash-exp",
            temperature: 1
        });
    }

    private async getHistoricalData(symbol: string, timeFrame: string)
    {

        let interval: "1d" | "1wk" | "1mo" | "1m" | "2m" | "5m" | "15m" | "30m" | "60m" | "90m" | "1h" | "5d" | "3mo" | undefined;
        switch (timeFrame) {
            case '1d':
                interval = '1d';
                break;
            case '1wk':
                interval = '1wk';
                break;
            case '1mo':
                interval = '1mo';
                break;
            default:
                interval = undefined;
        }

        const queryOptions = {
            period1: moment().subtract(5, 'year').format('YYYY-MM-DD'),
            period2: moment().format('YYYY-MM-DD'),
            interval,
            includePrePost: false,
        };
        const result = await yahooFinance.chart(symbol, queryOptions);

        if (!result.quotes.length) {
            throw new Error("No data found");
        }


        return result;
    };



    private async getMultiTimeFrameData(symbol: string)
    {
        const timeFrames = [ '1d', '1wk', '1mo' ];
        const data = await Promise.all(timeFrames.map(async (timeFrame) => ({
            timeFrame,
            data: await this.getHistoricalData(symbol, timeFrame)
        })));


        return {
            daily: data.find((d) => d.timeFrame === '1d')?.data.quotes,
            weekly: data.find((d) => d.timeFrame === '1wk')?.data.quotes,
            monthly: data.find((d) => d.timeFrame === '1mo')?.data.quotes
        };

    }

    private async analyze(multipleTimeFrameData: any)
    {

        const dailyData = multipleTimeFrameData.daily;
        const weeklyData = multipleTimeFrameData.weekly;
        const monthlyData = multipleTimeFrameData.monthly;

        const dailyPatterns = {
            ...technicallyAnalyze(dailyData)

        };
        const weeklyPatterns = {
            ...technicallyAnalyze(weeklyData)
        };
        const monthlyPatterns = {
            ...technicallyAnalyze(monthlyData)
        };

        return {
            dailyPatterns,
            weeklyPatterns,
            monthlyPatterns
        };
    }

    private async getFundamentals(currencyPair: string)
    {
        const news = new ForexNews();

        return await news.getFundamentals(currencyPair);
    }
    public async predictStock(symbol: string,)
    {
        const multipleTimeFrameData = await this.getMultiTimeFrameData(symbol);
        // const prediction = await this.predict(multipleTimeFrameData);
        const rawAnalysis = await this.analyze(multipleTimeFrameData);



        const summary = {
            daily: {
                patterns: summarizePatterns(rawAnalysis.dailyPatterns.patterns),
                indicators: summarizeIndicators(rawAnalysis.dailyPatterns.indicators),
                keyLevels: {
                    fibonacci: Object.values(rawAnalysis.dailyPatterns.fibonacciLevels).slice(0, 3),
                    pivots: Object.values(rawAnalysis.dailyPatterns.pivotPoints).slice(0, 3)
                },
                news: await this.getFundamentals(symbol)

            },
            weekly: {
                patterns: summarizePatterns(rawAnalysis.weeklyPatterns.patterns),
                indicators: summarizeIndicators(rawAnalysis.weeklyPatterns.indicators)
            },
            monthly: {
                patterns: summarizePatterns(rawAnalysis.monthlyPatterns.patterns),
                indicators: summarizeIndicators(rawAnalysis.monthlyPatterns.indicators)
            }
        };



        return summary;
    }

}
