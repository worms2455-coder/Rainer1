
import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { StageData, BONUS_TIER_LEVEL } from '../types';
import { Lock, Trophy, Loader2, User, CheckCircle2, Sparkles } from 'lucide-react';

interface TierCardProps {
    stageData: StageData;
    isActive: boolean;
}

const TierCard: React.FC<TierCardProps> = ({ stageData, isActive }) => {
    const { tier, status, winners, reward } = stageData;
    const isLocked = status === 'locked';
    const isRolling = status === 'rolling';
    const isDone = status === 'done';
    const isBonus = tier === BONUS_TIER_LEVEL;

    // Strict Limit: Max 3 winners visible
    const displayWinners = winners.slice(0, 3);

    // Styling constants
    const borderColor = isBonus ? 'border-purple-500' : 'border-amber-400';
    const activeShadow = isBonus ? 'shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-purple-900/10' : 'shadow-[0_0_15px_rgba(251,191,36,0.3)] bg-amber-900/10';
    const textColor = isBonus ? 'text-purple-400' : 'text-amber-400';
    const doneColor = isBonus ? 'text-purple-400' : 'text-emerald-400';
    const doneBg = isBonus ? 'bg-purple-500/10 border-purple-500/20' : 'bg-emerald-500/10 border-emerald-500/20';

    return (
        <div 
            className={`
                relative flex flex-col flex-shrink-0 w-[160px] h-[100px] rounded-xl border transition-all duration-300 overflow-hidden
                ${isActive ? `${borderColor} ${activeShadow}` : ''}
                ${isLocked ? 'bg-[#0f172a]/40 border-white/5 opacity-60 grayscale' : ''}
                ${isRolling ? `${isBonus ? 'bg-purple-900/20 border-purple-500' : 'bg-amber-900/20 border-amber-500'} animate-pulse` : ''}
                ${isDone ? (isBonus ? 'bg-purple-900/20 border-purple-500/50' : 'bg-emerald-900/20 border-emerald-500/50') : ''}
            `}
        >
            {/* Header */}
            <div className={`px-2 py-1.5 flex justify-between items-center border-b ${isDone ? doneBg : 'border-white/5 bg-black/20'}`}>
                <span className={`text-sm font-black italic flex items-center gap-1 ${doneColor}`}>
                    {isBonus && <Sparkles size={10} />}
                    {isBonus ? "BONUS" : `${tier}G`}
                </span>
                <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-400">{reward}💎</span>
                    {isLocked && <Lock size={10} className="text-slate-600" />}
                    {isRolling && <Loader2 size={10} className={`animate-spin ${isBonus ? 'text-purple-500' : 'text-amber-500'}`} />}
                    {isDone && <CheckCircle2 size={10} className={doneColor} />}
                </div>
            </div>

            {/* Winners Body */}
            <div className="flex-1 p-1.5 flex flex-col gap-1 overflow-hidden">
                {displayWinners.length === 0 ? (
                     <div className="h-full flex items-center justify-center">
                         {isRolling ? (
                             <span className={`text-[9px] ${isBonus ? 'text-purple-500/70' : 'text-amber-500/70'} font-mono animate-pulse`}>РОЗЫГРЫШ...</span>
                         ) : isLocked ? (
                             <span className="text-[9px] text-slate-600 font-mono">LOCKED</span>
                         ) : (
                             <span className="text-[9px] text-slate-500 font-mono">ОЖИДАНИЕ</span>
                         )}
                     </div>
                ) : (
                    displayWinners.map((winnerFull, idx) => {
                        const simpleName = winnerFull.split('#')[0];
                        return (
                            <div 
                                key={idx} 
                                className="bg-black/40 rounded px-1.5 py-0.5 border border-white/5 flex items-center gap-1.5"
                                title={winnerFull}
                            >
                                <User size={8} className={doneColor} />
                                <span className="text-[10px] font-bold text-slate-300 truncate w-full font-mono leading-none">
                                    {simpleName}
                                </span>
                            </div>
                        )
                    })
                )}
            </div>
            
            {/* Active Indicator Line */}
            {isActive && <div className={`absolute bottom-0 inset-x-0 h-0.5 ${isBonus ? 'bg-purple-500 shadow-[0_0_5px_#a855f7]' : 'bg-amber-400 shadow-[0_0_5px_#fbbf24]'}`}></div>}
        </div>
    );
};

interface TierWinnersStripProps {
    stages: Record<string, StageData>;
    currentTier: number;
}

export default function TierWinnersStrip({ stages, currentTier }: TierWinnersStripProps) {
    const sortedStages = Object.values(stages).sort((a, b) => a.tier - b.tier);

    return (
        <div className="w-full h-full flex items-center gap-3 overflow-x-auto custom-scrollbar px-1 select-none">
            {sortedStages.map((s) => (
                <TierCard key={s.tier} stageData={s} isActive={s.tier === currentTier} />
            ))}
        </div>
    );
}
