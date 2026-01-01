import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, Loader2, Image as ImageIcon, Trash2, FileJson, AlertCircle, ScanLine, Coins, Diamond, Package, Tag, Swords, Shield, Gem, TrendingUp, TrendingDown, Sparkles, Scale, ArrowRightLeft, Calculator, Percent, ShieldAlert, Siren, Activity, Zap, Target, Crosshair, Info, X, LineChart as LineChartIcon, History, ShieldCheck, ThermometerSun, Clock } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

// --- FIREBASE CONFIG (Reused) ---
const firebaseConfig = {
  apiKey: "AIzaSyCIFKGZioiflKAAA1tHkIZV0u1sMiPzUjo",
  authDomain: "random-3fbaa.firebaseapp.com",
  projectId: "random-3fbaa",
  storageBucket: "random-3fbaa.firebasestorage.app",
  messagingSenderId: "891768940412",
  appId: "1:891768940412:web:312585e31aade1d7df66f9"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// --- INTERFACES ---
type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';
type RiskMode = 'conservative' | 'aggressive';

interface HistoryEntry {
    date: string;
    gold: number;
    crystals: number;
}

interface MarketMetrics {
    median: number;
    min: number;
    risk: RiskLevel;
    cv: number; // Coefficient of Variation
    isOutlier: boolean;
    volatilityRange: number; // (max - min) / median
    p25: number; // 25th percentile (Safe Sell)
}

interface MarketItem {
    visual_id: string;
    category: string;
    level: number;
    price_gold: number;
    price_crystals: number;
    // Analysis fields
    isNew?: boolean;
    goldDelta?: number; 
    crystalDelta?: number;
    price_history?: HistoryEntry[]; // Added for chart
    // Risk Metrics
    goldMetrics?: MarketMetrics;
    crystalMetrics?: MarketMetrics;
    // Arbitrage fields
    arbitrage?: {
        profit: number;
        roi: number;
        rate: number;
        safeSellPrice: number; // The calculated safe price
        isSuperDeal: boolean;
        taxRate: number; 
        volatilityRisk: RiskLevel;
        freshnessLabel: string;
        freshnessDecay: number;
        safetyMargin: number;
    };
}

type ArbitrageMode = 'normal' | 'g2c' | 'c2g';

// --- HELPERS ---
const translateCategory = (cat: string) => {
    const map: Record<string, string> = {
        'weapon': 'Оружие',
        'armor': 'Броня',
        'accessory': 'Аксессуар',
        'material': 'Ресурс',
        'consumable': 'Расходник'
    };
    return map[cat.toLowerCase()] || cat;
};

// Uniform number formatting helper
const formatExact = (num: number) => {
    if (!num && num !== 0) return "—";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const calculateMetrics = (history: number[], currentPrice: number): MarketMetrics => {
    if (!history || history.length === 0) {
        return { median: currentPrice, min: currentPrice, risk: 'unknown', cv: 0, isOutlier: false, volatilityRange: 0, p25: currentPrice };
    }

    // 1. Sort history
    const sorted = [...history].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    // 2. Initial Median (to detect outliers)
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    // 3. Volatility Range ((Max - Min) / Median)
    const volatilityRange = median > 0 ? (max - min) / median : 0;

    // 4. Safe Sell (25th Percentile) - Conservative estimate
    // For very small samples (<= 3), use min to be super safe
    let p25 = min;
    if (sorted.length > 3) {
        const p25Index = Math.floor(sorted.length * 0.25);
        p25 = sorted[p25Index];
    }

    // 5. Calculate Volatility (CV) for Risk Badge
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const variance = sorted.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // 6. Risk Scoring (Based on Range % primarily now)
    let risk: RiskLevel = 'low';
    if (volatilityRange > 0.40) risk = 'high';      // > 40% swing
    else if (volatilityRange > 0.25) risk = 'medium'; // 25-40% swing

    // Outlier check
    const isOutlier = currentPrice > median * 1.5;

    return { median, min, risk, cv, isOutlier, volatilityRange, p25 };
};

const calculateFreshness = (lastDateStr?: string) => {
    if (!lastDateStr) return { decay: 1.0, label: 'Новый' };
    
    const lastSeen = new Date(lastDateStr).getTime();
    const now = Date.now();
    const diffDays = (now - lastSeen) / (1000 * 3600 * 24);

    if (diffDays <= 7) return { decay: 1.0, label: 'Актуально' }; // < 7 days
    if (diffDays <= 30) return { decay: 0.85, label: 'Неделя+' }; // 8-30 days
    if (diffDays <= 90) return { decay: 0.7, label: 'Месяц+' }; // 1-3 months
    return { decay: 0.5, label: 'Устарело' }; // > 3 months
};

// --- COMPONENTS ---

const TaxCalculator = () => {
    const [amount, setAmount] = useState<string>('');
    const [type, setType] = useState<'gold' | 'crystal'>('crystal');

    const val = parseFloat(amount.replace(/\s/g, '')) || 0;
    const taxRate = type === 'crystal' ? 0.20 : 0.10; // 20% for crystal, 10% for gold
    const tax = val * taxRate;
    const net = val - tax;

    return (
        <div className="bg-black/40 border border-white/10 rounded-xl p-2 flex items-center gap-3 h-[42px]">
            <div className="flex bg-white/5 rounded-lg p-0.5">
                <button 
                    onClick={() => setType('crystal')}
                    className={`p-1.5 rounded transition-colors ${type === 'crystal' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Кристаллы (Налог 20%)"
                >
                    <Diamond size={14} />
                </button>
                <button 
                    onClick={() => setType('gold')}
                    className={`p-1.5 rounded transition-colors ${type === 'gold' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Золото (Налог 10%)"
                >
                    <Coins size={14} />
                </button>
            </div>
            
            <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Сумма..."
                className="bg-transparent border-none outline-none text-white text-sm font-mono w-24 text-right appearance-none font-bold"
            />
            
            <div className="w-px h-6 bg-white/10"></div>
            
            <div className="flex flex-col items-end pr-2 min-w-[60px]">
                <span className={`text-sm font-bold tabular-nums ${type === 'crystal' ? 'text-cyan-400' : 'text-amber-400'}`}>
                    {formatExact(Math.floor(net))}
                </span>
                <span className="text-[9px] text-red-400/70">
                   -{taxRate * 100}%
                </span>
            </div>
        </div>
    );
};

const RiskBadge = ({ level, label, mode }: { level?: RiskLevel, label?: string, mode?: 'simple' }) => {
    if (!level || level === 'unknown') return null;

    const config = {
        low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: ShieldCheck, label: 'SAFE' },
        medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle, label: 'VOLATILE' },
        high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Siren, label: 'RISKY' },
    };

    const c = config[level] || config.low;
    const Icon = c.icon;
    const displayLabel = label || c.label;

    if (mode === 'simple') {
        return (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${c.color} ${c.bg} ${c.border}`}>
                <Icon size={10} /> {displayLabel}
            </span>
        )
    }

    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${c.color} ${c.bg} ${c.border}`}>
            <Icon size={12} /> {displayLabel}
        </span>
    );
};

const FormattedPrice = ({ value, type, delta, isNew, highlight, metrics, label }: { value: number, type: 'gold' | 'crystal', delta?: number, isNew?: boolean, highlight?: boolean, metrics?: MarketMetrics, label?: string }) => {
    if ((!value && value !== 0) || isNaN(value)) return <span className="text-white/10 font-mono text-xs">—</span>;
    
    const str = formatExact(Math.floor(value));
    const isOutlier = metrics?.isOutlier && !highlight; // Only strike through if it's the raw price, not safe sell

    return (
        <div className={`flex flex-col items-end ${highlight ? 'scale-110 origin-right transition-transform' : ''}`}>
             {label && <span className="text-[9px] font-bold uppercase text-slate-500 mb-0.5">{label}</span>}
            <span className={`font-mono tabular-nums tracking-tight inline-flex items-center gap-1.5 ${type === 'gold' ? 'text-amber-400' : 'text-cyan-400'} ${isOutlier ? 'opacity-50 line-through decoration-red-500' : ''}`}>
                {type === 'gold' ? <Coins size={14} className="fill-amber-400/20" /> : <Diamond size={14} className="fill-cyan-400/20" />}
                <span className={`font-bold drop-shadow-[0_0_8px_rgba(0,0,0,0.5)] text-lg ${highlight ? 'text-white text-xl' : ''}`}>{str}</span>
            </span>
        </div>
    );
};

const CategoryIcon = ({ category }: { category: string }) => {
    switch (category.toLowerCase()) {
        case 'weapon': return <Swords size={16} className="text-red-400" />;
        case 'armor': return <Shield size={16} className="text-blue-400" />;
        case 'accessory': return <Gem size={16} className="text-purple-400" />;
        case 'material': return <Package size={16} className="text-emerald-400" />;
        default: return <Tag size={16} className="text-slate-400" />;
    }
};

const SniperCard = ({ item, mode, riskMode }: { item: MarketItem, mode: 'g2c' | 'c2g', riskMode: RiskMode }) => {
    const buyCurrency = mode === 'g2c' ? 'gold' : 'crystal';
    const sellCurrency = mode === 'g2c' ? 'crystal' : 'gold';
    
    const buyPrice = buyCurrency === 'gold' ? item.price_gold : item.price_crystals;
    const sellPrice = item.arbitrage?.safeSellPrice || 0;
    const profit = item.arbitrage?.profit || 0;
    const taxRate = item.arbitrage?.taxRate || 0;
    const safetyMargin = item.arbitrage?.safetyMargin || 0;
    
    const BuyIcon = buyCurrency === 'gold' ? Coins : Diamond;
    const SellIcon = sellCurrency === 'gold' ? Coins : Diamond;
    
    return (
        <div className="w-full relative overflow-hidden rounded-2xl border-2 border-green-500/50 bg-black/40 backdrop-blur-xl shadow-[0_0_30px_rgba(34,197,94,0.15)] mb-6 animate-in slide-in-from-top-4 duration-500 group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                <Crosshair size={120} className="text-green-500 animate-[spin_10s_linear_infinite]" />
            </div>

            <div className="relative z-10 p-5 flex flex-col md:flex-row gap-6 items-center">
                {/* Header Section */}
                <div className="flex flex-col items-center md:items-start min-w-[140px] text-center md:text-left">
                    <div className="flex items-center gap-2 text-green-400 font-black uppercase tracking-widest text-sm mb-2 animate-pulse">
                        <Zap size={16} className="fill-green-400" />
                        Рекомендация
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center w-24 h-24 mb-1">
                        <CategoryIcon category={item.category} />
                        <span className="text-[10px] text-slate-400 uppercase font-bold mt-2">{translateCategory(item.category)}</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-slate-300 break-all max-w-[140px]">{item.visual_id}</div>
                </div>

                {/* The Trade Logic */}
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* BUY SIDE */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex flex-col relative overflow-hidden">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-1 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span> ПОКУПКА СЕЙЧАС
                        </div>
                        <div className="flex items-end gap-2 mt-auto">
                            <BuyIcon size={24} className={buyCurrency === 'gold' ? "text-amber-400" : "text-cyan-400"} />
                            <span className="text-3xl font-black text-white leading-none tracking-tight tabular-nums">
                                {formatExact(Math.floor(buyPrice))}
                            </span>
                        </div>
                    </div>

                    {/* SELL SIDE */}
                    <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col relative">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2">
                            <Target size={12} /> Цель: {riskMode === 'conservative' ? 'Safe Sell (P25)' : 'Median Price'}
                        </div>
                        <div className="flex items-end gap-2 mt-auto opacity-80">
                            <SellIcon size={20} className={sellCurrency === 'gold' ? "text-amber-400" : "text-cyan-400"} />
                            <span className="text-2xl font-bold text-white leading-none tracking-tight tabular-nums">
                                {formatExact(Math.floor(sellPrice))}
                            </span>
                        </div>
                         {safetyMargin > 0 && (
                            <div className="absolute top-3 right-3 text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                Safety {safetyMargin * 100}%
                            </div>
                        )}
                    </div>
                </div>

                {/* Profit Stats */}
                <div className="flex flex-col items-center md:items-end min-w-[120px] gap-2">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Чистая Прибыль</span>
                            <div className="group/tooltip relative">
                                <Info size={10} className="text-slate-600 cursor-help" />
                                <div className="absolute right-0 bottom-full mb-2 w-32 bg-black border border-white/10 p-2 rounded text-[9px] text-slate-300 hidden group-hover/tooltip:block z-50">
                                    Учтен налог: {(taxRate * 100).toFixed(0)}%
                                </div>
                            </div>
                        </div>
                        <span className={`text-2xl font-black tabular-nums flex items-center gap-1 ${mode === 'g2c' ? 'text-cyan-400' : 'text-amber-400'}`}>
                            +{formatExact(Math.floor(profit))} 
                            {mode === 'g2c' ? <Diamond size={18} /> : <Coins size={18} />}
                        </span>
                         <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 rounded">
                            Налог {(taxRate * 100).toFixed(0)}%
                        </span>
                    </div>
                     <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">ROI</span>
                        <span className="text-lg font-bold text-green-400 tabular-nums">
                            {item.arbitrage!.roi.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HistoryModal = ({ item, onClose }: { item: MarketItem, onClose: () => void }) => {
    // Format data for Recharts
    const data = useMemo(() => {
        if (!item.price_history || item.price_history.length === 0) return [];
        return item.price_history.map(entry => ({
            ...entry,
            dateFormatted: new Date(entry.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        }));
    }, [item.price_history]);

    const hasEnoughData = data.length >= 2;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-3xl bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-cyan-500/10 bg-[#1e293b]/50">
                    <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                             <CategoryIcon category={item.category} />
                         </div>
                         <div>
                             <h3 className="text-lg font-black text-white tracking-tight">{item.visual_id}</h3>
                             <div className="flex items-center gap-2 text-xs text-slate-400">
                                 <span>История цен</span>
                                 <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                 <span>{data.length} записей</span>
                             </div>
                         </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 min-h-[400px] flex flex-col justify-center">
                    {!hasEnoughData ? (
                        <div className="flex flex-col items-center justify-center text-slate-500 opacity-50">
                            <History size={64} className="mb-4 text-cyan-900" />
                            <p className="font-bold uppercase tracking-widest text-sm">Недостаточно данных для графика</p>
                            <p className="text-xs mt-2">Нужно минимум 2 сканирования в разное время.</p>
                        </div>
                    ) : (
                        <div className="w-full h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                                    <XAxis 
                                        dataKey="dateFormatted" 
                                        stroke="#94a3b8" 
                                        tick={{ fontSize: 10 }} 
                                        tickLine={false} 
                                        axisLine={{ stroke: '#334155' }}
                                    />
                                    {/* Left Axis for Crystals (Cyan) */}
                                    <YAxis 
                                        yAxisId="left" 
                                        stroke="#22d3ee" 
                                        tick={{ fontSize: 10, fill: '#22d3ee' }} 
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                                    />
                                    {/* Right Axis for Gold (Amber) */}
                                    <YAxis 
                                        yAxisId="right" 
                                        orientation="right" 
                                        stroke="#fbbf24" 
                                        tick={{ fontSize: 10, fill: '#fbbf24' }} 
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : `${(val/1000).toFixed(0)}k`}
                                    />
                                    
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />

                                    {/* Crystal Line */}
                                    <Line 
                                        yAxisId="left"
                                        type="monotone" 
                                        dataKey="crystals" 
                                        name="Кристаллы" 
                                        stroke="#22d3ee" 
                                        strokeWidth={3} 
                                        dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    {/* Gold Line */}
                                    <Line 
                                        yAxisId="right"
                                        type="monotone" 
                                        dataKey="gold" 
                                        name="Золото" 
                                        stroke="#fbbf24" 
                                        strokeWidth={3} 
                                        dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />

                                    {/* Reference Lines (Medians & Safe Sell) */}
                                    {item.crystalMetrics?.median && (
                                        <ReferenceLine yAxisId="left" y={item.crystalMetrics.median} stroke="#22d3ee" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: 'Med', fill: '#22d3ee', fontSize: 10 }} />
                                    )}
                                    {item.crystalMetrics?.p25 && (
                                        <ReferenceLine yAxisId="left" y={item.crystalMetrics.p25} stroke="#22d3ee" strokeDasharray="5 5" opacity={0.8} label={{ position: 'insideBottomLeft', value: 'Safe', fill: '#22d3ee', fontSize: 10 }} />
                                    )}
                                    
                                    {item.goldMetrics?.median && (
                                        <ReferenceLine yAxisId="right" y={item.goldMetrics.median} stroke="#fbbf24" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopRight', value: 'Med', fill: '#fbbf24', fontSize: 10 }} />
                                    )}
                                    {item.goldMetrics?.p25 && (
                                        <ReferenceLine yAxisId="right" y={item.goldMetrics.p25} stroke="#fbbf24" strokeDasharray="5 5" opacity={0.8} label={{ position: 'insideBottomRight', value: 'Safe', fill: '#fbbf24', fontSize: 10 }} />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
                
                {hasEnoughData && (
                     <div className="bg-[#1e293b]/50 px-6 py-3 flex gap-4 text-[10px] text-slate-400 border-t border-cyan-500/10">
                         <div className="flex items-center gap-2">
                             <div className="w-4 h-0.5 bg-cyan-400"></div> Кристаллы (Левая шкала)
                         </div>
                         <div className="flex items-center gap-2">
                             <div className="w-4 h-0.5 bg-amber-400"></div> Золото (Правая шкала)
                         </div>
                         <div className="ml-auto flex items-center gap-2">
                             <div className="w-4 h-0.5 border-t border-dashed border-slate-400"></div> Медианная цена
                         </div>
                     </div>
                )}
            </div>
        </div>
    );
};

export default function ExperimentalManager() {
    // Initialize items from localStorage if available
    const [items, setItems] = useState<MarketItem[]>(() => {
        try {
            const saved = localStorage.getItem('market_scanner_items');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load local storage", e);
            return [];
        }
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [mode, setMode] = useState<ArbitrageMode>('normal');
    const [riskMode, setRiskMode] = useState<RiskMode>('conservative');
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<MarketItem | null>(null);

    // Save to localStorage whenever items change
    useEffect(() => {
        try {
            localStorage.setItem('market_scanner_items', JSON.stringify(items));
        } catch (e) {
            console.error("Failed to save to local storage", e);
        }
    }, [items]);

    // --- ARBITRAGE & RISK CALCULATION ---
    const { displayedItems, avgRate } = useMemo(() => {
        if (items.length === 0) return { displayedItems: [], avgRate: 0 };
        
        if (mode === 'normal') {
            return { displayedItems: items, avgRate: 0 };
        }

        // 1. Filter valid items for arbitrage
        // Must have both prices
        const validItems = items.filter(i => i.price_gold > 0 && i.price_crystals > 0);

        if (validItems.length === 0) return { displayedItems: [], avgRate: 0 };

        // 2. Calculate Global Average Rate from valid items
        const totalRate = validItems.reduce((acc, i) => acc + (i.price_gold / i.price_crystals), 0);
        const averageRate = totalRate / validItems.length;

        // 3. Process items with RISK LOGIC
        const processed = validItems.map(item => {
            const itemRate = item.price_gold / item.price_crystals;
            let profit = 0;
            let roi = 0;
            let safeSellPrice = 0;
            let taxRate = 0;
            
            // Get data freshness
            // If we have history, get the last date, otherwise current
            const lastDate = item.price_history && item.price_history.length > 0 
                ? item.price_history[item.price_history.length - 1].date 
                : new Date().toISOString();
            const freshness = calculateFreshness(lastDate);

            // Risk Settings
            const safetyMargin = riskMode === 'conservative' ? 0.10 : 0.0; // 10% safety buffer in conservative
            
            let targetMetrics: MarketMetrics | undefined;

            if (mode === 'g2c') {
                // Strategy: Gold -> Crystal
                // Target: Sell for Crystal
                targetMetrics = item.crystalMetrics;
                const costInCrystals = item.price_gold / averageRate;

                // Determine Base Sell Price
                // Conservative: Use 25th Percentile (Safe Sell)
                // Aggressive: Use Median
                const baseSell = riskMode === 'conservative' 
                    ? (targetMetrics?.p25 || item.price_crystals * 0.9)
                    : (targetMetrics?.median || item.price_crystals);
                
                // Apply Safety Margin
                safeSellPrice = baseSell * (1 - safetyMargin);

                // CRYSTAL TAX IS 20%
                taxRate = 0.20;
                const revenueInCrystals = safeSellPrice * (1 - taxRate); 
                
                profit = revenueInCrystals - costInCrystals;
                roi = costInCrystals > 0 ? (profit / costInCrystals) * 100 : 0;
            } else {
                // Strategy: Crystal -> Gold
                // Target: Sell for Gold
                targetMetrics = item.goldMetrics;
                const costInGold = item.price_crystals * averageRate;

                // Determine Base Sell Price
                const baseSell = riskMode === 'conservative' 
                    ? (targetMetrics?.p25 || item.price_gold * 0.9)
                    : (targetMetrics?.median || item.price_gold);
                
                // Apply Safety Margin
                safeSellPrice = baseSell * (1 - safetyMargin);

                // GOLD TAX IS 10%
                taxRate = 0.10;
                const revenueInGold = safeSellPrice * (1 - taxRate); 
                
                profit = revenueInGold - costInGold;
                roi = costInGold > 0 ? (profit / costInGold) * 100 : 0;
            }
            
            // Apply Decay to Profit (Ranking only, display real profit)
            // Older data = lower sorting score
            const rankingScore = profit * freshness.decay;

            // Volatility Risk of the TARGET currency
            const volatilityRisk = targetMetrics?.risk || 'unknown';

            // Super Deal: Rate deviation > 30%
            const deviation = Math.abs((itemRate - averageRate) / averageRate);
            const isSuperDeal = deviation > 0.3;

            return { 
                ...item, 
                arbitrage: { 
                    profit, 
                    roi, 
                    rate: itemRate, 
                    isSuperDeal, 
                    safeSellPrice, 
                    taxRate, 
                    volatilityRisk,
                    freshnessLabel: freshness.label,
                    freshnessDecay: freshness.decay,
                    safetyMargin,
                    rankingScore
                } 
            };
        });

        // 4. Filter & Sort
        const profitable = processed
            .filter(i => {
                // In Conservative mode, exclude High Risk items
                if (riskMode === 'conservative' && i.arbitrage!.volatilityRisk === 'high') return false;
                // Exclude negative profit
                return i.arbitrage!.profit > 0;
            })
            .sort((a, b) => b.arbitrage!.rankingScore - a.arbitrage!.rankingScore);

        return { displayedItems: profitable, avgRate: averageRate };

    }, [items, mode, riskMode]);

    const compareAndSaveItems = async (scannedItems: MarketItem[]) => {
        setStatusMessage("Анализ рисков и базы данных...");
        const augmentedItems: MarketItem[] = [];

        for (const item of scannedItems) {
            try {
                const itemRef = doc(db, "market_items", item.visual_id);
                const itemSnap = await getDoc(itemRef);

                let isNew = false;
                let goldDelta = 0;
                let crystalDelta = 0;
                let goldMetrics: MarketMetrics | undefined;
                let crystalMetrics: MarketMetrics | undefined;
                let fullHistory: HistoryEntry[] = [];

                if (itemSnap.exists()) {
                    const data = itemSnap.data();
                    const prevGold = data.latest_price_gold || 0;
                    const prevCrystal = data.latest_price_crystals || 0;
                    
                    // Extract History Arrays
                    const history = data.price_history || [];
                    
                    // Add current scan to local history for chart visualization immediately
                    fullHistory = [...history, {
                        date: new Date().toISOString(),
                        gold: item.price_gold,
                        crystals: item.price_crystals
                    }];

                    const goldHistory = history.map((h: any) => h.gold).filter((p: number) => p > 0);
                    const crystalHistory = history.map((h: any) => h.crystals).filter((p: number) => p > 0);

                    // --- RISK & METRICS CALCULATION ---
                    // Add current item to history for calc (optional, but gives immediate context)
                    goldMetrics = calculateMetrics([...goldHistory, item.price_gold], item.price_gold);
                    crystalMetrics = calculateMetrics([...crystalHistory, item.price_crystals], item.price_crystals);

                    // Calculate Delta based on Median (Anti-Scam) instead of Last Price
                    if (goldMetrics.median > 0 && item.price_gold > 0) {
                        goldDelta = ((item.price_gold - goldMetrics.median) / goldMetrics.median) * 100;
                    }
                    if (crystalMetrics.median > 0 && item.price_crystals > 0) {
                        crystalDelta = ((item.price_crystals - crystalMetrics.median) / crystalMetrics.median) * 100;
                    }

                    // Update existing document
                    await updateDoc(itemRef, {
                        last_seen: serverTimestamp(),
                        latest_price_gold: item.price_gold,
                        latest_price_crystals: item.price_crystals,
                        price_history: arrayUnion({
                            date: new Date().toISOString(),
                            gold: item.price_gold,
                            crystals: item.price_crystals
                        })
                    });
                } else {
                    isNew = true;
                    // New item metrics
                    goldMetrics = { median: item.price_gold, min: item.price_gold, risk: 'unknown', cv: 0, isOutlier: false, volatilityRange: 0, p25: item.price_gold };
                    crystalMetrics = { median: item.price_crystals, min: item.price_crystals, risk: 'unknown', cv: 0, isOutlier: false, volatilityRange: 0, p25: item.price_crystals };
                    
                    fullHistory = [{
                        date: new Date().toISOString(),
                        gold: item.price_gold,
                        crystals: item.price_crystals
                    }];

                    await setDoc(itemRef, {
                        visual_id: item.visual_id,
                        category: item.category,
                        level: item.level,
                        first_seen: serverTimestamp(),
                        last_seen: serverTimestamp(),
                        latest_price_gold: item.price_gold,
                        latest_price_crystals: item.price_crystals,
                        price_history: fullHistory
                    });
                }

                augmentedItems.push({ 
                    ...item, 
                    isNew, 
                    goldDelta, 
                    crystalDelta,
                    goldMetrics,
                    crystalMetrics,
                    price_history: fullHistory
                });
            } catch (err) {
                console.error(`Error processing item ${item.visual_id}:`, err);
                augmentedItems.push(item);
            }
        }
        return augmentedItems;
    };

    const processImage = async (file: File) => {
        setIsProcessing(true);
        setError(null);
        setStatusMessage("Анализ изображения AI...");

        try {
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                     const result = reader.result as string;
                     const base64 = result.split(',')[1];
                     resolve(base64);
                };
                reader.onerror = error => reject(error);
            });

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64Data } },
                        {
                            text: `
                            Role: You are a Market Scanner AI for a mobile RPG. Your job is to extract item data from screenshots where items have NO text names, only icons.

                            Objective: Convert the image grid into a JSON array using Visual ID Generation.

                            Critical Rule for VISUAL_ID:
                            Since items lack names, you must generate a descriptive ID based on the icon's appearance.
                            Pattern: [type]_[color]_[feature]_lvl[number]
                            * Use ONLY lowercase English letters.
                            * Be consistent! If a sword looks the same as before, generate the EXACT same ID.
                            * Examples:
                                * sword_white_glowing_lvl15
                                * boots_cyan_feathers_lvl15
                                * armor_red_golden_lvl15

                            Extraction Rules:
                            1. Level: Number in the top-left circle.
                            2. Gold: Number next to the yellow coin icon.
                            3. Crystals: Number next to the blue diamond icon.

                            Output Format:
                            Return ONLY valid JSON. No markdown formatting, no explanations.

                            \`\`\`json
                            {
                              "scan_date": "YYYY-MM-DD",
                              "items": [
                                {
                                  "visual_id": "string",
                                  "category": "weapon|armor|accessory",
                                  "level": number,
                                  "price_gold": number,
                                  "price_crystals": number
                                }
                              ]
                            }
                            \`\`\`
                            `
                        }
                    ]
                }
            });

            const text = response.text.trim().replace(/```json/g, '').replace(/```/g, '');
            let parsedItems: MarketItem[] = [];

            try {
                const parsedData = JSON.parse(text);
                if (parsedData.items && Array.isArray(parsedData.items)) {
                    parsedItems = parsedData.items;
                } else if (Array.isArray(parsedData)) {
                    parsedItems = parsedData;
                } else {
                    throw new Error("Invalid format");
                }
            } catch (parseError) {
                console.error(text);
                throw new Error("Не удалось обработать ответ AI. Проверьте формат JSON.");
            }

            const finalItems = await compareAndSaveItems(parsedItems);
            setItems(finalItems);
            setStatusMessage("");

        } catch (err) {
            console.error(err);
            setError("Не удалось распознать данные. Убедитесь, что скриншот четкий.");
            setStatusMessage("");
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePaste = useCallback((e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) processImage(file);
                break;
            }
        }
    }, []);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]?.type.startsWith('image/')) processImage(e.dataTransfer.files[0]);
    };

    useEffect(() => {
        document.addEventListener('paste', handlePaste as any);
        return () => document.removeEventListener('paste', handlePaste as any);
    }, [handlePaste]);

    const getTagsFromId = (id: string) => {
        if (!id) return [];
        const parts = id.split('_');
        return parts.filter(p => !p.startsWith('lvl') && isNaN(Number(p)));
    };

    return (
        <div className="h-full flex flex-col font-sans p-4 relative">
             {/* Background decorative elements */}
             <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full"></div>
             </div>

             {/* History Modal */}
             {selectedHistoryItem && (
                 <HistoryModal item={selectedHistoryItem} onClose={() => setSelectedHistoryItem(null)} />
             )}

            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-end mb-6 gap-4 relative z-10">
                <div className="flex flex-col gap-2">
                    <div>
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 tracking-widest flex items-center gap-3 drop-shadow-sm">
                            <ScanLine size={24} className="text-cyan-400" /> 
                            СКАНЕР РЫНКА
                        </h2>
                        <p className="text-xs text-cyan-200/60 mt-1 font-medium tracking-wide">
                            AI Анализ • Риск-Менеджмент • Арбитраж
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Tax Calculator Widget */}
                    <TaxCalculator />
                    
                    {/* RISK MODE TOGGLE */}
                     <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 shadow-lg backdrop-blur-sm">
                        <button 
                            onClick={() => setRiskMode('conservative')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${riskMode === 'conservative' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            title="Консервативный: Использует Safe Sell (P25) и фильтр рисков"
                        >
                            <ShieldCheck size={14} /> Safe
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-1"></div>
                        <button 
                            onClick={() => setRiskMode('aggressive')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${riskMode === 'aggressive' ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            title="Агрессивный: Использует Медиану, без запаса"
                        >
                            <Swords size={14} /> Aggr.
                        </button>
                    </div>

                    {/* Strategy Toggle */}
                    <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 shadow-lg backdrop-blur-sm">
                        <button 
                            onClick={() => setMode('normal')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${mode === 'normal' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            title="Обычный режим"
                        >
                            <Scale size={14} /> Обзор
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-1"></div>
                        <button 
                            onClick={() => setMode('g2c')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${mode === 'g2c' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            title="Золото -> Кристаллы"
                        >
                            <Coins size={12} className="text-amber-400" /> <ArrowRightLeft size={10} /> <Diamond size={12} className="text-cyan-400" />
                        </button>
                        <button 
                            onClick={() => setMode('c2g')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${mode === 'c2g' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            title="Кристаллы -> Золото"
                        >
                             <Diamond size={12} className="text-cyan-400" /> <ArrowRightLeft size={10} /> <Coins size={12} className="text-amber-400" />
                        </button>
                    </div>

                    {items.length > 0 && (
                        <button onClick={() => { setItems([]); setMode('normal'); localStorage.removeItem('market_scanner_items'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-red-500/10">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-6 min-h-0 relative z-10">
                {(items.length === 0 || dragActive) && (
                    <div 
                        className={`flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden group
                            ${dragActive 
                                ? 'border-cyan-400 bg-cyan-900/20 scale-[0.99] shadow-[0_0_50px_rgba(34,211,238,0.2)]' 
                                : 'border-cyan-500/20 bg-slate-900/40 hover:border-cyan-400/50 hover:bg-slate-900/60'
                            }
                            ${isProcessing ? 'pointer-events-none' : ''}
                        `}
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    >
                        {isProcessing ? (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-cyan-400 blur-xl opacity-20 animate-pulse"></div>
                                    <Loader2 size={56} className="text-cyan-400 animate-spin relative z-10" />
                                </div>
                                <h3 className="mt-6 text-lg font-black text-cyan-100 uppercase tracking-[0.2em] animate-pulse">
                                    {statusMessage || "Анализ рынка..."}
                                </h3>
                                <div className="h-1 w-32 bg-slate-800 rounded-full mt-4 overflow-hidden">
                                    <div className="h-full bg-cyan-400 animate-[loading_1.5s_ease-in-out_infinite] w-full origin-left"></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mb-6 border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.15)] group-hover:scale-110 transition-transform duration-300">
                                    <ImageIcon size={32} className="text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                                </div>
                                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2 group-hover:text-cyan-200 transition-colors">Скриншот магазина</h3>
                                <p className="text-sm text-cyan-200/50 font-mono">или нажмите CTRL+V</p>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) processImage(e.target.files[0]); }} />
                            </>
                        )}
                    </div>
                )}

                {error && (
                    <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-200 text-sm font-bold shadow-lg shadow-red-900/20 animate-in slide-in-from-top-2">
                        <AlertCircle size={20} className="text-red-400" /> {error}
                    </div>
                )}

                {items.length > 0 && !isProcessing && (
                    <div className={`flex-1 bg-slate-900/60 backdrop-blur-xl rounded-3xl border flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 shadow-[0_0_50px_rgba(6,182,212,0.1)] transition-colors duration-500 ${mode !== 'normal' ? 'border-purple-500/30 shadow-[0_0_60px_rgba(168,85,247,0.15)]' : 'border-cyan-500/30'}`}>
                        {/* Decorative header line */}
                        <div className={`h-1 w-full bg-gradient-to-r ${mode === 'g2c' ? 'from-amber-500 via-yellow-500 to-amber-700' : mode === 'c2g' ? 'from-purple-500 via-pink-500 to-purple-700' : 'from-cyan-500 via-blue-500 to-purple-500'} transition-all duration-500`}></div>
                        
                        {/* Stats Bar for Arbitrage */}
                        {mode !== 'normal' && avgRate > 0 && (
                            <div className="bg-black/30 border-b border-white/5 px-8 py-3 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-4">
                                     <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider">
                                        <Calculator size={14} /> Средний курс:
                                     </div>
                                     <div className="flex items-center gap-2 font-mono text-white bg-white/5 px-2 py-1 rounded">
                                         1 <Diamond size={10} className="text-cyan-400" /> = {formatExact(Math.floor(avgRate))} <Coins size={10} className="text-amber-400" />
                                     </div>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                                    <div className={`flex items-center gap-2 ${riskMode === 'conservative' ? 'text-emerald-400' : 'text-red-400'}`}>
                                         <Shield size={12} /> {riskMode === 'conservative' ? 'Safe Protection' : 'Aggressive Mode'}
                                    </div>
                                    <div className="flex items-center gap-2 text-purple-400">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div> Супер Выгода {'>'} 30%
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="overflow-auto h-full custom-scrollbar relative z-10">
                            {/* Sniper Recommendation Card */}
                            {mode !== 'normal' && displayedItems.length > 0 && (
                                <div className="px-8 pt-6">
                                    <SniperCard item={displayedItems[0]} mode={mode as 'g2c' | 'c2g'} riskMode={riskMode} />
                                </div>
                            )}

                            <div className="grid grid-cols-[1.5fr_0.8fr_0.5fr_1fr] gap-2 px-4 py-3 bg-slate-950/80 backdrop-blur-md border-b border-cyan-500/20 text-xs font-black uppercase tracking-[0.2em] text-cyan-500/80 items-center sticky top-0 z-30 shadow-md">
                                <div>Визуальный ID</div>
                                <div>Категория</div>
                                <div className="text-center">LVL</div>
                                <div className="text-right">Цена</div>
                            </div>

                            <div className="w-full pb-4">
                                {displayedItems.map((m, idx) => {
                                    const visualTags = getTagsFromId(m.visual_id);
                                    const isArb = mode !== 'normal' && m.arbitrage;
                                    const taxRate = m.arbitrage?.taxRate || 0;
                                    const safetyMargin = m.arbitrage?.safetyMargin || 0;
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => setSelectedHistoryItem(m)}
                                            className={`relative grid grid-cols-[1.5fr_0.8fr_0.5fr_1fr] gap-2 px-4 py-3 items-center text-sm border-b transition-all duration-200 group cursor-pointer
                                            ${isArb && m.arbitrage?.isSuperDeal 
                                                ? 'bg-purple-900/10 border-purple-500/40 hover:bg-purple-900/20' 
                                                : 'border-cyan-500/10 hover:bg-cyan-500/5'
                                            }
                                        `}>
                                            {isArb && m.arbitrage?.isSuperDeal && (
                                                <div className="absolute inset-y-0 left-0 w-1 bg-purple-500 shadow-[0_0_15px_#a855f7]"></div>
                                            )}

                                            <div className="flex flex-col">
                                                <div className="font-bold text-slate-300 tracking-tight group-hover:text-cyan-300 transition-colors font-mono text-base break-all flex items-center gap-2">
                                                    {m.visual_id}
                                                </div>
                                                {visualTags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {visualTags.map((tag, tIdx) => (
                                                            <span key={tIdx} className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-slate-500">{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                                {isArb && (
                                                    <div className="flex flex-wrap items-center gap-2 mt-2 animate-in fade-in">
                                                        <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 w-fit
                                                            ${m.arbitrage!.isSuperDeal ? 'text-purple-300 bg-purple-500/20 border-purple-500/30' : 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                                                            {mode === 'g2c' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                            ВЫГОДА: {formatExact(Math.floor(m.arbitrage!.profit))} {mode === 'g2c' ? '💎' : '🟡'}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-[9px] font-mono text-slate-500">
                                                                ROI: {m.arbitrage!.roi.toFixed(1)}%
                                                            </div>
                                                            <div className="text-[9px] font-mono text-red-400/70">
                                                                Tax {(taxRate * 100).toFixed(0)}%
                                                            </div>
                                                            {safetyMargin > 0 && (
                                                                <div className="text-[9px] font-mono text-emerald-500/70">
                                                                    Safety {(safetyMargin * 100).toFixed(0)}%
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <CategoryIcon category={m.category} />
                                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{translateCategory(m.category)}</span>
                                                </div>
                                                {/* Risk Badges */}
                                                <div className="flex gap-1 flex-wrap">
                                                     {m.arbitrage ? (
                                                         <>
                                                            <RiskBadge level={m.arbitrage.volatilityRisk} mode="simple" />
                                                            <RiskBadge level={m.arbitrage.freshnessDecay < 1 ? 'medium' : 'low'} label={m.arbitrage.freshnessLabel} mode="simple" />
                                                         </>
                                                     ) : (
                                                         <>
                                                             {m.goldMetrics?.risk && <RiskBadge level={m.goldMetrics.risk} mode="simple" label="GOLD RISK" />}
                                                             {m.crystalMetrics?.risk && <RiskBadge level={m.crystalMetrics.risk} mode="simple" label="GEM RISK" />}
                                                         </>
                                                     )}
                                                </div>
                                            </div>

                                            <div className="text-center font-mono font-bold text-white bg-white/5 rounded px-3 py-1 mx-auto w-fit text-sm">
                                                {m.level}
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                {m.price_gold > 0 && <FormattedPrice value={m.price_gold} type="gold" delta={m.goldDelta} isNew={m.isNew} highlight={mode === 'g2c'} metrics={m.goldMetrics} label={mode === 'g2c' ? "Buy Price" : undefined} />}
                                                
                                                {/* In C2G Mode, show Crystal Buy Price, then Show Gold Safe Sell Price */}
                                                {m.price_crystals > 0 && <FormattedPrice value={m.price_crystals} type="crystal" delta={m.crystalDelta} isNew={m.isNew} highlight={mode === 'c2g'} metrics={m.crystalMetrics} label={mode === 'c2g' ? "Buy Price" : undefined} />}
                                                
                                                {isArb && (
                                                    <div className="mt-1 pt-1 border-t border-white/5 w-full flex flex-col items-end">
                                                        <span className="text-[9px] font-bold uppercase text-green-400 mb-0.5">Safe Sell (Target)</span>
                                                        <div className={`font-mono tabular-nums tracking-tight inline-flex items-center gap-1.5 ${mode === 'g2c' ? 'text-cyan-300' : 'text-amber-300'}`}>
                                                             {mode === 'g2c' ? <Diamond size={12} /> : <Coins size={12} />}
                                                             <span className="font-bold text-md">{formatExact(Math.floor(m.arbitrage!.safeSellPrice))}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {(!m.price_gold && !m.price_crystals) && <span className="text-[10px] text-slate-600">Бесплатно?</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {displayedItems.length === 0 && mode !== 'normal' && items.length > 0 && (
                                    <div className="flex flex-col items-center justify-center p-8 text-slate-500">
                                        <Scale size={32} className="mb-2 opacity-50" />
                                        <p className="text-sm font-bold uppercase tracking-wider">Нет безопасных сделок</p>
                                        <p className="text-xs mt-1">Все товары отфильтрованы из-за высокого риска (включен Conservative Mode).</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute bottom-8 right-8 z-40">
                             <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(items, null, 2)); alert("JSON скопирован!"); }} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 group">
                                 <FileJson size={20} className="group-hover:rotate-12 transition-transform" />
                             </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}