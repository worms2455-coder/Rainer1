
import React, { useState, useEffect, useRef } from 'react';
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { Gift, Crown, Loader2, Play, Lock, Trophy, AlertCircle, ChevronRight, Check, Timer, ShieldAlert, List, RotateCcw, Copy, X, Sparkles } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

import TierWinnersStrip from './TierWinnersStrip';
import SlotMachine from './SlotMachine';
import MoscowClock from './MoscowClock';
import { LotterySession, TIERS_CONFIG, TIER_REWARDS, TIER_WINNERS_COUNT, BONUS_TIER_LEVEL } from '../types';
import { subscribeToLottery, adminStartCheck, adminStartRoll, adminPickWinner, adminNextStage, adminSetReady, adminResetSession, OFFICIAL_START_TIMESTAMP } from '../services/lotteryService';

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

// --- HELPERS ---
const isBonus = (tier: number) => tier === BONUS_TIER_LEVEL;
const getTierLabel = (tier: number) => isBonus(tier) ? "BONUS" : `${tier}G`;

// --- VISUALS ---
const GarlandBorder = ({ children, color = 'green', title, icon: Icon }: any) => (
    <div className="relative w-full h-full flex flex-col rounded-2xl border border-white/10 overflow-hidden bg-[#0a0505]/80 backdrop-blur-md">
        {/* Header */}
        <div className={`shrink-0 h-10 flex items-center justify-between px-4 border-b border-white/5 ${color === 'red' ? 'bg-red-950/30' : 'bg-emerald-950/30'}`}>
            <div className="flex items-center gap-2">
                <Icon size={14} className={color === 'red' ? 'text-red-400' : 'text-emerald-400'} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{title}</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${color === 'red' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_5px_#22c55e]'}`}></div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 relative">
            {children}
            <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
        </div>
    </div>
);

const CountdownTimer = () => {
    const [timeLeft, setTimeLeft] = useState<string>("");
    
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = OFFICIAL_START_TIMESTAMP - now;
            
            if (diff <= 0) {
                setTimeLeft("LIVE");
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${days}д ${hours}ч ${minutes}м ${seconds}с`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 bg-black/40 px-2 py-1 rounded border border-white/5">
            <Timer size={10} />
            <span className="font-bold uppercase">До старта:</span>
            <span className="text-amber-500 font-bold">{timeLeft}</span>
        </div>
    );
};

const StageResultsModal = ({ tier, winners, reward, onClose }: { tier: number, winners: string[], reward: number, onClose: () => void }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleCopy = async () => {
        if (cardRef.current) {
            try {
                const blob = await htmlToImage.toBlob(cardRef.current, { backgroundColor: '#0f172a' });
                if (blob) {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    alert("Результаты скопированы в буфер!");
                }
            } catch (e) {
                console.error(e);
                alert("Ошибка копирования. Попробуйте скриншот.");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in duration-300">
             <div className="w-full max-w-md flex flex-col gap-4">
                 {/* Card to Snapshot */}
                 <div ref={cardRef} className="bg-[#0f172a] border-2 border-amber-500/50 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(251,191,36,0.2)] relative">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>
                     
                     <div className="p-8 text-center relative z-10">
                         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black uppercase tracking-widest text-xs mb-4">
                             {isBonus(tier) ? <Sparkles size={12} /> : <Trophy size={12} />}
                             {isBonus(tier) ? "BONUS STAGE" : `TIER ${tier}G COMPLETED`}
                         </div>
                         
                         <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">
                             {isBonus(tier) ? "ФИНАЛ КОМПЕНСАЦИИ" : "ИТОГИ ЭТАПА"}
                         </h2>
                         <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-8">
                             Награда: <span className="text-cyan-400">{reward} 💎</span> каждому
                         </p>

                         <div className="space-y-3">
                             {winners.map((w, i) => (
                                 <div key={i} className="bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 p-3 rounded-r-xl flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold">
                                         <Crown size={16} />
                                     </div>
                                     <div className="text-left">
                                         <div className="font-black text-xl text-white leading-none">{w.split('#')[0]}</div>
                                         <div className="text-[10px] text-amber-500/50 font-mono font-bold">{w.match(/#(\d+)$/)?.[0] || 'ID'}</div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                     
                     <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"></div>
                 </div>

                 {/* Controls */}
                 <div className="flex gap-2">
                     <button onClick={handleCopy} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors">
                         <Copy size={16} /> Копировать
                     </button>
                     <button onClick={onClose} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors shadow-lg">
                         Продолжить <ChevronRight size={16} />
                     </button>
                 </div>
             </div>
        </div>
    );
};

const WinnersModal = ({ session, onClose, onReset, isAdmin }: { session: LotterySession, onClose: () => void, onReset: () => void, isAdmin: boolean }) => {
    const totalDistributed = Object.values(session.stages).reduce((acc, stage) => acc + (stage.winners.length * stage.reward), 0);
    const sortedStages = Object.values(session.stages).sort((a, b) => a.tier - b.tier);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleCopy = async () => {
        if (cardRef.current) {
            try {
                // To capture the whole modal content (or specific part), we ref the main container
                const blob = await htmlToImage.toBlob(cardRef.current, { backgroundColor: '#0f172a' });
                if (blob) {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    alert("Итоги скопированы!");
                }
            } catch (e) {
                console.error(e);
                alert("Ошибка копирования.");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-500">
             <div ref={cardRef} className="w-full max-w-2xl bg-[#0f172a] border border-amber-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col max-h-[90vh] relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>
                
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-amber-950/60 to-black border-b border-amber-500/20 flex justify-between items-center shrink-0 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase tracking-widest drop-shadow-sm flex items-center gap-3">
                            <Trophy className="text-amber-400" size={28} /> Итоги Розыгрыша
                        </h2>
                        <p className="text-xs text-amber-500/60 font-mono mt-1 font-bold">Список всех победителей и наград</p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Общий фонд</div>
                        <div className="text-2xl font-black text-cyan-400 drop-shadow-md tracking-tight">{totalDistributed} 💎</div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 relative z-10">
                    {sortedStages.map(stage => (
                        <div key={stage.tier} className={`border rounded-xl p-3 transition-all ${stage.winners.length > 0 ? 'bg-white/5 border-amber-500/10 hover:bg-white/10' : 'bg-black/40 border-white/5 opacity-50'}`}>
                            <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-black px-2 py-0.5 rounded border ${stage.winners.length > 0 ? (isBonus(stage.tier) ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20') : 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                                        {getTierLabel(stage.tier)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        Приз: <span className="text-cyan-400 text-sm">{stage.reward} 💎</span>
                                    </span>
                                </div>
                                {stage.winners.length === 0 && <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Нет победителей</span>}
                            </div>
                            {stage.winners.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {stage.winners.map((w, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-black/40 px-3 py-2 rounded-lg border border-white/5 hover:border-amber-500/30 transition-colors">
                                            <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] font-bold text-amber-500 border border-amber-500/20">{idx + 1}</div>
                                            <span className="text-sm font-bold text-slate-200 truncate">{w.split('#')[0]}</span>
                                            <span className="text-[10px] text-slate-600 font-mono ml-auto opacity-70">{w.match(/#(\d+)$/)?.[0]}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-[#050202] flex flex-wrap justify-between gap-4 shrink-0 relative z-10">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors">Закрыть окно</button>
                    <div className="flex gap-2">
                         <button onClick={handleCopy} className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                             <Copy size={14} /> Скриншот
                         </button>
                         {isAdmin && (
                            <button onClick={() => { if (confirm("ВНИМАНИЕ: Это полностью сбросит текущую сессию и начнет новую. Вы уверены?")) onReset(); }} className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                                <RotateCcw size={14} /> Новый Розыгрыш
                            </button>
                        )}
                    </div>
                </div>
             </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
interface LotterySystemProps {
    isAdmin: boolean;
    isSoundEnabled: boolean;
    isLocked: boolean;
    setIsLocked: (locked: boolean) => void;
    setFlyState: (state: any) => void;
    AudioController: any;
}

export default function LotterySystem({ isAdmin, isSoundEnabled, isLocked, setIsLocked, setFlyState, AudioController }: LotterySystemProps) {
    const [session, setSession] = useState<LotterySession | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    
    // UI Local State for Animations
    const [targetDigits, setTargetDigits] = useState<string[]>(['?','?','?','?','?']);
    const [isSpinning, setIsSpinning] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    
    // Modals
    const [showResultsModal, setShowResultsModal] = useState(false); // Global summary
    const [showStageModal, setShowStageModal] = useState(false); // Per-stage popup

    // Audio wrapper
    const play = (action: string, ...args: any[]) => {
        if (!isSoundEnabled) return;
        if (action === 'speak') AudioController.speak(args[0]);
        if (action === 'tick') AudioController.playTick();
        if (action === 'magic') AudioController.playMagic();
        if (action === 'success') AudioController.playSuccess();
    };

    // 1. Subscribe to Firestore
    useEffect(() => {
        const unsub = subscribeToLottery((data) => setSession(data));
        const unsubMembers = onSnapshot(collection(db, "users"), (snap) => {
             setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsub(); unsubMembers(); };
    }, []);

    // 2. Sync & Animation Logic
    useEffect(() => {
        if (!session) return;
        
        setIsLocked(session.status === 'rolling' || session.status === 'checking');

        // Auto-show Global Results when finished
        if (session.status === 'finished') {
             // If we haven't shown results automatically yet, show them?
             // Since this runs on every session update, we need to be careful not to reopen if user closed it.
             // But for now, ensuring it is open when status flips to finished is good.
             // We can check if we just transitioned. For simplicity, just sync if not closed explicitly (not tracking explicit close here yet).
             // Let's just allow the button to open it. Auto-open logic might be annoying if it pops up on refresh.
             // But user asked to show window. Let's make sure button works first.
             // To support auto-popup once, we could use a ref to track prev status, but simpler:
             if (!showResultsModal && !sessionStorage.getItem('results_shown_' + session.sessionId)) {
                  setShowResultsModal(true);
                  sessionStorage.setItem('results_shown_' + session.sessionId, 'true');
             }
             
             setIsSpinning(false);
             setShowCelebration(false);
        }

        if (session.status === 'rolling') {
             setIsSpinning(true);
             setShowCelebration(false);
             setTargetDigits(['?','?','?','?','?']); 
             play('magic');
        }
        else if (session.status === 'revealed' && session.lastWinner) {
             const idStr = (session.lastWinner.name.match(/#(\d+)$/)?.[1] || "00000").split('');
             setTargetDigits(idStr);
             setIsSpinning(true);
        }
        else if (session.status !== 'finished') {
            setIsSpinning(false);
            setShowCelebration(false);
            setTargetDigits(['?','?','?','?','?']);
        }
    }, [session?.status, session?.updatedAt, session?.sessionId]);

    const onSpinFinish = () => {
        if (session?.status === 'revealed') {
            setIsSpinning(false); // Stop loop if any
            setShowCelebration(true);
            play('success');
            if (session.lastWinner) {
                 play('speak', `Победитель! ${session.lastWinner.name.split('#')[0]}`);
            }
        }
    };

    // --- ACTIONS ---
    const handleCheck = async () => { if (isAdmin && session) await adminStartCheck(members); setTimeout(() => adminSetReady(), 3000); };
    const handleRoll = async () => { if (isAdmin && session) { await adminStartRoll(); setTimeout(() => adminPickWinner(), 4000); } };
    const handleNext = async () => { if (isAdmin && session) await adminNextStage(); };
    const handleReset = async () => { 
        if (isAdmin && session) {
            await adminResetSession(session.operatorName || "Admin");
            setShowResultsModal(false);
            setShowStageModal(false);
            sessionStorage.removeItem('results_shown_' + session.sessionId);
        }
    };

    if (!session) return <div className="h-full flex items-center justify-center text-white">Loading Session...</div>;

    const tierData = session.stages[session.currentTier.toString()];
    const currentWinnersCount = TIER_WINNERS_COUNT[session.currentTier];
    const winnersFound = tierData?.winners.length || 0;
    const isStageDone = tierData?.status === 'done';
    const isBonusStage = isBonus(session.currentTier);
    
    const canRoll = session.status !== 'finished' && (session.status === 'ready' || (session.status === 'revealed' && winnersFound < currentWinnersCount && !isSpinning));
    
    // "Can Show Results" means the stage is theoretically complete (all winners found) but we haven't clicked next yet.
    // Or if the stage is already marked done in DB.
    const allWinnersFound = winnersFound >= currentWinnersCount;
    const canFinishStage = session.status !== 'finished' && (allWinnersFound || isStageDone);

    // --- LAYOUT ---
    return (
        <div className="h-full w-full grid grid-cols-[300px_1fr_300px] gap-4 p-4 overflow-hidden relative">
            
            {/* STAGE RESULTS POPUP (After all winners found) */}
            {showStageModal && (
                <StageResultsModal 
                    tier={session.currentTier}
                    winners={tierData.winners}
                    reward={tierData.reward}
                    onClose={() => setShowStageModal(false)}
                />
            )}

            {/* GLOBAL RESULTS (End of event) */}
            {showResultsModal && session && (
                <WinnersModal 
                    session={session} 
                    onClose={() => setShowResultsModal(false)} 
                    onReset={handleReset}
                    isAdmin={isAdmin}
                />
            )}

            {/* Test Mode Banner Overlay */}
            {!session.isOfficial && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white px-6 py-1 rounded-b-xl shadow-lg border border-red-500/50 backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-top-full duration-500">
                    <ShieldAlert size={16} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">ТЕСТОВЫЙ РЕЖИМ • РЕЗУЛЬТАТЫ НЕДЕЙСТВИТЕЛЬНЫ</span>
                </div>
            )}

            {/* LEFT COLUMN: ALLOWED */}
            <div className="h-full min-h-0 flex flex-col animate-in slide-in-from-left-4 duration-500">
                <GarlandBorder color={isBonusStage ? "red" : "green"} title={`ДОПУЩЕНО: ${session.allowed.length}`} icon={Check}>
                    {session.allowed.map((m, i) => (
                         <div key={m.id} className="flex items-center gap-3 bg-[#112520]/40 border border-white/5 px-3 py-2 rounded-lg hover:bg-[#112520]/60 transition-colors group">
                             <div className="w-6 h-6 rounded-md bg-green-500/10 flex items-center justify-center text-[10px] text-green-500 font-bold font-mono group-hover:bg-green-500/20">{i + 1}</div>
                             <div className="flex-1 min-w-0">
                                 <div className="truncate text-sm font-bold text-slate-200">{m.name.split('#')[0]}</div>
                                 <div className="text-[10px] text-slate-500 font-mono">{m.name.match(/#(\d+)$/)?.[0] || 'ID error'}</div>
                             </div>
                         </div>
                    ))}
                    {session.allowed.length === 0 && <div className="text-center text-xs text-slate-600 mt-10">Список пуст</div>}
                </GarlandBorder>
            </div>

            {/* CENTER COLUMN: ARENA */}
            <div className="h-full min-h-0 flex flex-col gap-4">
                
                {/* Main Arena Card */}
                <div className={`flex-1 relative rounded-3xl border bg-gradient-to-b from-[#1a0f0f] to-[#0a0505] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ${!session.isOfficial ? 'border-red-500/20' : 'border-amber-500/20'}`}>
                    {/* Background FX */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                    <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-${!session.isOfficial ? 'red' : 'amber'}-500/50 to-transparent`}></div>

                    {/* Arena Header */}
                    <div className="relative z-10 p-6 flex items-start justify-between">
                         <div>
                             <div className="flex items-center gap-3 mb-1">
                                 <Crown className={!session.isOfficial ? "text-slate-500" : "text-amber-500 fill-amber-500/20"} size={24} />
                                 <h2 className={`text-3xl font-black italic tracking-tighter uppercase drop-shadow-md ${!session.isOfficial ? 'text-slate-500' : 'text-white'}`}>RNG ARENA</h2>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded border ${session.status === 'rolling' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                    {session.status}
                                </span>
                                {!session.isOfficial && <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">TEST</span>}
                             </div>
                         </div>

                         <div className="flex flex-col items-end gap-2">
                             <div className="flex items-center gap-2">
                                <CountdownTimer />
                                <MoscowClock />
                             </div>
                             <div className="text-right">
                                 <div className={`text-4xl font-black text-transparent bg-clip-text leading-none ${isBonusStage ? 'bg-gradient-to-b from-purple-300 to-purple-600' : 'bg-gradient-to-b from-amber-300 to-amber-600'}`}>
                                     {getTierLabel(session.currentTier)}
                                 </div>
                                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                     Призовой фонд: <span className="text-cyan-400">{TIER_REWARDS[session.currentTier]} 💎</span>
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* Slot Machine Area - BOOSTED Z-INDEX TO 30 */}
                    <div className="flex-1 flex flex-col items-center justify-center relative z-30 pb-10">
                        {session.status === 'idle' || session.status === 'checking' ? (
                            <div className="text-center animate-in fade-in zoom-in duration-500">
                                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center border mb-4 shadow-[0_0_30px_rgba(251,191,36,0.1)] ${!session.isOfficial ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                    <Gift size={48} className={!session.isOfficial ? "text-slate-600" : "text-amber-500"} />
                                </div>
                                <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">
                                    {session.status === 'checking' ? "Синхронизация..." : "Ожидание запуска"}
                                </h3>
                                <p className="text-xs text-slate-500 mt-2 font-mono">
                                    {!session.isOfficial ? "Режим тестирования механик" : "Официальный розыгрыш"}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-8">
                                <SlotMachine 
                                    targetIds={targetDigits} 
                                    isSpinning={isSpinning}
                                    onFinish={onSpinFinish}
                                />
                                
                                <div className={`h-16 flex items-center justify-center transition-all duration-500 ${showCelebration ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                                    {session.lastWinner && (
                                        <div className="text-center">
                                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-bounce">
                                                {session.lastWinner.name.split('#')[0]}
                                            </div>
                                            <div className="text-[10px] text-amber-500/50 font-mono uppercase tracking-[0.5em] mt-1">
                                                WINNER CONFIRMED
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    {isAdmin && (
                        <div className="absolute bottom-0 inset-x-0 p-4 border-t border-white/5 bg-black/40 backdrop-blur-md flex justify-center gap-4 z-20">
                            {session.status === 'idle' && (
                                <button onClick={handleCheck} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl uppercase tracking-widest text-xs shadow-lg transition-transform active:scale-95">
                                    Проверить {isBonusStage ? "BONUS" : "Этап"}
                                </button>
                            )}
                            
                            {/* Roll Button */}
                            {canRoll && (
                                <button onClick={handleRoll} className="px-12 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold rounded-xl uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-transform active:scale-95 flex items-center gap-2">
                                    <Play size={16} fill="currentColor" /> {session.status === 'revealed' ? "След. Победитель" : "РОЗЫГРЫШ"}
                                </button>
                            )}
                            
                            {/* RESULTS / NEXT TIER LOGIC */}
                            {canFinishStage && (
                                <>
                                    {/* 1. Show Results first if just finished */}
                                    <button onClick={() => setShowStageModal(true)} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl uppercase tracking-widest text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                                        <List size={16} /> Итоги Этапа
                                    </button>

                                    {/* 2. Then allow Next */}
                                    <button onClick={handleNext} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl uppercase tracking-widest text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                                        {isBonusStage ? "Финал: Общие Итоги" : "Завершить Этап"} <ChevronRight size={16} />
                                    </button>
                                </>
                            )}

                            {/* Re-open Results Button (If Finished) */}
                            {session.status === 'finished' && (
                                <button onClick={() => setShowResultsModal(true)} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl uppercase tracking-widest text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                                    <List size={16} /> Показать Итоги
                                </button>
                            )}

                            {/* ALWAYS AVAILABLE RESET BUTTON FOR ADMINS (If not idle) */}
                            {session.status !== 'idle' && (
                                <button 
                                    onClick={() => { if(confirm("СБРОСИТЬ СЕССИЮ?")) handleReset() }}
                                    className="px-4 py-3 bg-red-900/50 hover:bg-red-900 text-red-200 font-bold rounded-xl uppercase text-xs border border-red-500/30 transition-colors ml-4"
                                    title="Сброс / Рестарт"
                                >
                                    <RotateCcw size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Strip */}
                <div className="h-[120px] shrink-0 w-full relative z-10 bg-[#0a0505]/50 rounded-xl border border-white/5 p-2 backdrop-blur-sm">
                    <TierWinnersStrip stages={session.stages} currentTier={session.currentTier} />
                </div>
            </div>

            {/* RIGHT COLUMN: REJECTED/WINNERS */}
            <div className="h-full min-h-0 flex flex-col animate-in slide-in-from-right-4 duration-500">
                <GarlandBorder color={isBonusStage ? "red" : "green"} title={`ИСКЛЮЧЕНИЯ: ${session.rejected.length}`} icon={AlertCircle}>
                    {session.rejected.map((m, i) => (
                        <div key={i} className={`flex flex-col border px-3 py-2 rounded-lg mb-1.5 ${m.reason === 'WINNER' ? 'bg-amber-900/10 border-amber-500/30' : 'bg-[#1a0505]/60 border-white/5'}`}>
                            <div className="flex justify-between items-center mb-0.5">
                                <span className={`text-sm font-bold truncate ${m.reason === 'WINNER' ? 'text-amber-200' : 'text-slate-300'}`}>{m.name.split('#')[0]}</span>
                                {m.reason === 'WINNER' ? <Trophy size={12} className="text-amber-500" /> : <AlertCircle size={12} className="text-red-500" />}
                            </div>
                            <span className={`text-[9px] uppercase font-bold tracking-wide ${m.reason === 'WINNER' ? 'text-amber-500' : 'text-red-500/70'}`}>
                                {m.reason === 'WINNER' ? 'ПОБЕДИТЕЛЬ' : m.reason}
                            </span>
                        </div>
                    ))}
                     {session.rejected.length === 0 && <div className="text-center text-xs text-slate-600 mt-10">Список пуст</div>}
                </GarlandBorder>
            </div>

        </div>
    );
}
