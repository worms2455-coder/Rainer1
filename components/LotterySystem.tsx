import React from 'react';
import { GuildMember } from '../types';
import { ContestManager } from './ContestManager';
import { Participant } from './Roulette';

interface LotterySystemProps {
    members: GuildMember[];
}

const LotterySystem: React.FC<LotterySystemProps> = ({ members }) => {
    
    // Функция для парсинга значения из колонки "15-125G"
    // Например: "100G" -> 100, "15" -> 15, "" -> 0
    const parseLimit = (value: string): number => {
        if (!value) return 0;
        // Удаляем всё, кроме цифр
        const numbers = value.replace(/\D/g, '');
        return numbers ? parseInt(numbers, 10) : 0;
    };

    const participants: Participant[] = members
        .map(m => {
            const limit = parseLimit(m.reward);
            return {
                id: m.id,
                name: m.name,
                score: limit // В данном контексте score - это максимальный уровень допуска (CAP)
            };
        })
        .filter(p => p.score > 0); // Исключаем тех, у кого не прописан лимит

    return (
        <div className="w-full">
            <div className="mb-8 bg-blue-900/20 border border-blue-500/20 p-4 rounded-lg">
                <p className="text-sm text-blue-200">
                    ℹ️ <strong>Правила участия:</strong> <br/>
                    Система считывает колонку <strong>"15 - 125G"</strong> как максимальный уровень допуска. 
                    <br/>
                    <span className="opacity-70">Пример: Игрок с <strong>100G</strong> участвует в розыгрышах 15, 25, 50, 75, 100, но <strong>не участвует</strong> в 125.</span>
                </p>
            </div>

            <ContestManager allParticipants={participants} />
        </div>
    );
};

export default LotterySystem;