
import React, { useEffect, useState } from 'react';

// Generates a strip of numbers: 0 1 ... 9 0 1 ... target ...
// ensuring enough length for the spin duration
const generateStrip = (target: number, cycles: number) => {
    const base = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    let strip: number[] = [];
    for (let i = 0; i < cycles; i++) {
        strip = [...strip, ...base];
    }
    // Append final sequence ending in target
    strip = [...strip, ...base.slice(0, target + 1)];
    return strip;
};

interface SlotDigitProps {
    target: string;
    isSpinning: boolean;
    index: number;
}

const SlotDigit: React.FC<SlotDigitProps> = ({ target, isSpinning, index }) => {
    const digitHeight = 112; // h-28 = 7rem = 112px (approx) adjust based on container
    const cycles = 5 + index * 2; // Staggered cycles
    const targetNum = parseInt(target) || 0;
    const isQuestion = target === '?';
    
    // If it's '?', we show a static question mark or a slow drift. 
    // If spinning, we move to the target index.
    
    // We calculate total items in strip
    // If target is 5 and cycles is 10: length is roughly 100+ items.
    // We translate Y to -(totalItems - 1) * height
    
    const strip = generateStrip(targetNum, isSpinning ? cycles : 0);
    const finalIndex = strip.length - 1;
    
    const style = {
        transform: isSpinning 
            ? `translateY(-${finalIndex * 100}%)` 
            : (isQuestion ? 'translateY(0)' : `translateY(-${finalIndex * 100}%)`), // Keep at target if not spinning but revealed
        transition: isSpinning 
            ? `transform ${2 + index * 0.4}s cubic-bezier(0.25, 1, 0.5, 1)` 
            : 'none'
    };

    if (isQuestion && !isSpinning) {
        return (
             <div className="w-20 h-28 md:w-24 md:h-32 lg:w-28 lg:h-36 bg-[#1a0b0b] rounded-xl border-2 border-amber-500/20 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden relative z-20">
                 {/* Gradient behind text */}
                 <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none z-10"></div>
                 
                 <div className="relative z-30 text-5xl font-black text-amber-500/50 animate-pulse drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">?</div>
             </div>
        );
    }

    return (
        <div className="w-20 h-28 md:w-24 md:h-32 lg:w-28 lg:h-36 bg-[#1a0b0b] rounded-xl border-2 border-amber-500/50 flex flex-col items-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden relative z-20">
            {/* Overlay z-10 (BEHIND DIGITS) */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-transparent to-black/90 pointer-events-none z-10"></div>

            <div 
                className="w-full flex flex-col items-center relative z-30" 
                style={{ 
                    ...style, 
                    // We use percentage here assuming parent height is fixed
                }}
            >
                {/* Pre-render the strip */}
                {strip.map((num, i) => (
                    <div key={i} className="h-28 md:h-32 lg:h-36 w-full flex items-center justify-center shrink-0">
                         {/* High Contrast Digits */}
                         <span className="text-6xl md:text-7xl lg:text-8xl font-black text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] opacity-100 filter-none">
                             {num}
                         </span>
                    </div>
                ))}
            </div>
            
            {/* Glass Overlays / Shine on top (z-40) - Subtle */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-amber-500/40 z-40 shadow-[0_0_8px_#fbbf24]"></div>
        </div>
    );
};

export default function SlotMachine({ targetIds, isSpinning, onFinish }: { targetIds: string[], isSpinning: boolean, onFinish?: () => void }) {
    
    // Detect when spin finishes (max duration)
    useEffect(() => {
        if (isSpinning) {
            const maxDuration = (2 + (targetIds.length - 1) * 0.4) * 1000;
            const t = setTimeout(() => {
                if (onFinish) onFinish();
            }, maxDuration + 500); // Buffer
            return () => clearTimeout(t);
        }
    }, [isSpinning, targetIds, onFinish]);

    return (
        <div className="flex gap-2 md:gap-4 perspective-[1000px] relative z-30">
            {targetIds.map((digit, i) => (
                <SlotDigit key={i} index={i} target={digit} isSpinning={isSpinning} />
            ))}
        </div>
    );
}
