
export type TierStatus = 'locked' | 'rolling' | 'done';

export interface TierState {
  tier: number;
  winnersCount: number;
  reward: number;
  winners: string[]; // Stores simple names like "Nick"
  status: TierStatus;
}

export interface SessionState {
  currentTier: number;
  tiers: TierState[];
  startedAt: number;
}

// --- REAL-TIME FIRESTORE TYPES ---

export type LotteryStatus = 'idle' | 'checking' | 'ready' | 'rolling' | 'revealed' | 'finished';
export type SessionValidity = 'TEST' | 'OFFICIAL';

export interface Participant {
  id: string;
  name: string; // "Nick#1234"
  diff: number; // Contribution difference
}

export interface RejectedParticipant extends Participant {
  reason: string; // "Winner", "< 15G", etc.
}

export interface StageData {
  tier: number;
  winnersCount: number;
  reward: number;
  status: TierStatus;
  winners: string[]; // Array of full names "Nick#1234"
}

export interface LotterySession {
  sessionId: string;
  status: LotteryStatus; // Global status of the flow
  currentTier: number; // 15, 25, 50...
  
  // Time-Gate & Validation
  isOfficial: boolean;
  validity: SessionValidity;
  officialStartTimestamp: number; // The logic timestamp used for validation

  // Pools
  allowed: Participant[];
  rejected: RejectedParticipant[];
  
  // Map of stages: keys "15", "25", etc.
  stages: Record<string, StageData>;
  
  // UI Sync
  lastWinner: Participant | null; // The most recent winner for the "Reveal" animation
  updatedAt: number;
  operatorName?: string;
}

export const BONUS_TIER_LEVEL = 999; // Internal ID for Bonus Stage

export const TIERS_CONFIG = [15, 25, 50, 75, 100, 125, BONUS_TIER_LEVEL];

export const TIER_REWARDS: Record<number, number> = { 
    15: 120, 
    25: 180, 
    50: 400, 
    75: 600, 
    100: 900, 
    125: 2000,
    [BONUS_TIER_LEVEL]: 690 
};

export const TIER_WINNERS_COUNT: Record<number, number> = { 
    15: 3, 
    25: 2, 
    50: 1, 
    75: 1, 
    100: 1, 
    125: 1,
    [BONUS_TIER_LEVEL]: 2
};

export const INITIAL_STAGES_CONFIG: Record<string, StageData> = {
  "15": { tier: 15, winnersCount: 3, reward: 120, status: 'locked', winners: [] },
  "25": { tier: 25, winnersCount: 2, reward: 180, status: 'locked', winners: [] },
  "50": { tier: 50, winnersCount: 1, reward: 400, status: 'locked', winners: [] },
  "75": { tier: 75, winnersCount: 1, reward: 600, status: 'locked', winners: [] },
  "100": { tier: 100, winnersCount: 1, reward: 900, status: 'locked', winners: [] },
  "125": { tier: 125, winnersCount: 1, reward: 2000, status: 'locked', winners: [] },
  [BONUS_TIER_LEVEL.toString()]: { tier: BONUS_TIER_LEVEL, winnersCount: 2, reward: 690, status: 'locked', winners: [] },
};

export const EXAMPLE_SESSION_STATE: SessionState = {
  currentTier: 15,
  tiers: [
      { tier: 15, winnersCount: 3, reward: 120, winners: [], status: 'locked' },
      { tier: 25, winnersCount: 2, reward: 180, winners: [], status: 'locked' },
      { tier: 50, winnersCount: 1, reward: 400, winners: [], status: 'locked' },
      { tier: 75, winnersCount: 1, reward: 600, winners: [], status: 'locked' },
      { tier: 100, winnersCount: 1, reward: 900, winners: [], status: 'locked' },
      { tier: 125, winnersCount: 1, reward: 2000, winners: [], status: 'locked' },
      { tier: BONUS_TIER_LEVEL, winnersCount: 2, reward: 690, winners: [], status: 'locked' }
  ],
  startedAt: Date.now()
};
