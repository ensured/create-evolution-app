import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";
import { RSI, MACD, SMA, EMA, BollingerBands, ATR } from "technicalindicators";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY_ADA_TA_3 });

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

interface CacheEntry {
  data: {
    veryShortTerm: string;
    shortTerm: string;
    longTerm: string;
  };
  timestamp: number;
}

// In-memory cache with 60-second TTL
const analysisCache = new Map<string, CacheEntry>();
const CACHE_TTL = 300 * 1000; // 5 minutes
const REQUEST_TIMEOUT = 30 * 1000; // 30 seconds

// Generate cache key based on rounded price and key indicators
function generateCacheKey(
  price: number | string,
  veryShortTA: any,
  shortTA: any,
  longTA: any
): string {
  // Convert to number and round to 3 decimals to ignore tiny fluctuations
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  const roundedPrice = priceNum.toFixed(3);
  // Use key indicators that change less frequently
  const key = `${roundedPrice}_${veryShortTA?.rsi}_${shortTA?.macdTrend}_${longTA?.confluenceScore}`;
  return key;
}

// Clean up expired cache entries
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of analysisCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      analysisCache.delete(key);
    }
  }
}

// Get cached data if valid
function getCachedData(cacheKey: string): CacheEntry | null {
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(
      `[CACHE HIT] Returning cached analysis (${Math.floor(
        (Date.now() - cached.timestamp) / 1000
      )}s old)`
    );
    return cached;
  }
  return null;
}

// ============================================================================

const getCloses = (data: any[]) => {
  if (!Array.isArray(data)) return [];
  return data.map((candle: any) => candle[4]);
};

const getHighs = (data: any[]) => {
  if (!Array.isArray(data)) return [];
  return data.map((candle: any) => candle[2]);
};

const getLows = (data: any[]) => {
  if (!Array.isArray(data)) return [];
  return data.map((candle: any) => candle[3]);
};

const calculateTA = (data: any[], period: string) => {
  const closes = getCloses(data);
  const highs = getHighs(data);
  const lows = getLows(data);

  if (closes.length < 26) return null;

  const currentPrice = closes[closes.length - 1];
  const prevPrice = closes[closes.length - 2];

  const rsiValues = RSI.calculate({ period: 14, values: closes });
  const currentRSI = rsiValues[rsiValues.length - 1];
  const prevRSI = rsiValues[rsiValues.length - 2];

  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const currentMACD = macdValues[macdValues.length - 1];

  const sma20 = SMA.calculate({ period: 20, values: closes });
  const sma50 = SMA.calculate({ period: 50, values: closes });
  const ema9 = EMA.calculate({ period: 9, values: closes });
  const ema21 = EMA.calculate({ period: 21, values: closes });

  const currentSMA20 = sma20[sma20.length - 1];
  const currentSMA50 = sma50[sma50.length - 1];
  const currentEMA9 = ema9[ema9.length - 1];
  const currentEMA21 = ema21[ema21.length - 1];

  const bb = BollingerBands.calculate({
    period: 20,
    values: closes,
    stdDev: 2,
  });
  const currentBB = bb[bb.length - 1];

  const atrValues = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });
  const currentATR = atrValues[atrValues.length - 1];

  const support = Math.min(...lows.slice(-20));
  const resistance = Math.max(...highs.slice(-20));

  const priceVsSMA20 = ((currentPrice - currentSMA20) / currentSMA20) * 100;
  const priceVsSMA50 = ((currentPrice - currentSMA50) / currentSMA50) * 100;

  const macdSignal =
    currentMACD?.MACD && currentMACD?.signal
      ? currentMACD.MACD > currentMACD.signal
        ? "BULLISH"
        : "BEARISH"
      : "NEUTRAL";

  let rsiSignal = "NEUTRAL";
  if (currentRSI > 70) rsiSignal = "OVERBOUGHT";
  else if (currentRSI < 30) rsiSignal = "OVERSOLD";
  else if (currentRSI > 50) rsiSignal = "BULLISH";
  else if (currentRSI < 50) rsiSignal = "BEARISH";

  let bbPosition = "NEUTRAL";
  if (currentBB) {
    if (currentPrice > currentBB.upper) bbPosition = "ABOVE_UPPER";
    else if (currentPrice < currentBB.lower) bbPosition = "BELOW_LOWER";
    else if (currentPrice > currentBB.middle) bbPosition = "UPPER_HALF";
    else bbPosition = "LOWER_HALF";
  }

  let divergence = "NONE";
  if (prevPrice && prevRSI) {
    if (currentPrice < prevPrice && currentRSI > prevRSI && currentRSI < 40) {
      divergence = "BULLISH";
    } else if (
      currentPrice > prevPrice &&
      currentRSI < prevRSI &&
      currentRSI > 60
    ) {
      divergence = "BEARISH";
    }
  }

  let bullishSignals = 0;
  let bearishSignals = 0;

  if (currentRSI < 30) bullishSignals++;
  else if (currentRSI > 70) bearishSignals++;
  else if (currentRSI > 50) bullishSignals++;
  else if (currentRSI < 50) bearishSignals++;

  if (macdSignal === "BULLISH") bullishSignals++;
  else if (macdSignal === "BEARISH") bearishSignals++;

  if (currentPrice > currentSMA20) bullishSignals++;
  else bearishSignals++;

  if (currentPrice > currentSMA50) bullishSignals++;
  else bearishSignals++;

  if (bbPosition === "BELOW_LOWER") bullishSignals++;
  else if (bbPosition === "ABOVE_UPPER") bearishSignals++;

  const totalSignals = bullishSignals + bearishSignals;
  const confluenceScore =
    bullishSignals > bearishSignals
      ? `${bullishSignals}/${totalSignals} BULLISH`
      : bearishSignals > bullishSignals
      ? `${bearishSignals}/${totalSignals} BEARISH`
      : "NEUTRAL";

  const atrMultiplier =
    period === "very_short" ? 0.5 : period === "short" ? 1 : 1.5;
  const stopDistance = currentATR * atrMultiplier;

  let stopLoss, takeProfit1, takeProfit2;

  if (bullishSignals > bearishSignals) {
    stopLoss = currentPrice - stopDistance;
    takeProfit1 = currentPrice + stopDistance * 1.5;
    takeProfit2 = currentPrice + stopDistance * 2.5;
  } else {
    stopLoss = currentPrice + stopDistance;
    takeProfit1 = currentPrice - stopDistance * 1.5;
    takeProfit2 = currentPrice - stopDistance * 2.5;
  }

  return {
    rsi: currentRSI?.toFixed(2),
    rsiSignal,
    macd: currentMACD?.MACD?.toFixed(6),
    macdSignal: currentMACD?.signal?.toFixed(6),
    macdHistogram: currentMACD?.histogram?.toFixed(6),
    macdTrend: macdSignal,
    sma20: currentSMA20?.toFixed(4),
    sma50: currentSMA50?.toFixed(4),
    ema9: currentEMA9?.toFixed(4),
    ema21: currentEMA21?.toFixed(4),
    priceVsSMA20: priceVsSMA20?.toFixed(2),
    priceVsSMA50: priceVsSMA50?.toFixed(2),
    bbUpper: currentBB?.upper?.toFixed(4),
    bbMiddle: currentBB?.middle?.toFixed(4),
    bbLower: currentBB?.lower?.toFixed(4),
    bbPosition,
    atr: currentATR?.toFixed(4),
    support: support?.toFixed(4),
    resistance: resistance?.toFixed(4),
    divergence,
    confluenceScore,
    entryPrice: currentPrice?.toFixed(4),
    stopLoss: stopLoss?.toFixed(4),
    takeProfit1: takeProfit1?.toFixed(4),
    takeProfit2: takeProfit2?.toFixed(4),
    riskReward: "1:2.5",
  };
};

export async function POST(request: Request) {
  const body = await request.json();
  const {
    price,
    change24h,
    veryShortData,
    shortData,
    longData,
    volumeData,
    sentiment,
  } = body;

  const veryShortTA = calculateTA(veryShortData, "very_short");
  const shortTA = calculateTA(shortData, "short");
  const longTA = calculateTA(longData, "long");

  // Generate cache key
  const cacheKey = generateCacheKey(price, veryShortTA, shortTA, longTA);

  // Check cache first
  const cachedResult = getCachedData(cacheKey);
  if (cachedResult) {
    return NextResponse.json(cachedResult.data);
  }

  // Cleanup old cache entries
  cleanupCache();

  // Process Volume Data
  let volumeAnalysis = "No volume data supplied";
  if (volumeData && volumeData.length > 0) {
    const volumes = volumeData.map((v: any) => v[1]);
    const currentVolume = volumes[volumes.length - 1];
    const avgVolume =
      volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const volumeChange = ((currentVolume - avgVolume) / avgVolume) * 100;

    volumeAnalysis = `
Current Volume: $${(currentVolume / 1000000).toFixed(2)}M
Average Volume (20p): $${(avgVolume / 1000000).toFixed(2)}M
Volume vs Avg: ${volumeChange > 0 ? "+" : ""}${volumeChange.toFixed(2)}%
Trend: ${
      volumeChange > 20
        ? "HIGH BUYING PRESSURE"
        : volumeChange < -20
        ? "LOW INTEREST"
        : "NORMAL"
    }
    `.trim();
  }

  // Create abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT);

  try {
    console.log(`[CACHE MISS] Fetching fresh analysis from Groq...`);

    const [veryShortAnalysis, shortAnalysis, longAnalysis] = await Promise.all([
      groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a high-frequency trading analyst specializing in scalping strategies. Provide ultra-short-term technical analysis based on 6-hour price action. Be concise, direct, and focus on immediate setups.",
          },
          {
            role: "user",
            content: `Cardano SCALPING Analysis (6 Hours)
Current Price: $${price}
24h Change: ${change24h}%

MARKET SENTIMENT:
Fear & Greed Index: ${sentiment?.value} (${sentiment?.value_classification})

TECHNICAL DATA (6-Hour Window):
RSI (14): ${veryShortTA?.rsi}
MACD: ${veryShortTA?.macdHistogram}
MACD Trend: ${veryShortTA?.macdTrend}
Support: ${veryShortTA?.support}
Resistance: ${veryShortTA?.resistance}

VOLUME DATA:
${volumeAnalysis}

Provide a SCALPING analysis in this EXACT format:

**SCALP BIAS**
[BULLISH/BEARISH/NEUTRAL] (Confidence: 1-10)
[Briefly mention how sentiment affects this bias]

**IMMEDIATE SETUP**
• Entry Zone: [Price]
• Stop Loss: [Price] (Tight)
• Take Profit: [Price] (Quick)

**KEY INDICATORS**
• Momentum: [Brief comment on RSI/MACD]
• Volume: [Analyze the volume data provided above]
• Sentiment: [Comment on Fear & Greed impact]

**WARNING**
[One sentence risk warning]`,
          },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_completion_tokens: 200,
      }),

      groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `Cardano DAY TRADING Analysis (24 Hours)

📊 **INDICATORS:**
RSI(14): ${shortTA?.rsi} [${shortTA?.rsiSignal}]
MACD Trend: ${shortTA?.macdTrend}
MACD Histogram: ${shortTA?.macdHistogram}
Price vs SMA20: ${shortTA?.priceVsSMA20}% | vs SMA50: ${shortTA?.priceVsSMA50}%
Bollinger: ${shortTA?.bbPosition}
Divergence: ${shortTA?.divergence}
Confluence: ${shortTA?.confluenceScore}

Provide analysis in this EXACT format using markdown:

**SIGNAL:** BULLISH/BEARISH/NEUTRAL
**CONFIDENCE:** Very High/High/Medium/Low

📊 **KEY FACTORS:**
• [Indicator 1]
• [Indicator 2]
• [Indicator 3]

⚠️ **WATCH:** [Key level or risk]`.trim(),
          },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_completion_tokens: 200,
      }),

      groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content:
              `You are a technical analysis bot providing educational market analysis based on technical indicators. This is NOT financial advice.

Cardano (ADA) Long-Term Technical Outlook (365-Day Timeframe)

Current Technical Indicators:
- RSI(14): ${longTA?.rsi} [${longTA?.rsiSignal}]
- MACD Trend: ${longTA?.macdTrend}
- MACD Histogram: ${longTA?.macdHistogram}
- Price vs SMA20: ${longTA?.priceVsSMA20}%
- Price vs SMA50: ${longTA?.priceVsSMA50}%
- RSI/Price Divergence: ${longTA?.divergence}
- Technical Confluence: ${longTA?.confluenceScore}
- Support Level: $${longTA?.support}
- Resistance Level: $${longTA?.resistance}

Provide a technical analysis summary in this EXACT format:

**TECHNICAL BIAS:** BULLISH/BEARISH/NEUTRAL
**CONFIDENCE:** 1-10

📊 **TECHNICAL FACTORS:**
• [Key technical indicator observation 1]
• [Key technical indicator observation 2]
• [Key technical indicator observation 3]

🎯 **TECHNICAL LEVELS (Educational):**
Current Price: $${longTA?.entryPrice}
Risk Level: $${longTA?.stopLoss} ([X]%)
Target Zone 1: $${longTA?.takeProfit1} ([X]%)
Target Zone 2: $${longTA?.takeProfit2} ([X]%)
Risk/Reward: ${longTA?.riskReward}

⚠️ **KEY LEVEL TO MONITOR:** [Important support/resistance or trend level]

Remember: This is educational technical analysis only, not investment advice.`.trim(),
          },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_completion_tokens: 200,
      }),
    ]);

    clearTimeout(timeoutId);

    const responseData = {
      veryShortTerm:
        veryShortAnalysis.choices[0]?.message?.content?.trim() || "No analysis",
      shortTerm:
        shortAnalysis.choices[0]?.message?.content?.trim() || "No analysis",
      longTerm:
        longAnalysis.choices[0]?.message?.content?.trim() || "No analysis",
    };

    // Cache the successful response
    analysisCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    console.log(`[CACHED] Stored analysis for future requests`);

    return NextResponse.json(responseData);
  } catch (error: any) {
    clearTimeout(timeoutId);

    // If timeout, try to return stale cache if available
    if (error.name === "AbortError") {
      console.error("Groq API timeout - request took longer than 10s");

      // Try to find any cached data (even expired) as fallback
      const staleCache = analysisCache.get(cacheKey);
      if (staleCache) {
        console.log("[FALLBACK] Returning stale cached data due to timeout");
        return NextResponse.json(staleCache.data);
      }

      return NextResponse.json(
        {
          error: "Analysis request timed out. Please try again.",
        },
        { status: 504 }
      );
    }

    console.error("Groq API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
