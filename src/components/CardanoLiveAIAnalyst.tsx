// src/components/CardanoLiveAIAnalyst.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLocalStorageState } from '@/hooks/useLocalStorage';

const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
const REFRESH_INTERVAL = 600;

export default function CardanoLiveAIAnalyst() {
    const tradingViewContainerRef = useRef<HTMLDivElement>(null);
    const scriptLoadedRef = useRef(false);
    const lastGroqCall = useRef<number>(0);

    const [price, setPrice] = useState('--');
    const [veryShortTermAnalysis, setVeryShortTermAnalysis] = useState(<div />);
    const [shortTermAnalysis, setShortTermAnalysis] = useState(<div />);
    const [longTermAnalysis, setLongTermAnalysis] = useState(<div />);
    const [secondsUntilUpdate, setSecondsUntilUpdate] = useState(REFRESH_INTERVAL);
    const [isFetchingAnalysis, setIsFetchingAnalysis] = useState(false);

    const [showChart, setShowChart] = useLocalStorageState<boolean>('showChart', true);

    const { theme } = useTheme();

    // Fetch price data and AI analysis for multiple timeframes
    useEffect(() => {
        const fetchData = async () => {
            if (!COINGECKO_API_KEY) {
                toast.error("⚠️ CoinGecko API key not configured")
                return;
            }

            setIsFetchingAnalysis(true);
            setVeryShortTermAnalysis(<Loader2 className='animate-spin' />);
            setShortTermAnalysis(<Loader2 className='animate-spin' />);
            setLongTermAnalysis(<Loader2 className='animate-spin' />);

            try {
                // Fetch current price
                const time = Date.now();
                const priceResponse = await fetch(
                    'https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd&include_24hr_change=true',
                    {
                        headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY },
                        cache: 'force-cache',
                        next: { revalidate: 60 },
                    }
                );
                const priceResponseTime = Date.now() - time;
                console.log('Price response time:', priceResponseTime);
                const priceData = await priceResponse.json();
                const currentPrice = priceData?.cardano?.usd;

                if (currentPrice) {
                    setPrice(currentPrice.toFixed(4));

                    // Throttled AI analysis - every 2 minutes to reduce API usage
                    const now = Date.now();
                    if (now - lastGroqCall.current > 119000) {
                        lastGroqCall.current = now;

                        // Fetch OHLC data for 3 timeframes
                        const data = await fetch('https://api.coingecko.com/api/v3/coins/cardano/ohlc?vs_currency=usd&days=1', {
                            headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY }
                        }).then(r => r.json())

                        const longData = await fetch('https://api.coingecko.com/api/v3/coins/cardano/ohlc?vs_currency=usd&days=365', {
                            headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY }
                        }).then(r => r.json())

                        // Fetch volume data (market_chart) for better granularity
                        const marketChartData = await fetch('https://api.coingecko.com/api/v3/coins/cardano/market_chart?vs_currency=usd&days=1', {
                            headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY }
                        }).then(r => r.json());

                        // Fetch Fear & Greed Index
                        const fngData = await fetch('https://api.alternative.me/fng/?limit=1').then(r => r.json());
                        const sentiment = fngData?.data?.[0] || { value: '50', value_classification: 'Neutral' };

                        // Send timeframe data to AI for analysis
                        fetch('/api/groq-analysis', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                price: currentPrice.toFixed(4),
                                change24h: priceData?.cardano?.usd_24h_change,
                                veryShortData: data,
                                shortData: data,
                                longData,
                                volumeData: marketChartData?.total_volumes || [],
                                sentiment,
                            }),
                        })
                            .then((r) => r.json())
                            .then((d) => {
                                if (d.error) {
                                    // Handle timeout or API errors
                                    if (d.error.includes('timeout')) {
                                        toast.warning('Analysis took too long, using cached data');
                                    } else {
                                        toast.error('AI analysis failed');
                                    }
                                    setVeryShortTermAnalysis(<div>⚠️ {d.error}</div>);
                                    setShortTermAnalysis(<div>⚠️ {d.error}</div>);
                                    setLongTermAnalysis(<div>⚠️ {d.error}</div>);
                                } else {
                                    setVeryShortTermAnalysis(d.veryShortTerm || 'No analysis');
                                    setShortTermAnalysis(d.shortTerm || 'No analysis');
                                    setLongTermAnalysis(d.longTerm || 'No analysis');
                                }
                            })
                            .catch((err) => {
                                console.error('Analysis request failed:', err);
                                toast.error('Failed to connect to AI service');
                                setVeryShortTermAnalysis(<div>⚠️ AI analysis failed</div>);
                                setShortTermAnalysis(<div>⚠️ AI analysis failed</div>);
                                setLongTermAnalysis(<div>⚠️ AI analysis failed</div>);
                            })
                            .finally(() => {
                                setIsFetchingAnalysis(false);
                                setSecondsUntilUpdate(REFRESH_INTERVAL);
                            });
                    } else {
                        // Not time to fetch yet, just exit loading state
                        setIsFetchingAnalysis(false);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setVeryShortTermAnalysis(<div>⚠️ Error fetching market data</div>);
                setShortTermAnalysis(<div>⚠️ Error fetching market data</div>);
                setLongTermAnalysis(<div>⚠️ Error fetching market data</div>);
                setIsFetchingAnalysis(false);
            }
        };

        fetchData()

        // Countdown timer - triggers fetch when it hits 0
        const timerInterval = setInterval(() => {
            setSecondsUntilUpdate((prev) => {
                if (prev <= 1) {
                    fetchData();
                    return REFRESH_INTERVAL; // Reset after triggering fetch
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerInterval);
    }, []);

    // Load TradingView widget
    useEffect(() => {
        if (!showChart || !tradingViewContainerRef.current) return;

        const initWidget = () => {
            if (tradingViewContainerRef.current && (window as any).TradingView) {
                new (window as any).TradingView.widget({
                    autosize: true,
                    symbol: 'BINANCE:ADAUSD',
                    interval: 'D',
                    timezone: 'Etc/UTC',
                    theme: theme && theme === 'dark' ? 'dark' : 'light',
                    style: '1',
                    locale: 'en',
                    toolbar_bg: '#0f0f0f',
                    enable_publishing: false,
                    hide_side_toolbar: false,
                    allow_symbol_change: false,
                    container_id: tradingViewContainerRef.current.id,
                    studies: [
                        'RSI@tv-basicstudies',
                        'MACD@tv-basicstudies'
                    ],
                    backgroundColor: theme && theme === 'dark' ? '#0f0f0f' : '#fff',
                    gridColor: theme && theme === 'dark' ? '#333' : '#ccc',
                    fullscreen: true,
                    side_toolbar_in_fullscreen_mode: true,
                });
            }
        };

        if ((window as any).TradingView) {
            initWidget();
        } else if (!scriptLoadedRef.current) {
            scriptLoadedRef.current = true;
            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/tv.js';
            script.async = true;
            script.onload = initWidget;
            document.head.appendChild(script);
        }
    }, [showChart]);

    return (
        <div className="min-h-screen">
            <div className="fixed inset-0 pointer-events-none" />

            <div className="relative container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-[1600px] ">
                {/* Header & Status Bar */}
                <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 ">
                    <div className="space-y-1 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            Cardano Analyst
                        </h1>
                        <p className="text-sm font-medium tracking-wide uppercase">
                            AI-Powered Technical Intelligence
                        </p>
                    </div>

                    <div className="flex items-center gap-4 border border-border/50 rounded-sm cursor-pointer">
                        <button
                            onClick={() => setShowChart(!showChart)}
                            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300"
                        >
                            {showChart ? (
                                <EyeOff className="w-4 h-4 transition-colors" />
                            ) : (
                                <Eye className="w-4 h-4 transition-colors" />
                            )}
                            <span className="text-sm font-medium transition-colors">
                                {showChart ? 'Hide Chart' : 'Show Chart'}
                            </span>
                        </button>
                    </div>
                </header>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {showChart ? (
                        <>
                            <div className="bg-background lg:col-span-4 relative border border-border/50 overflow-hidden rounded-3xl p-8 flex flex-col justify-between min-h-[300px] group transition-colors duration-500">
                                <div className="absolute inset-0 opacity-50 transition-opacity duration-500" />

                                <div className="relative ">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className=" font-medium tracking-wider text-sm">ADA / USD</span>
                                        <div className="flex items-center gap-2 px-2 py-1 rounded-full dark:bg-green-500/10 border border-border/50 dark:border bg-green-700/20 border ">
                                            <div className="w-1.5 h-1.5 rounded-full dark:bg-green-500 bg-green-600 animate-pulse" />
                                            <span className="text-[10px] font-bold dark:text-green-400 text-green-700 uppercase tracking-wider">Live</span>
                                        </div>
                                    </div>
                                    <div className="text-6xl md:text-7xl font-bold tracking-tighter tabular-nums">
                                        ${price}
                                    </div>
                                </div>
                                {!isFetchingAnalysis ? (
                                    <div className="relative mt-8">
                                        <div className="flex items-center gap-4 p-4 rounded-2xl ">
                                            <div className="relative w-12 h-12 flex items-center justify-center">
                                                <svg className="w-full h-full transform -rotate-90 ">
                                                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" className='text-secondary' />
                                                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - secondsUntilUpdate / 120)} />
                                                </svg>
                                                <span className="absolute text-[10px] font-bold">{secondsUntilUpdate}s</span>
                                            </div>

                                            <div>
                                                <div className="text-xs font-medium uppercase tracking-wider mb-0.5">Next Analysis</div>
                                                <div className="text-sm font-mono">
                                                    {`${Math.floor(secondsUntilUpdate / 60)}:${(secondsUntilUpdate % 60).toString().padStart(2, '0')}`}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative mt-8">
                                        <div className="flex items-center gap-4 p-4 rounded-2xl ">
                                            <div className="relative w-12 h-12 flex items-center justify-center">
                                                <Loader2 className='animate-spin' />
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium uppercase tracking-wider mb-0.5">Fetching Analysis...</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>


                            <div className={`lg:col-span-8 relative overflow-hidden rounded-3xl border border-border/50 transition-all duration-500`}>
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
                                <div id="tradingview_chart" ref={tradingViewContainerRef} className="w-full h-full min-h-[400px] rounded-3xl overflow-hidden opacity-90 hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        </>
                    ) : null}

                    {/* Analysis Cards - Grid Row */}
                    <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">

                        {/* Scalping Card */}
                        <div className="group relative overflow-hidden rounded-3xl border border-border/50 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5  " />
                            <div className="relative p-6 h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-border/50 group-hover:scale-110 transition-transform duration-500">
                                        <span className="text-xl">🔥</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white tracking-tight">Scalping</h3>
                                        <p className="text-xs text-orange-400/80 font-medium uppercase tracking-wider">3m Candles • 6h Horizon</p>
                                    </div>
                                </div>
                                <div className="flex-1 bg-black/40 rounded-xl p-4 border border-white/5 overflow-y-auto custom-scrollbar flex justify-center items-center">
                                    <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed">
                                        {veryShortTermAnalysis}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Day Trading Card */}
                        <div className="group relative overflow-hidden bg-gradient-to-br from-green-500/10 to-green-500/10 rounded-3xl border border-border/50 transition-all duration-500">
                            <div className="relative p-6 h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-border/50 group-hover:scale-110 transition-transform duration-500">
                                        <span className="text-xl">⚡</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white tracking-tight">Day Trading</h3>
                                        <p className="text-xs text-green-400/80 font-medium uppercase tracking-wider">1h Candles • 24h Horizon</p>
                                    </div>
                                </div>
                                <div className="flex-1 bg-black/40 rounded-xl p-4 border border-white/5 overflow-y-auto custom-scrollbar flex justify-center items-center">
                                    <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed">
                                        {shortTermAnalysis}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Investment Card */}
                        <div className="group relative overflow-hidden rounded-3xl bg-slate-900/40 border border-white/5 border-purple-500/30 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
                            <div className="relative p-6 h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-border/50 group-hover:scale-110 transition-transform duration-500">
                                        <span className="text-xl">🎯</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white tracking-tight">Investment</h3>
                                        <p className="text-xs text-purple-400/80 font-medium uppercase tracking-wider">Daily Candles • 1y Horizon</p>
                                    </div>
                                </div>
                                <div className="flex-1 bg-black/40 rounded-xl p-4 border border-border/50 overflow-y-auto custom-scrollbar flex justify-center items-center">
                                    <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed">
                                        {longTermAnalysis}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
