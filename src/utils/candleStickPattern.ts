import { atr, bb, ichimokuCloud, macd, obv, rsi, sma } from "indicatorts";


export function candleStickPatternsIdentifier(data: Candlestick[])
{
    const patterns = [];
    for (let i = 1; i < data.length; i++) {
        const current = data[ i ];
        const prev = data[ i - 1 ];
        const next = data[ i + 1 ];

        const bodySize = Math.abs(current.close - current.open);
        const totalSize = current.high - current.low;
        const upperShadow = Math.max(current.high - current.open, current.high - current.close);
        const lowerShadow = Math.max(current.open - current.low, current.close - current.low);

        // Helper function to check if a candle is bullish or bearish
        const isBullish = (candle: Candlestick) => candle.close > candle.open;
        const isBearish = (candle: Candlestick) => candle.close < candle.open;

        // Doji
        if (Math.abs(current.open - current.close) / (current.high - current.low) < 0.1) {
            patterns.push({ date: current.date, pattern: "Doji" });
        }

        // Marubozu
        if (bodySize / totalSize > 0.9) {
            if (isBullish(current)) {
                patterns.push({ date: current.date, pattern: "Bullish Marubozu" });
            } else if (isBearish(current)) {
                patterns.push({ date: current.date, pattern: "Bearish Marubozu" });
            }
        }

        // Hammer and Hanging Man
        if (lowerShadow > 2 * bodySize && upperShadow < bodySize) {
            if (i > 1 && isBearish(data[ i - 2 ])) {
                patterns.push({ date: current.date, pattern: "Hammer" });
            } else if (i > 1 && isBullish(data[ i - 2 ])) {
                patterns.push({ date: current.date, pattern: "Hanging Man" });
            }
        }

        // Inverted Hammer and Shooting Star
        if (upperShadow > 2 * bodySize && lowerShadow < bodySize) {
            if (i > 1 && isBearish(data[ i - 2 ])) {
                patterns.push({ date: current.date, pattern: "Inverted Hammer" });
            } else if (i > 1 && isBullish(data[ i - 2 ])) {
                patterns.push({ date: current.date, pattern: "Shooting Star" });
            }
        }

        // Engulfing Patterns
        if (i > 0) {
            if (isBullish(current) && isBearish(prev) &&
                current.close > prev.open && current.open < prev.close) {
                patterns.push({ date: current.date, pattern: "Bullish Engulfing" });
            } else if (isBearish(current) && isBullish(prev) &&
                current.close < prev.open && current.open > prev.close) {
                patterns.push({ date: current.date, pattern: "Bearish Engulfing" });
            }
        }

        // Harami Patterns
        if (i > 0) {
            if (isBullish(current) && isBearish(prev) &&
                current.high < prev.open && current.low > prev.close) {
                patterns.push({ date: current.date, pattern: "Bullish Harami" });
            } else if (isBearish(current) && isBullish(prev) &&
                current.high < prev.close && current.low > prev.open) {
                patterns.push({ date: current.date, pattern: "Bearish Harami" });
            }
        }

        // Morning Star and Evening Star
        if (i > 1 && next) {
            const firstCandle = data[ i - 1 ];
            const secondCandle = current;
            const thirdCandle = next;

            if (isBearish(firstCandle) &&
                Math.abs(secondCandle.open - secondCandle.close) < 0.3 * (firstCandle.open - firstCandle.close) &&
                isBullish(thirdCandle) &&
                thirdCandle.close > (firstCandle.open + firstCandle.close) / 2) {
                patterns.push({ date: current.date, pattern: "Morning Star" });
            } else if (isBullish(firstCandle) &&
                Math.abs(secondCandle.open - secondCandle.close) < 0.3 * (firstCandle.close - firstCandle.open) &&
                isBearish(thirdCandle) &&
                thirdCandle.close < (firstCandle.open + firstCandle.close) / 2) {
                patterns.push({ date: current.date, pattern: "Evening Star" });
            }
        }

        // Three White Soldiers and Three Black Crows
        if (i > 1 && next) {
            if (isBullish(data[ i - 1 ]) && isBullish(current) && isBullish(next) &&
                current.open > data[ i - 1 ].open && current.close > data[ i - 1 ].close &&
                next.open > current.open && next.close > current.close) {
                patterns.push({ date: current.date, pattern: "Three White Soldiers" });
            } else if (isBearish(data[ i - 1 ]) && isBearish(current) && isBearish(next) &&
                current.open < data[ i - 1 ].open && current.close < data[ i - 1 ].close &&
                next.open < current.open && next.close < current.close) {
                patterns.push({ date: current.date, pattern: "Three Black Crows" });
            }
        }

        // Piercing Line and Dark Cloud Cover
        if (i > 0) {
            if (isBearish(prev) && isBullish(current) &&
                current.open < prev.low && current.close > (prev.open + prev.close) / 2) {
                patterns.push({ date: current.date, pattern: "Piercing Line" });
            } else if (isBullish(prev) && isBearish(current) &&
                current.open > prev.high && current.close < (prev.open + prev.close) / 2) {
                patterns.push({ date: current.date, pattern: "Dark Cloud Cover" });
            }
        }
    }
    return patterns;
}


export function calculateIndicators(data: Candlestick[])
{
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    const macdResult = macd(closes, { fast: 12, slow: 26, signal: 9 });
    const bbResult = bb(closes, { period: 20 });
    const atrResult = atr(highs, lows, closes, { period: 14 });

    const indicators = {
        sma50: sma(closes, { period: 50 }),
        sma200: sma(closes, { period: 200 }),
        rsi: rsi(closes, { period: 14 }),
        macd: {
            macdLine: macdResult.macdLine,
            signalLine: macdResult.signalLine,
        },
        bb: {
            upper: bbResult.upper,
            middle: bbResult.middle,
            lower: bbResult.lower
        },
        obv: obv(closes, volumes),
        recentCloses: closes.slice(-10),
        recentHighs: highs.slice(-10),
        recentLows: lows.slice(-10),
        ichimoku: ichimokuCloud(highs, lows, closes),
        takeProfit: 0, // This will be set later
        stopLoss: 0, // This will be set later
        predictedDirection: 'bullish',

    };

    return indicators;
}


export function calculateFibonacciLevels(candleStick: Candlestick)
{
    const diff = candleStick.high - candleStick.low;
    return {
        level0: candleStick.high,
        level23_6: candleStick.high - 0.236 * diff,
        level38_2: candleStick.high - 0.382 * diff,
        level50: candleStick.high - 0.5 * diff,
        level61_8: candleStick.high - 0.618 * diff,
        level100: candleStick.low
    };
}

export function calculatePivotPoints(candleStick: Candlestick)
{
    const pivot = (candleStick.high + candleStick.low + candleStick.close) / 3;
    return {
        r2: pivot + (candleStick.high - candleStick.low),
        r1: 2 * pivot - candleStick.low,
        pivot: pivot,
        s1: 2 * pivot - candleStick.high,
        s2: pivot - (candleStick.high - candleStick.low)
    };
}


export function technicallyAnalyze(quotes: any[])
{
    const candles = quotes.map(quote => ({
        date: new Date(quote.timestamp),
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.close,
        volume: quote.volume,
    }));

    const indicators = calculateIndicators(candles);
    const patterns = candleStickPatternsIdentifier(candles);
    const fibonacciLevels = calculateFibonacciLevels(candles[ candles.length - 1 ]);
    const pivotPoints = calculatePivotPoints(candles[ candles.length - 1 ]);

    return {
        indicators,
        patterns,
        fibonacciLevels,
        pivotPoints
    };
}

export function summarizePatterns(patterns: any[])
{
    // Count pattern frequencies
    const patternCount = patterns.reduce((acc, { pattern }) =>
    {
        acc[ pattern ] = (acc[ pattern ] || 0) + 1;
        return acc;
    }, {});

    // Get dominant trend
    const bullishPatterns = [ 'Bullish Engulfing', 'Morning Star', 'Three White Soldiers', 'Bullish Harami', 'Hammer' ];
    const bearishPatterns = [ 'Bearish Engulfing', 'Evening Star', 'Three Black Crows', 'Bearish Harami' ];

    let bullishCount = 0;
    let bearishCount = 0;

    Object.entries(patternCount).forEach(([ pattern, count ]) =>
    {
        if (bullishPatterns.includes(pattern)) bullishCount += count as number;
        if (bearishPatterns.includes(pattern)) bearishCount += count as number;
    });

    return {
        dominantTrend: bullishCount > bearishCount ? 'bullish' : 'bearish',
        strengthRatio: Math.max(bullishCount, bearishCount) / (bullishCount + bearishCount),
        mostFrequentPatterns: Object.entries(patternCount)
            .sort(([ , a ], [ , b ]) => (b as number) - (a as number))
            .slice(0, 3)
    };
}

export function summarizeIndicators(indicators: any)
{
    return {
        trendIndicators: {
            sma50_200_crossover: indicators.sma50[ indicators.sma50.length - 1 ] > indicators.sma200[ indicators.sma200.length - 1 ],
            rsi: indicators.rsi[ indicators.rsi.length - 1 ],
            macdSignal: indicators.macd.macdLine[ indicators.macd.macdLine.length - 1 ] > indicators.macd.signalLine[ indicators.macd.signalLine.length - 1 ]
        },
        volumeProfile: indicators.obv[ indicators.obv.length - 1 ] - indicators.obv[ indicators.obv.length - 10 ],
        recentPriceAction: {
            lastClose: indicators.recentCloses[ indicators.recentCloses.length - 1 ],
            priceChange: ((indicators.recentCloses[ indicators.recentCloses.length - 1 ] / indicators.recentCloses[ 0 ]) - 1) * 100
        }
    };
}
