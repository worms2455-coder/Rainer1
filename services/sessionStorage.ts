import { SessionState, TierStatus, EXAMPLE_SESSION_STATE } from '../types';

const STORAGE_KEY = "rng_session_state_v1";

export const saveSessionState = (state: SessionState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Error saving session state", e);
  }
};

export const loadSessionState = (): SessionState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : EXAMPLE_SESSION_STATE;
  } catch (e) {
    console.error("Error loading session state", e);
    return EXAMPLE_SESSION_STATE;
  }
};

export const updateTierStatus = (tier: number, status: TierStatus): void => {
  const state = loadSessionState();
  const target = state.tiers.find(t => t.tier === tier);
  if (target) {
    target.status = status;
    saveSessionState(state);
  }
};

export const setTierWinners = (tier: number, winners: string[]): void => {
  const state = loadSessionState();
  const target = state.tiers.find(t => t.tier === tier);
  if (target) {
    target.winners = winners;
    saveSessionState(state);
  }
};