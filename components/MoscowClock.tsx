
import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

export default function MoscowClock() {
    const [time, setTime] = useState<Date>(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Force Moscow Timezone (UTC+3)
    const timeString = time.toLocaleTimeString('ru-RU', { 
        timeZone: 'Europe/Moscow',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });

    const dateString = time.toLocaleDateString('ru-RU', { 
        timeZone: 'Europe/Moscow',
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });

    return (
        <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 shadow-inner">
            <div className="flex items-center gap-2 text-amber-500/80">
                <Calendar size={14} />
                <span className="text-xs font-mono font-bold tracking-wide text-slate-300">{dateString}</span>
            </div>
            <div className="w-px h-4 bg-white/10"></div>
            <div className="flex items-center gap-2 text-cyan-500/80">
                <Clock size={14} />
                <span className="text-sm font-mono font-black tracking-widest text-cyan-400 tabular-nums drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]">
                    {timeString}
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">MSK</span>
            </div>
        </div>
    );
}
