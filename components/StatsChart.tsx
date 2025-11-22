
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { GuildMember } from '../types';

interface StatsChartProps {
    members: GuildMember[];
}

const StatsChart: React.FC<StatsChartProps> = ({ members }) => {
    // Calculate difference and sort (End Score - Investments)
    const data = members.map(m => ({
        ...m,
        diff: m.endScore - m.investments
    })).sort((a, b) => b.diff - a.diff).slice(0, 15);

    return (
        <div className="w-full h-[400px] bg-guild-800 p-4 rounded-xl border border-guild-700 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                📊 Топ активности (Итог - Вложения)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120} 
                        stroke="#e2e8f0"
                        tick={{fontSize: 12}}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
                        cursor={{fill: '#334155', opacity: 0.4}}
                        formatter={(value: number) => [`${value}`, 'Разница']}
                    />
                    <ReferenceLine x={0} stroke="#64748b" />
                    <Bar dataKey="diff" radius={[0, 4, 4, 0]} barSize={20}>
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.diff < 0 ? '#ef4444' : index === 0 ? '#f59e0b' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '#8b5cf6'} 
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StatsChart;
