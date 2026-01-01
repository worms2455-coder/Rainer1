
import React, { useState, useEffect } from 'react';
import GuildManager from './components/GuildManager';
import LotterySystem from './components/LotterySystem';
import ExperimentalManager from './components/ExperimentalManager';
import ArchiveManager from './components/ArchiveManager';
import { Users, Gift, ScanLine, Archive, Lock, Unlock, X, ChevronRight, AlertCircle, Volume2, VolumeX } from 'lucide-react';

// Simple Audio Controller Mock
const AudioController = {
  playTick: () => console.log('playTick'),
  speak: (text: string) => { 
      console.log('speak', text); 
      if ('speechSynthesis' in window) { 
          const u = new SpeechSynthesisUtterance(text); 
          u.lang = 'ru-RU'; 
          window.speechSynthesis.speak(u); 
      } 
  },
  playVerify: () => console.log('playVerify'),
  playSuccess: () => console.log('playSuccess'),
  playMagic: () => console.log('playMagic'),
  playWhoosh: () => console.log('playWhoosh'),
  playConnection: () => console.log('playConnection'),
};

const ACCESS_CODE = "7777"; // Unified Admin Code

export default function App() {
  const [activeTab, setActiveTab] = useState<'stats' | 'lottery' | 'market' | 'archive'>('stats');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  const [isLocked, setIsLocked] = useState(false); // UI Lock during animations
  const [flyState, setFlyState] = useState<any>({ isActive: false });

  // Admin Modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const handleTabChange = (tab: 'stats' | 'lottery' | 'market' | 'archive') => {
      if (isLocked) return;
      if (tab === 'market' && !isAdmin) {
          // Scanner is protected, prompt login
          setShowAdminModal(true);
          return;
      }
      setActiveTab(tab);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === ACCESS_CODE) {
          setIsAdmin(true);
          setShowAdminModal(false);
          setPasswordInput("");
          // If they were trying to access scanner, go there
          if (activeTab !== 'market' && confirm("Перейти к сканеру?")) {
               setActiveTab('market');
          }
      } else {
          setPasswordError(true);
      }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans flex flex-col selection:bg-rose-500 selection:text-white relative overflow-hidden">
       {/* Snow */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <style>{`@keyframes snow { 0% { transform: translateY(-10vh); } 100% { transform: translateY(100vh); } } .snowflake { position: fixed; top: -10px; color: white; animation: snow 10s linear infinite; }`}</style>
          {[...Array(20)].map((_, i) => <div key={i} className="snowflake" style={{ left: `${Math.random()*100}vw`, animationDuration: `${5+Math.random()*5}s`, opacity: 0.3 }}>❄</div>)}
       </div>

      {/* Nav */}
      <nav className="relative z-50 bg-[#0f172a]/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 border border-white/20 flex items-center justify-center shadow-lg font-bold text-white">G</div>
            <h1 className="font-bold text-lg text-slate-100 hidden sm:block">GUILD IONIA</h1>
        </div>

        {/* Center Tabs */}
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-2 bg-[#0f172a] p-1.5 rounded-full border border-white/10 shadow-xl">
             {[
                 { id: 'stats', label: 'Статистика', icon: Users },
                 { id: 'lottery', label: 'Лотерея', icon: Gift },
                 { id: 'archive', label: 'Архив', icon: Archive },
                 { id: 'market', label: 'Сканер', icon: ScanLine },
             ].map(t => (
                 <button 
                    key={t.id}
                    onClick={() => handleTabChange(t.id as any)}
                    disabled={isLocked}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === t.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'} ${t.id === 'lottery' && activeTab === 'lottery' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg' : ''}`}
                 >
                     {t.id === 'market' && !isAdmin ? <Lock size={12} /> : <t.icon size={14} />} {t.label}
                 </button>
             ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
            <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="p-2 rounded-full hover:bg-white/5 text-slate-400">
                {isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button 
                onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminModal(true)} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${isAdmin ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
            >
                {isAdmin ? "Выход" : "Admin"}
            </button>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 relative z-10 overflow-hidden pt-6 p-4">
          <div className="h-full max-w-[1920px] mx-auto">
            {activeTab === 'stats' && <GuildManager isAdmin={isAdmin} />}
            {activeTab === 'lottery' && (
                <LotterySystem 
                    isAdmin={isAdmin}
                    isSoundEnabled={isSoundEnabled}
                    isLocked={isLocked} 
                    setIsLocked={setIsLocked} 
                    setFlyState={setFlyState} 
                    AudioController={AudioController} 
                />
            )}
            {activeTab === 'market' && <ExperimentalManager />}
            {activeTab === 'archive' && <ArchiveManager />}
          </div>
      </main>

      {/* Fly Animation Layer */}
      {flyState.isActive && (
          <div className="fixed inset-0 z-[9999] pointer-events-none">
              <div className="absolute transition-all duration-1000 ease-in-out" style={{ top: flyState.phase === 'start' ? flyState.startRect.top : flyState.targetRect.top, left: flyState.phase === 'start' ? flyState.startRect.left : flyState.targetRect.left, opacity: flyState.phase === 'finished' ? 0 : 1 }}>
                  <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_20px_rgba(251,191,36,1)] animate-ping"></div>
              </div>
          </div>
      )}

      {/* Admin Login Modal */}
      {showAdminModal && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-2xl p-6 relative">
                  <button onClick={() => setShowAdminModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                  <div className="text-center">
                      <Lock size={32} className="text-cyan-400 mx-auto mb-4" />
                      <h3 className="text-xl font-black text-white uppercase tracking-wider">Доступ Администратора</h3>
                      <form onSubmit={handleAdminLogin} className="mt-4">
                          <input type="password" autoFocus value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }} className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-center text-lg font-bold tracking-[0.5em] text-white outline-none ${passwordError ? 'border-red-500' : 'border-white/10 focus:border-cyan-500'}`} placeholder="••••" maxLength={4} />
                          {passwordError && <p className="text-xs text-red-400 mt-2 font-bold">Неверный код</p>}
                          <button type="submit" className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs">Войти</button>
                      </form>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
