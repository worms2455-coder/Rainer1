
import { getFirestore, doc, onSnapshot, runTransaction, setDoc, serverTimestamp, updateDoc, collection, addDoc } from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import { LotterySession, Participant, RejectedParticipant, INITIAL_STAGES_CONFIG, TIERS_CONFIG, TIER_WINNERS_COUNT, BONUS_TIER_LEVEL } from "../types";

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
const SESSION_DOC_ID = "ACTIVE";

// --- TIME GATE CONFIGURATION ---
// 01.01.2026 21:00:00 MSK (UTC+3)
// ISO: 2026-01-01T21:00:00+03:00
export const OFFICIAL_START_DATE_ISO = "2026-01-01T21:00:00+03:00";
export const OFFICIAL_START_TIMESTAMP = new Date(OFFICIAL_START_DATE_ISO).getTime();

// --- SUBSCRIPTION ---
export const subscribeToLottery = (callback: (data: LotterySession | null) => void) => {
    return onSnapshot(doc(db, "lotterySessions", SESSION_DOC_ID), (snap) => {
        if (snap.exists()) {
            callback(snap.data() as LotterySession);
        } else {
            callback(null);
        }
    });
};

// --- ADMIN ACTIONS ---

// 1. Initialize/Reset Session with Time-Gate Logic
export const adminResetSession = async (operatorName: string) => {
    // In a real cloud function, we would use admin.firestore.Timestamp.now()
    // Here we use Date.now() but rely on the logic being trusted for the 'validity' field
    const now = Date.now();
    const isOfficial = now >= OFFICIAL_START_TIMESTAMP;
    
    const newSession: LotterySession = {
        sessionId: Math.random().toString(36).substring(2, 10).toUpperCase(),
        status: 'idle',
        currentTier: 15,
        allowed: [],
        rejected: [],
        stages: JSON.parse(JSON.stringify(INITIAL_STAGES_CONFIG)), // Deep copy
        lastWinner: null,
        updatedAt: now,
        operatorName,
        // Time Gate Fields
        officialStartTimestamp: now,
        isOfficial: isOfficial,
        validity: isOfficial ? 'OFFICIAL' : 'TEST'
    };
    
    await setDoc(doc(db, "lotterySessions", SESSION_DOC_ID), newSession);
};

// 2. Start Checking (Populate Lists)
export const adminStartCheck = async (allMembers: any[]) => {
    const ref = doc(db, "lotterySessions", SESSION_DOC_ID);
    
    await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(ref);
        if (!sfDoc.exists()) throw "Session does not exist!";
        
        const session = sfDoc.data() as LotterySession;
        const currentTier = session.currentTier;
        
        // Calculate pools
        const allowed: Participant[] = [];
        const rejected: RejectedParticipant[] = [];
        
        // Helper to calc diff
        const getDiff = (m:any) => {
             const hasFinal = m.final !== null && m.final !== undefined && m.final !== "";
             const hasIntermediate = m.intermediate !== null && m.intermediate !== undefined && m.intermediate !== "";
             const cur = hasFinal ? Number(m.final) : (hasIntermediate ? Number(m.intermediate) : Number(m.base));
             const base = Number(m.base) || 0;
             return Math.max(0, cur - base);
        };
        
        // Gather previous winners if Bonus Stage
        const previousWinners = new Set<string>();
        if (currentTier === BONUS_TIER_LEVEL) {
            Object.values(session.stages).forEach(stage => {
                if (stage.tier !== BONUS_TIER_LEVEL) {
                    stage.winners.forEach(name => {
                        // Extract ID from name if stored as "Nick#1234", otherwise matching might be tricky
                        // Assuming members array has full names match or IDs.
                        // Best way: Store IDs in winners, but currently we store Names.
                        // We will match by Name since that is what is stored in stages.
                        previousWinners.add(name);
                    });
                }
            });
        }
        
        // Determine Threshold
        // For Bonus, threshold is 15G (same as lowest tier)
        const targetG = (currentTier === BONUS_TIER_LEVEL ? 15 : currentTier) * 1_000_000_000;
        
        allMembers.forEach(m => {
             const diff = getDiff(m);
             const p: Participant = { id: m.id, name: m.name, diff };
             
             if (!m.name.includes("#")) {
                 rejected.push({ ...p, reason: "Нет ID" });
             } else if (diff < targetG) {
                 rejected.push({ ...p, reason: `< ${currentTier === BONUS_TIER_LEVEL ? '15' : currentTier}G` });
             } else {
                 // Eligibility Logic
                 if (currentTier === BONUS_TIER_LEVEL) {
                     // Check if already won
                     if (previousWinners.has(m.name)) {
                         rejected.push({ ...p, reason: "Уже выиграл" });
                     } else {
                         allowed.push(p);
                     }
                 } else {
                     // Standard Tier Logic
                     allowed.push(p);
                 }
             }
        });
        
        // Sort allowed by diff desc
        allowed.sort((a,b) => b.diff - a.diff);

        transaction.update(ref, {
            status: 'checking',
            allowed,
            rejected
        });
    });
};

// 3. Confirm Check Done -> Ready
export const adminSetReady = async () => {
    await updateDoc(doc(db, "lotterySessions", SESSION_DOC_ID), {
        status: 'ready'
    });
};

// 4. Start Rolling (Visuals)
export const adminStartRoll = async () => {
    const ref = doc(db, "lotterySessions", SESSION_DOC_ID);
    await updateDoc(ref, { status: 'rolling', lastWinner: null });
    
    // Also update stage status
    await runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        const s = snap.data() as LotterySession;
        const tierKey = s.currentTier.toString();
        const stage = s.stages[tierKey];
        stage.status = 'rolling';
        t.update(ref, { [`stages.${tierKey}`]: stage });
    });
};

// 5. Pick Winner (Complex Logic)
export const adminPickWinner = async () => {
    const ref = doc(db, "lotterySessions", SESSION_DOC_ID);
    
    await runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        if(!snap.exists()) throw "No session";
        const s = snap.data() as LotterySession;
        
        if (s.allowed.length === 0) throw "No participants";
        
        // Random Pick
        const winnerIndex = Math.floor(Math.random() * s.allowed.length);
        const winner = s.allowed[winnerIndex];
        
        // Move from Allowed to Rejected (Reason: Winner)
        const newAllowed = [...s.allowed];
        newAllowed.splice(winnerIndex, 1);
        
        const newRejected = [...s.rejected, { ...winner, reason: "WINNER" }];
        
        // Update Stage Data
        const tierKey = s.currentTier.toString();
        const stage = s.stages[tierKey];
        const newWinners = [...stage.winners, winner.name];
        
        t.update(ref, {
            status: 'revealed',
            lastWinner: winner,
            allowed: newAllowed,
            rejected: newRejected,
            [`stages.${tierKey}.winners`]: newWinners
        });
    });
};

// 6. Complete Stage / Next Tier OR Finish
export const adminNextStage = async () => {
    const ref = doc(db, "lotterySessions", SESSION_DOC_ID);
    
    await runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        const s = snap.data() as LotterySession;
        
        const currentIdx = TIERS_CONFIG.indexOf(s.currentTier);
        const tierKey = s.currentTier.toString();

        // Mark current stage done
        const currentStage = s.stages[tierKey];
        currentStage.status = 'done';

        if (currentIdx < TIERS_CONFIG.length - 1) {
            // MOVE TO NEXT TIER
            const nextTier = TIERS_CONFIG[currentIdx + 1];
            t.update(ref, {
                status: 'idle',
                currentTier: nextTier,
                [`stages.${tierKey}`]: currentStage,
                lastWinner: null
            });
        } else {
            // FINISH SESSION
            t.update(ref, {
                status: 'finished',
                [`stages.${tierKey}`]: currentStage,
                lastWinner: null
            });
            
            // ARCHIVE TO HISTORY (Auto-archive when finished)
            // Flatten winners from all stages
            const allWinners = Object.values(s.stages).flatMap(stage => 
                stage.winners.map(wName => ({
                    name: wName,
                    tier: stage.tier,
                    reward: stage.reward
                }))
            );
            
            // Add winners from current stage (which isn't updated in 's' yet)
            currentStage.winners.forEach(wName => {
                // Check if already added (avoid dupe if logic changes)
                if (!allWinners.some(aw => aw.name === wName && aw.tier === currentStage.tier)) {
                    allWinners.push({ name: wName, tier: currentStage.tier, reward: currentStage.reward });
                }
            });

            // Create History Entry
            const historyEntry = {
                sessionId: s.sessionId,
                timestamp: serverTimestamp(), // Archive time
                title: `${s.isOfficial ? 'OFFICIAL' : 'TEST'} Lottery Session`,
                isOfficial: s.isOfficial,
                validity: s.validity,
                winners: allWinners,
                hash: Math.random().toString(36).substring(7) // Mock hash
            };

            const historyRef = doc(collection(db, "history"));
            t.set(historyRef, historyEntry);
        }
    });
};
