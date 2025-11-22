
export interface GuildMember {
    id: string;
    name: string;
    investments: number; // Вложения
    startScore: number; // Промежуточный замер
    endScore: number;   // Итоговый замер
    reward: string;     // Поле 15 - 125G (Custom/Reward)
}

export interface LotterySettings {
    numberOfWinners: number;
    weightedByScore: boolean; // If true, higher difference = higher chance
    timerSeconds: number;
}

export interface LotteryResult {
    winners: GuildMember[];
    timestamp: string;
}

export type TabView = 'members' | 'stats' | 'lottery';
