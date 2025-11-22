import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

export interface Participant {
  id: string | number;
  name: string;
  score: number; // Лимит участия
  avatar?: string;
}

interface RouletteProps {
  participants: Participant[];
  winner: Participant | null;
  isSpinning: boolean;
  onSpinComplete: () => void;
}

const CARD_WIDTH = 180;
const GAP = 12;
const SPIN_DURATION = 8; // Время вращения в секундах
const WINNER_INDEX = 75; // Индекс победителя в ленте

export const Roulette: React.FC<RouletteProps> = ({ participants, winner, isSpinning, onSpinComplete }) => {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tape, setTape] = useState<Participant[]>([]);
  
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isSpinning) {
      setIsFinished(false);
    }
    
    if (isSpinning && winner && participants.length > 0) {
      // Генерируем ленту
      const buffer = Array.from({ length: WINNER_INDEX }).map(() => 
        participants[Math.floor(Math.random() * participants.length)]
      );
      
      const newTape = [...buffer, winner, ...participants.slice(0, 5)];
      setTape(newTape);

      spinToWinner();
    }
  }, [isSpinning, winner]);

  const spinToWinner = async () => {
    if (!containerRef.current) return;

    await controls.set({ x: 0 });

    const containerWidth = containerRef.current.offsetWidth;
    const cardFullWidth = CARD_WIDTH + GAP;
    
    // Целевая позиция
    const targetX = -1 * (WINNER_INDEX * cardFullWidth) + (containerWidth / 2) - (CARD_WIDTH / 2);
    const randomOffset = (Math.random() * (CARD_WIDTH * 0.6)) - (CARD_WIDTH * 0.3);

    await controls.start({
      x: targetX + randomOffset,
      transition: { 
        duration: SPIN_DURATION, 
        ease: [0.15, 0.85, 0.35, 1] 
      },
    });

    setIsFinished(true);
    onSpinComplete();
  };

  if (!isSpinning && !winner && !isFinished) {
    return (
      <div className="w-full h-52 bg-gray-900 rounded-xl border border-gray-700 flex items-center justify-center text-gray-500">
        Ожидание старта...
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto mb-8 h-52 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden shadow-2xl" ref={containerRef}>
      <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-yellow-500 z-30 transform -translate-x-1/2 shadow-[0_0_15px_rgba(234,179,8,0.8)]"></div>
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-yellow-500 z-30 text-2xl drop-shadow-md">▼</div>

      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-gray-900 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-gray-900 to-transparent z-20 pointer-events-none"></div>

      <motion.div 
        className="flex items-center h-full px-4" 
        initial={{ x: 0 }} 
        animate={controls}
      >
        {tape.map((p, i) => {
          const isWinnerCard = isFinished && i === WINNER_INDEX;
          
          return (
            <div 
              key={i} 
              className={`flex-shrink-0 relative rounded-lg flex flex-col items-center justify-center border-2 transition-all duration-500
                ${isWinnerCard 
                  ? 'border-yellow-500 bg-yellow-900/30 shadow-[0_0_30px_rgba(234,179,8,0.4)] scale-105 z-10' 
                  : 'border-gray-700 bg-gray-800'
                }`} 
              style={{ width: CARD_WIDTH, height: 160, marginRight: GAP }}
            >
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mb-2 text-lg font-bold text-gray-300 overflow-hidden">
                {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover"/> : p.name[0]}
              </div>
              
              <div className={`font-bold px-2 text-center truncate w-full ${isWinnerCard ? 'text-yellow-400' : 'text-white'}`}>
                {p.name}
              </div>
              
              <div className="text-xs text-gray-500 mt-1 bg-gray-900/50 px-2 py-1 rounded">
                Max: {p.score}G
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};