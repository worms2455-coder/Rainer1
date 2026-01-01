
import React, { useState, useEffect } from 'react';
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Trophy, Calendar, Clock, Hash, Trash2, Search, Gift, Archive, ShieldCheck, ShieldAlert } from 'lucide-react';

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

export default function ArchiveManager() {
    const [history, setHistory] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const q = query(collection(db, "history"), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm("Удалить запись из архива?")) await deleteDoc(doc(db, "history", id));
    };
    
    const filteredHistory = history.filter(h => 
        h.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        h.winners?.some((w: any) => w.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="h-full flex flex-col font-sans p-4 relative">
             <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

            {/* Header */}
             <div className="flex justify-between items-end mb-6 relative z-10">
                <div>
                    <h2 className="text-2xl font-black text-slate-200 tracking-widest flex items-center gap-3">
                        <Archive size={28} className="text-slate-400" /> 
                        АРХИВ СОБЫТИЙ
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-wider">
                        История розыгрышей и победителей
                    </p>
                </div>
                
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                        type="text" 
                        placeholder="Поиск..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="bg-[#131b36]/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-slate-500 outline-none w-48 transition-all focus:w-64"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pb-10 relative z-10">
                {filteredHistory.map((item) => {
                    const isOfficial = item.isOfficial || item.validity === 'OFFICIAL';
                    
                    return (
                        <div key={item.id} className={`bg-[#0f172a]/60 backdrop-blur-md border rounded-2xl overflow-hidden group hover:border-white/10 transition-all duration-300 shadow-lg ${isOfficial ? 'border-amber-500/10' : 'border-slate-700/50 opacity-70 grayscale-[0.5]'}`}>
                            <div className={`h-1 w-full bg-gradient-to-r ${isOfficial ? 'from-amber-700 via-amber-500 to-amber-700' : 'from-slate-700 via-slate-500 to-slate-700'} opacity-50`}></div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {isOfficial ? (
                                                <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold uppercase flex items-center gap-1">
                                                    <ShieldCheck size={10} /> OFFICIAL
                                                </span>
                                            ) : (
                                                <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 font-bold uppercase flex items-center gap-1">
                                                    <ShieldAlert size={10} /> TEST / INVALID
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mb-1">
                                            <Calendar size={12} /> {item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-200 tracking-tight leading-none mb-1">{item.title}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-mono">
                                                #{item.hash || 'NO-HASH'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg ${isOfficial ? 'bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/5 grayscale'}`}>
                                        <Trophy size={20} className={isOfficial ? "text-amber-500" : "text-slate-500"} />
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Победители ({item.winners?.length || 0})</div>
                                    {item.winners?.map((w: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-sm font-bold text-slate-200">{w.name.split('#')[0]}</span>
                                            </div>
                                            <span className="text-xs font-mono text-slate-500">#{w.num || w.id?.substring(0,4)}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex justify-end pt-3 border-t border-white/5">
                                    <button onClick={() => handleDelete(item.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
