
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { Search, Plus, Save, Trash2, Users, ArrowRight, Activity, Target, Camera, Image as ImageIcon, X, Settings, Clock, Lock } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

// --- CONFIG ---
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

// --- TYPES ---
interface Member {
    id: string;
    name: string;
    base: number;
    intermediate: number;
    final: number;
}

type SortConfig = {
    key: keyof Member | 'diff' | 'remaining';
    direction: 'asc' | 'desc';
};

const TIER_VALUES = [15, 25, 50, 75, 100, 125, 150];
const TIER_THRESHOLDS = TIER_VALUES.map(x => x * 1_000_000_000);
const getTierLabel = (val: number) => `${val / 1_000_000_000}G`;

// --- HELPERS ---
const formatExact = (num: number) => {
    if (!num && num !== 0) return "—";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const calculateDiff = (m: Member) => {
     const current = m.final > 0 ? m.final : (m.intermediate > 0 ? m.intermediate : m.base);
     return Math.max(0, current - m.base);
};

const getTierData = (diff: number) => {
    let currentTierIdx = -1;
    for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
        if (diff >= TIER_THRESHOLDS[i]) currentTierIdx = i;
        else break;
    }
    const nextTierIdx = currentTierIdx + 1;
    const currentTierValue = currentTierIdx >= 0 ? TIER_THRESHOLDS[currentTierIdx] : 0;
    const nextTierValue = nextTierIdx < TIER_THRESHOLDS.length ? TIER_THRESHOLDS[nextTierIdx] : null;
    
    // Progress for bar
    const prevBoundary = currentTierValue;
    const nextBoundary = nextTierValue || (prevBoundary * 1.5); 
    const range = nextBoundary - prevBoundary;
    const progressInBand = diff - prevBoundary;
    const percent = Math.min(100, Math.max(0, (progressInBand / range) * 100));
    const remaining = nextTierValue ? nextTierValue - diff : 0;

    return {
        currentTierLabel: currentTierIdx >= 0 ? getTierLabel(TIER_THRESHOLDS[currentTierIdx]) : "0G",
        nextTierLabel: nextTierValue ? getTierLabel(nextTierValue) : "MAX",
        currentTierValue,
        nextTierValue,
        remaining,
        percent,
        isMax: !nextTierValue,
        tierIndex: currentTierIdx
    };
};

const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date().toLocaleDateString('ru-RU');
    return dateStr.trim() === today;
};

// --- COMPONENTS ---

const TierLadder = ({ currentDiff }: { currentDiff: number }) => {
    return (
        <div className="flex items-center gap-1">
            {TIER_VALUES.map((val, idx) => {
                const threshold = val * 1_000_000_000;
                const isAchieved = currentDiff >= threshold;
                const prevThreshold = idx === 0 ? 0 : TIER_VALUES[idx-1] * 1_000_000_000;
                const isNext = !isAchieved && currentDiff >= prevThreshold;

                let styleClass = "bg-[#0f172a] text-slate-700 border-slate-800 opacity-40"; 
                if (isAchieved) {
                    styleClass = val >= 100 
                        ? "bg-amber-500/90 text-black border-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)] opacity-100" 
                        : "bg-emerald-600/90 text-white border-emerald-500 font-bold opacity-100";
                } else if (isNext) {
                    styleClass = "bg-slate-800 text-slate-400 border-slate-600 opacity-90";
                }

                return (
                    <div 
                        key={val}
                        className={`h-[18px] min-w-[30px] px-0.5 rounded-[3px] border flex items-center justify-center text-[11px] font-mono transition-all ${styleClass}`}
                    >
                        {val}
                    </div>
                );
            })}
        </div>
    );
};

const SummaryCard = ({ title, value, subtext, icon: Icon, colorClass, gradient }: any) => (
    <div className={`relative overflow-hidden rounded-lg border border-white/5 p-3 group transition-all duration-300 hover:border-white/10 hover:bg-white/[0.02] bg-[#131b36]/60 backdrop-blur-md`}>
        <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[60px] opacity-10 ${gradient}`}></div>
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-0 flex items-center gap-2 leading-none">
                    {title}
                </div>
                <div className="text-2xl font-mono font-black text-slate-200 tracking-tight drop-shadow-md leading-tight mt-1">
                    {value}
                </div>
                {subtext && <div className={`text-[10px] font-bold mt-0.5 ${colorClass} flex items-center gap-1 leading-none opacity-80`}>{subtext}</div>}
            </div>
            <div className={`p-2 rounded-lg bg-white/5 border border-white/5 ${colorClass}`}>
                <Icon size={18} />
            </div>
        </div>
    </div>
);

const MemberRow = ({ m, idx, isTop3, eventDates, updateMember, deleteMember, GRID_COLS, shouldSync, isAdmin }: any) => {
    const [values, setValues] = useState({
        name: m.name,
        base: m.base,
        intermediate: m.intermediate,
        final: m.final
    });

    useEffect(() => {
        setValues({
            name: m.name,
            base: m.base,
            intermediate: m.intermediate,
            final: m.final
        });
    }, [m]);

    const handleChange = (field: string, val: string) => {
        if (!isAdmin) return;
        setValues(prev => {
            const next = { ...prev, [field]: val };
            if (field === 'final' && shouldSync) next.intermediate = val;
            return next;
        });
    };

    const handleBlur = (field: string) => {
        if (!isAdmin) return;
        let val = values[field as keyof typeof values];
        if (field !== 'name') val = Number(val) || 0;

        const isChanged = val !== m[field];
        const needsSync = field === 'final' && shouldSync && val !== m.intermediate;

        if (isChanged || needsSync) {
             const updates: any = { [field]: val };
             if (field === 'intermediate' && isToday(eventDates.intermediate)) {
                 updates.final = val;
                 setValues(prev => ({ ...prev, final: val as number }));
             }
             if (field === 'final') {
                 const currentIntermediate = m.intermediate;
                 const isEmpty = !currentIntermediate || currentIntermediate === 0;
                 if (shouldSync || isEmpty) {
                     updates.intermediate = val;
                     setValues(prev => ({ ...prev, intermediate: val as number }));
                 }
             }
             updateMember(m.id, updates);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLElement).blur();
    };

    const diff = calculateDiff({ ...m, ...values } as Member); 
    const tierData = getTierData(diff);
    
    const borderClass = isTop3 
        ? 'border-l-2 border-l-amber-500/50 bg-amber-500/[0.03]' 
        : (idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-transparent border-l-2 border-l-transparent');

    return (
        <div 
            className={`
                group grid gap-2 px-4 py-1 items-center 
                transition-colors duration-150 hover:bg-white/[0.05]
                border-b border-white/[0.02]
                ${borderClass}
            `}
            style={{ gridTemplateColumns: GRID_COLS }}
        >
            <div className={`text-center font-mono text-lg font-bold leading-none ${isTop3 ? 'text-amber-500/80' : 'text-slate-700'}`}>
                {idx + 1}
            </div>

            <div className="min-w-0">
                <input 
                    value={values.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    onKeyDown={handleKeyDown}
                    disabled={!isAdmin}
                    className={`w-full bg-transparent border border-transparent rounded px-1 py-0.5 text-lg font-bold leading-none focus:bg-white/10 focus:border-white/20 focus:outline-none ${isTop3 ? 'text-amber-100' : 'text-slate-200'}`}
                />
            </div>

            <div className="text-right">
                 <input 
                    type="number"
                    value={values.base || ''}
                    placeholder={values.base === 0 ? "0" : ""}
                    onChange={(e) => handleChange('base', e.target.value)}
                    onBlur={() => handleBlur('base')}
                    onKeyDown={handleKeyDown}
                    disabled={!isAdmin}
                    className="w-full bg-transparent border border-transparent rounded px-1 py-0.5 text-lg text-right font-mono text-slate-600 tracking-tight leading-none focus:bg-white/10 focus:border-white/20 focus:text-white focus:outline-none placeholder-white/5 opacity-80 hover:opacity-100 transition-opacity"
                />
            </div>

            <div className="text-right relative">
                 <input 
                    type="number"
                    value={values.intermediate || ''}
                    placeholder={values.intermediate === 0 ? "0" : ""}
                    onChange={(e) => handleChange('intermediate', e.target.value)}
                    onBlur={() => handleBlur('intermediate')}
                    onKeyDown={handleKeyDown}
                    disabled={!isAdmin}
                    className="w-full bg-transparent border border-transparent rounded px-1 py-0.5 text-lg text-right font-mono text-slate-500 tracking-tight leading-none focus:bg-white/10 focus:border-white/20 focus:text-white focus:outline-none placeholder-white/5 opacity-90 hover:opacity-100 transition-opacity"
                />
            </div>

            <div className="text-right">
                 <input 
                    type="number"
                    value={values.final || ''}
                    placeholder={values.final === 0 ? "0" : ""}
                    onChange={(e) => handleChange('final', e.target.value)}
                    onBlur={() => handleBlur('final')}
                    onKeyDown={handleKeyDown}
                    disabled={!isAdmin}
                    className="w-full bg-transparent border border-transparent rounded px-1 py-0.5 text-lg text-right font-mono text-slate-300 font-bold tracking-tight leading-none focus:bg-white/10 focus:border-white/20 focus:outline-none placeholder-white/5"
                />
            </div>

            <div className="text-right">
                <span className={`text-2xl lg:text-3xl font-black font-mono tracking-tight leading-none ${diff < 0 ? 'text-red-400' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`}>
                    {diff > 0 ? '+' : ''}{formatExact(diff)}
                </span>
            </div>

            <div className="pl-4 flex flex-col justify-center min-w-0">
                <TierLadder currentDiff={diff} />
                <div className="flex justify-between items-center mt-0.5 pr-2">
                    {!tierData.isMax ? (
                        <>
                            <div className="h-[2px] flex-1 bg-[#1e293b] mx-3 relative overflow-hidden rounded-full border border-white/5">
                                <div className="absolute inset-y-0 left-0 bg-cyan-500 w-1/2 transition-all duration-500 shadow-[0_0_8px_rgba(34,211,238,0.4)]" style={{ width: `${tierData.percent}%` }}></div>
                            </div>
                            <div className="text-sm font-mono text-slate-500 whitespace-nowrap flex items-baseline gap-1 leading-none">
                                <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">До {tierData.nextTierLabel}</span> <span className="text-slate-400 font-bold text-lg leading-none">{formatExact(tierData.remaining)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="w-full text-center text-[10px] text-amber-500/80 font-bold uppercase tracking-widest leading-none">Максимальный Ранг</div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {isAdmin && <button onClick={() => deleteMember(m.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={14} /></button>}
            </div>
        </div>
    );
};

export default function GuildManager({ isAdmin }: { isAdmin: boolean }) {
    const [members, setMembers] = useState<Member[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'diff', direction: 'desc' });
    const [eventDates, setEventDates] = useState({ base: "", intermediate: "", final: "" });
    const [isEditingDates, setIsEditingDates] = useState(false);
    const [syncFinalToIntermediate, setSyncFinalToIntermediate] = useState(false);
    const [isScreenshotMode, setIsScreenshotMode] = useState(false);
    const [newMemberData, setNewMemberData] = useState({ name: "", base: "", intermediate: "", final: "" });

    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Member[]);
        });
        const unsubConfig = onSnapshot(doc(db, "config", "event_dates"), (doc) => {
            if (doc.exists()) setEventDates(doc.data() as any);
        });
        return () => { unsub(); unsubConfig(); };
    }, []);

    const handleSaveDates = async () => {
        if (!isAdmin) return;
        await setDoc(doc(db, "config", "event_dates"), eventDates);
        setIsEditingDates(false);
    };

    const handleAdd = async () => {
        if (!isAdmin) return;
        try {
            await addDoc(collection(db, "users"), {
                name: newMemberData.name,
                base: Number(newMemberData.base) || 0,
                intermediate: Number(newMemberData.intermediate) || 0,
                final: Number(newMemberData.final) || 0
            });
            setNewMemberData({ name: "", base: "", intermediate: "", final: "" });
            setIsAdding(false);
        } catch (e) { console.error(e); }
    };
    
    const updateMember = async (id: string, updates: Partial<Member>) => {
        if (!isAdmin) return;
        try { await updateDoc(doc(db, "users", id), updates); } catch (e) { console.error(e); }
    };
    
    const deleteMember = async (id: string) => { 
        if (!isAdmin) return;
        if (confirm("Удалить?")) await deleteDoc(doc(db, "users", id)); 
    };
    
    const calculateDiffMemo = (m: Member) => calculateDiff(m);

    const filteredAndSortedMembers = useMemo(() => {
        let data = [...members];
        if (searchTerm) data = data.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return data.sort((a, b) => {
            const diffA = calculateDiffMemo(a);
            const diffB = calculateDiffMemo(b);
            const remainingA = getTierData(diffA).remaining;
            const remainingB = getTierData(diffB).remaining;

            let aVal: number | string = 0;
            let bVal: number | string = 0;

            switch (sortConfig.key) {
                case 'diff': aVal = diffA; bVal = diffB; break;
                case 'remaining': aVal = remainingA; bVal = remainingB; break;
                default: 
                    // @ts-ignore
                    aVal = a[sortConfig.key]; bVal = b[sortConfig.key];
            }
            if (typeof aVal === 'string') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
            return sortConfig.direction === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });
    }, [members, searchTerm, sortConfig]);

    const top3Ids = useMemo(() => {
        return [...members].sort((a, b) => calculateDiff(b) - calculateDiff(a)).slice(0, 3).map(m => m.id);
    }, [members]);

    const totalDiff = members.reduce((acc, m) => acc + calculateDiffMemo(m), 0);
    const avgDiff = members.length ? totalDiff / members.length : 0;
    
    const handleSort = (key: SortConfig['key']) => {
        setSortConfig(curr => ({ key, direction: curr.key === key && curr.direction === 'desc' ? 'asc' : 'desc' }));
    };

    const handleCopyImage = async () => {
        if (tableRef.current) {
            try {
                const blob = await htmlToImage.toBlob(tableRef.current, { backgroundColor: '#0B1026' });
                if (blob) { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); alert("Скопировано!"); }
            } catch (e) { alert("Ошибка"); }
        }
    };
    
    const handleToggleSync = async () => {
        if (!isAdmin) return;
        const nextState = !syncFinalToIntermediate;
        setSyncFinalToIntermediate(nextState);

        if (nextState) {
            const candidates = members.filter(m => m.final && m.final !== 0 && m.final !== m.intermediate);
            if (candidates.length > 0) {
                if (window.confirm(`Включена синхронизация.\n\nНайдено ${candidates.length} записей.\n\nОбновить?`)) {
                    try {
                        const batch = writeBatch(db);
                        candidates.forEach(m => {
                            const ref = doc(db, "users", m.id);
                            batch.update(ref, { intermediate: m.final });
                        });
                        await batch.commit();
                    } catch (err) { console.error(err); }
                }
            }
        }
    };

    const GRID_COLS = "40px minmax(200px,1.4fr) 1.1fr 1.1fr 1.1fr 1.3fr 1.8fr 50px";

    return (
        <div className={`flex flex-col font-sans bg-[#0B1026] text-slate-200 overflow-hidden ${isScreenshotMode ? 'fixed inset-0 z-[100] p-0' : 'h-full relative p-2'}`}>
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
            
            {/* Header */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2 shrink-0 relative z-10 px-2 pt-2">
                <SummaryCard title="Участников" value={members.length} icon={Users} colorClass="text-cyan-400" gradient="bg-cyan-500" subtext="Гильдия" />
                <SummaryCard title="Общий Сбор" value={formatExact(totalDiff)} icon={Target} colorClass="text-emerald-400" gradient="bg-emerald-500" subtext="Ивент" />
                <SummaryCard title="Средний Вклад" value={formatExact(Math.floor(avgDiff))} icon={Activity} colorClass="text-amber-400" gradient="bg-amber-500" subtext="На игрока" />
                
                 <div className="flex flex-col gap-1.5 h-full">
                    {!isScreenshotMode ? (
                        <>
                            <div className="flex gap-1.5 flex-1">
                                <button onClick={() => setIsScreenshotMode(true)} className="flex-1 bg-[#131b36]/60 border border-white/10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"><Camera size={20} /></button>
                                <button onClick={handleCopyImage} className="flex-1 bg-[#131b36]/60 border border-white/10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"><ImageIcon size={20} /></button>
                                {isAdmin && (
                                    <button onClick={() => setIsEditingDates(!isEditingDates)} className={`flex-1 rounded-lg flex items-center justify-center border border-white/10 text-slate-400 hover:text-white ${isEditingDates ? 'bg-white/10' : 'bg-[#131b36]/60'}`}>
                                        <Settings size={20} />
                                    </button>
                                )}
                            </div>
                            {isAdmin && (
                                <button onClick={() => setIsAdding(!isAdding)} className={`flex-[2] rounded-lg flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-[10px] transition-all border border-transparent shadow-lg ${isAdding ? 'bg-white/10 text-white' : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white'}`}>
                                    {isAdding ? "Отмена" : <> <Plus size={14} /> Добавить </>}
                                </button>
                            )}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input type="text" placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-full bg-[#131b36]/60 border border-white/10 rounded-lg pl-9 pr-3 text-xs text-slate-200 focus:border-cyan-500/50 outline-none" />
                            </div>
                        </>
                    ) : (
                        <button onClick={() => setIsScreenshotMode(false)} className="h-full w-full bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg font-bold text-xs uppercase hover:bg-red-500/40 flex items-center justify-center gap-2"><X size={16} /> Выход</button>
                    )}
                 </div>
            </div>

            {/* Admin Panels */}
            {isAdding && !isScreenshotMode && isAdmin && (
                 <div className="bg-[#0f172a] border border-emerald-500/30 rounded-2xl p-4 mb-4 relative z-40 shadow-2xl animate-in slide-in-from-top-2 mx-2">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Никнейм</label>
                            <input type="text" value={newMemberData.name} onChange={e => setNewMemberData({...newMemberData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-2 text-sm text-white" placeholder="Name#1234"/>
                        </div>
                        {[{ l: 'База', v: newMemberData.base, k: 'base' }, { l: 'Замер', v: newMemberData.intermediate, k: 'intermediate' }, { l: 'Итог', v: newMemberData.final, k: 'final' }].map((f) => (
                            <div key={f.k}>
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{f.l}</label>
                                <input type="number" value={f.v} onChange={e => setNewMemberData({...newMemberData, [f.k]: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded px-2 py-2 text-sm font-mono text-white text-right"/>
                            </div>
                        ))}
                        <div className="col-span-2 md:col-span-1">
                             <button onClick={handleAdd} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded font-bold text-[10px] uppercase">Сохранить</button>
                        </div>
                    </div>
                 </div>
            )}

            {isEditingDates && !isScreenshotMode && isAdmin && (
                <div className="bg-[#1e293b]/90 border border-white/10 p-3 rounded-lg mb-2 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 z-30 relative mx-2">
                    <div className="flex gap-4 items-end">
                        {['base', 'intermediate', 'final'].map((key) => (
                            <div key={key} className="flex-1">
                                <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">{key === 'base' ? 'Дата Базы' : key === 'intermediate' ? 'Дата Замера' : 'Дата Итога'}</label>
                                <input type="text" placeholder="DD.MM.YYYY" value={eventDates[key as keyof typeof eventDates] || ''} onChange={(e) => setEventDates({...eventDates, [key]: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white"/>
                            </div>
                        ))}
                        <button onClick={handleSaveDates} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-[10px] font-bold uppercase"><Save size={12} /></button>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <div className={`w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors flex items-center ${syncFinalToIntermediate ? 'bg-cyan-500' : 'bg-slate-700'}`} onClick={handleToggleSync}>
                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${syncFinalToIntermediate ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 cursor-pointer select-none" onClick={handleToggleSync}>Синхронизировать замер с итогом</span>
                    </div>
                </div>
            )}

            {/* Table */}
            <div ref={tableRef} className="flex-1 bg-[#0f172a]/80 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-2xl relative z-10 mx-2 mb-2">
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                <div className="grid gap-2 px-4 py-2 bg-[#131b36] border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-500 sticky top-0 z-30 items-end select-none shadow-md" style={{ gridTemplateColumns: GRID_COLS }}>
                    <div onClick={() => handleSort('id')}>#</div>
                    <div onClick={() => handleSort('name')}>Ник</div>
                    <div className="text-right" onClick={() => handleSort('base')}>База</div>
                    <div className="text-right" onClick={() => handleSort('intermediate')}>Замер</div>
                    <div className="text-right" onClick={() => handleSort('final')}>Итог</div>
                    <div className="text-right text-emerald-500" onClick={() => handleSort('diff')}>Разница</div>
                    <div className="pl-2" onClick={() => handleSort('remaining')}>Тир Прогресс</div>
                    <div className="text-right"></div>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 bg-[#0B1026]">
                    {filteredAndSortedMembers.map((m, idx) => (
                        <MemberRow 
                            key={m.id}
                            m={m}
                            idx={idx}
                            isTop3={top3Ids.includes(m.id)}
                            eventDates={eventDates}
                            updateMember={updateMember}
                            deleteMember={deleteMember}
                            GRID_COLS={GRID_COLS}
                            shouldSync={syncFinalToIntermediate}
                            isAdmin={isAdmin}
                        />
                    ))}
                </div>
                
                <div className="px-4 py-1.5 bg-[#131b36] border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <div className="flex items-center gap-2"><Clock size={12} /> <span>{new Date().toLocaleTimeString()}</span></div>
                    {!isAdmin && <div className="flex items-center gap-1 text-[10px]"><Lock size={10}/> Read-Only</div>}
                </div>
            </div>
        </div>
    );
}
