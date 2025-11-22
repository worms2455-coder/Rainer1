import React, { useState, useMemo } from 'react';
import { Roulette, Participant } from './Roulette';
import { Trophy, Users, Percent, Sparkles, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const STAGES = [
  { threshold: 15, prize: "120 💎", count: 3, title: "НОВИЧОК" },
  { threshold: 25, prize: "180 💎", count: 2, title: "ЛЮБИТЕЛЬ" },
  { threshold: 50, prize: "400 💎", count: 1, title: "ОПЫТНЫЙ" },
  { threshold: 75, prize: "600 💎", count: 1, title: "ГРАНД-МАСТЕР" },
  { threshold: 100, prize: "900 💎", count: 1, title: "ЭЛИТА" },
  { threshold: 125, prize: "2000 💎", count: 1, title: "ЛЕГЕНДА" },
];

// Функция очистки очков
const getCleanScore = (p: Participant): number => {
  if (typeof p.score === 'number') return p.score;
  const cleanString = String(p.score).replace(/[^0-9]/g, '');
  return parseInt(cleanString, 10) || 0;
};

export const ContestManager: React.FC<{ allParticipants: Participant[] }> = ({ allParticipants }) => {
  const [stageIdx, setStageIdx] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnersFound, setWinnersFound] = useState(0);

  const stage = STAGES[stageIdx];
  const isFinished = stageIdx >= STAGES.length;

  // --- УМНАЯ ФИЛЬТРАЦИЯ ---
  const eligible = useMemo(() => {
    if (isFinished) return [];
    
    return allParticipants.filter(p => {
      const realScore = getCleanScore(p);
      
      // 1. Проверка по очкам
      const passesThreshold = realScore >= stage.threshold;

      // 2. Проверка: не выигрывал ли он УЖЕ в ЭТОМ конкретном этапе?
      const alreadyWonThisStage = history.some(
        h => h.name === p.name && h.stage === `${stage.threshold}G`
      );

      return passesThreshold && !alreadyWonThisStage;
    });
  }, [allParticipants, stage, isFinished, history]);

  const excludedCount = allParticipants.length - eligible.length;
  const winChance = eligible.length > 0 ? (100 / eligible.length) : 0;

  const handleSpin = () => {
    if (!eligible.length) return alert("Нет доступных участников для этого приза!");
    const randomWin = eligible[Math.floor(Math.random() * eligible.length)];
    setWinner(randomWin);
    setIsSpinning(true);
  };

  const handleComplete = () => {
    setIsSpinning(false);
    if (!winner) return;

    triggerConfetti();

    setHistory(prev => [...prev, { 
      stage: `${stage.threshold}G`, 
      name: winner.name, 
      prize: stage.prize,
      score: getCleanScore(winner)
    }]);

    if (winnersFound + 1 < stage.count) {
      setWinnersFound(prev => prev + 1);
    } else {
      setTimeout(() => {
        setWinnersFound(0);
        setStageIdx(prev => prev + 1);
      }, 2000);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#8b5cf6', '#ffffff']
    });
  };

  if (isFinished) return (
    <div className="bg-guild-800 p-8 rounded-xl border-2 border-green-500 max-w-4xl mx-auto shadow-2xl text-center animate-fade-in">
      <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4 animate-bounce" />
      <h2 className="text-3xl text-green-400 mb-6 font-bold">🏆 ВСЕ ЭТАПЫ ЗАВЕРШЕНЫ</h2>
      <div className="grid grid-cols-1 gap-2 text-left">
        {history.map((h, i) => (
          <div key={i} className="bg-guild-900 p-4 rounded-lg flex justify-between items-center border border-guild-700 hover:border-green-500/50 transition-colors">
             <div className="flex items-center gap-3">
               <span className="text-guild-accent font-mono font-bold w-16">{h.stage}</span>
               <span className="text-white font-bold text-lg">{h.name}</span>
             </div>
             <span className="text-yellow-400 font-bold">{h.prize}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Инфо-панель */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-900 to-guild-900 p-5 rounded-xl border border-blue-700 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
             <div className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
               <Sparkles className="w-3 h-3" /> {stage.title}
             </div>
             <div className="text-5xl font-black text-white">{stage.threshold}<span className="text-3xl text-blue-400">G</span></div>
             <div className="mt-2 text-blue-200 bg-black/20 inline-block px-3 py-1 rounded-lg border border-blue-500/30">
                Приз: <span className="text-yellow-400 font-bold">{stage.prize}</span>
             </div>
          </div>
          <div className="absolute -right-4 -bottom-4 text-9xl text-blue-500 opacity-5 font-black select-none">G</div>
        </div>

        <div className="bg-guild-800 p-5 rounded-xl border border-guild-700 flex flex-col justify-center relative overflow-hidden">
          <div className="text-gray-400 text-xs uppercase mb-2 flex items-center gap-2">
             <Trophy className="w-3 h-3" /> Прогресс этапа
          </div>
          <div className="flex items-end gap-2 z-10">
            <span className="text-4xl font-bold text-yellow-500">{winnersFound}</span>
            <span className="text-xl text-gray-500 mb-1">/ {stage.count}</span>
          </div>
          <div className="w-full bg-guild-900 h-2 rounded-full mt-3 overflow-hidden border border-guild-700 z-10">
            <div 
              className="bg-yellow-500 h-full transition-all duration-500" 
              style={{ width: `${(winnersFound / stage.count) * 100}%` }}
            ></div>
          </div>
          <Trophy className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-yellow-500/5" />
        </div>

        <div className="bg-guild-800 p-5 rounded-xl border border-guild-700 flex flex-col justify-center relative">
           <div className="flex justify-between items-center mb-1">
             <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Допущены</span>
             <span className="text-3xl text-white font-bold">{eligible.length}</span>
           </div>
           <div className="w-full bg-guild-700 h-px my-2"></div>
           <div className="flex justify-between items-center">
             <span className="text-red-400 text-xs">Не прошли / Выиграли</span>
             <span className="text-lg text-gray-500 font-mono">{excludedCount}</span>
           </div>
           <AlertCircle className="absolute right-2 top-2 w-4 h-4 text-guild-700" />
        </div>
      </div>

      {/* Рулетка */}
      <Roulette participants={eligible} winner={winner} isSpinning={isSpinning} onSpinComplete={handleComplete} />

      <div className="flex justify-center">
        <button 
          onClick={handleSpin} 
          disabled={isSpinning || eligible.length === 0} 
          className={`
            relative overflow-hidden px-16 py-5 rounded-2xl text-2xl font-bold uppercase tracking-widest shadow-2xl transition-all transform
            ${isSpinning || eligible.length === 0
              ? 'bg-guild-800 text-gray-600 cursor-not-allowed border border-guild-700' 
              : 'bg-gradient-to-r from-guild-accent to-indigo-600 text-white hover:scale-105 hover:shadow-indigo-500/30 ring-1 ring-indigo-400/50'
            }
          `}
        >
          <span className="relative z-10 flex items-center gap-3">
            {isSpinning ? 'Вращаем...' : 'Разыграть приз'}
            {!isSpinning && <Sparkles className="w-5 h-5 text-yellow-300" />}
          </span>
        </button>
      </div>

      {/* Таблица шансов (NEW FEATURE) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Table */}
        <div className="lg:col-span-2 bg-guild-800 rounded-xl border border-guild-700 overflow-hidden shadow-lg">
            <div className="p-4 border-b border-guild-700 bg-guild-900/50 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Percent className="w-5 h-5 text-guild-accent" />
                    Шансы на победу в раунде
                </h3>
                <span className="text-xs bg-guild-900 text-gray-400 px-2 py-1 rounded border border-guild-700">
                    Всего: {eligible.length}
                </span>
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {eligible.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Нет участников для этого этапа</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-guild-900 text-gray-400 sticky top-0">
                            <tr>
                                <th className="p-3 font-medium border-b border-guild-700">Участник</th>
                                <th className="p-3 font-medium text-center border-b border-guild-700">Лимит</th>
                                <th className="p-3 font-medium border-b border-guild-700 w-2/5">Вероятность</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-guild-700/50">
                            {eligible.map((p) => (
                                <tr key={p.id} className="hover:bg-guild-700/30 transition-colors">
                                    <td className="p-3 text-white font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded bg-guild-700 flex items-center justify-center text-xs text-gray-300">
                                                {p.name[0]}
                                            </div>
                                            {p.name}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="bg-guild-900 px-2 py-1 rounded text-xs font-mono text-gray-300 border border-guild-700">
                                            {getCleanScore(p)}G
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-guild-900 rounded-full overflow-hidden border border-guild-800">
                                                <div 
                                                    className="h-full bg-guild-accent rounded-full"
                                                    style={{ width: `${Math.max(winChance, 2)}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-guild-accent w-12 text-right">
                                                {winChance.toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* Right: History */}
        <div className="bg-guild-800 rounded-xl border border-guild-700 overflow-hidden shadow-lg">
             <div className="p-4 border-b border-guild-700 bg-guild-900/50">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    История побед
                </h3>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                {history.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">Пока нет победителей</p>
                )}
                {history.slice().reverse().map((h, i) => (
                    <div key={i} className="flex justify-between items-center bg-guild-900/50 p-3 rounded border border-guild-700/50">
                        <div>
                            <div className="text-white font-bold text-sm">{h.name}</div>
                            <div className="text-[10px] text-gray-500 uppercase">{h.stage}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-yellow-400 font-bold text-sm">{h.prize}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
