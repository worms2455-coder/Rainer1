
import React from 'react';
import { GuildMember } from '../types';
import { Trash2, Plus } from 'lucide-react';

interface GuildManagerProps {
    members: GuildMember[];
    setMembers: React.Dispatch<React.SetStateAction<GuildMember[]>>;
    dates: { start: string; end: string };
    setDates: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
}

const GuildManager: React.FC<GuildManagerProps> = ({ members, setMembers, dates, setDates }) => {

    const handleAddMember = () => {
        const newMember: GuildMember = {
            id: Date.now().toString(),
            name: 'Новый Игрок',
            investments: 0,
            startScore: 0,
            endScore: 0,
            reward: ''
        };
        setMembers([...members, newMember]);
    };

    const handleRemoveMember = (id: string) => {
        setMembers(members.filter(m => m.id !== id));
    };

    const updateMember = (id: string, field: keyof GuildMember, value: any) => {
        setMembers(members.map(m => {
            if (m.id === id) {
                return { ...m, [field]: value };
            }
            return m;
        }));
    };

    const formatNumber = (num: number) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    };

    const parseNumber = (value: string) => {
        const cleaned = value.replace(/\s/g, '');
        return cleaned === '' ? 0 : parseInt(cleaned, 10);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden text-black">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300 text-black">
                            <th className="px-4 py-2 text-left font-bold border-r border-gray-300 w-1/6">Ник</th>
                            <th className="px-4 py-2 text-left font-bold border-r border-gray-300 w-1/6">Вложения</th>
                            <th className="px-4 py-2 text-left font-bold border-r border-gray-300 w-1/6">Промежуточный замер</th>
                            <th className="px-4 py-2 text-left font-bold border-r border-gray-300 w-1/6">Итоговый замер</th>
                            <th className="px-4 py-2 text-left font-bold border-r border-gray-300 w-1/6 bg-blue-50 text-blue-900">Разница</th>
                            <th className="px-4 py-2 text-left font-bold border-gray-300 w-1/6">15 - 125G</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member, index) => {
                            // Formula changed: End Score - Investments
                            const difference = member.endScore - member.investments;
                            const diffClass = difference > 0 ? 'text-green-700 font-bold' : difference < 0 ? 'text-red-700' : 'text-black';
                            
                            return (
                                <tr key={member.id} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="border-r border-gray-200 p-1">
                                        <input 
                                            type="text" 
                                            value={member.name}
                                            onChange={(e) => updateMember(member.id, 'name', e.target.value)}
                                            className="w-full px-2 py-1 outline-none bg-transparent font-medium text-black placeholder-gray-400"
                                        />
                                    </td>
                                    <td className="border-r border-gray-200 p-1">
                                        <input 
                                            type="text" 
                                            value={formatNumber(member.investments)}
                                            onChange={(e) => {
                                                const val = parseNumber(e.target.value);
                                                if (!isNaN(val)) updateMember(member.id, 'investments', val);
                                            }}
                                            className="w-full px-2 py-1 outline-none bg-transparent font-mono text-right text-black placeholder-gray-400"
                                        />
                                    </td>
                                    <td className="border-r border-gray-200 p-1">
                                        <input 
                                            type="number" 
                                            value={member.startScore || ''}
                                            onChange={(e) => updateMember(member.id, 'startScore', parseInt(e.target.value) || 0)}
                                            className="w-full px-2 py-1 outline-none bg-transparent text-center text-black placeholder-gray-400"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="border-r border-gray-200 p-1">
                                        <input 
                                            type="number" 
                                            value={member.endScore || ''}
                                            onChange={(e) => updateMember(member.id, 'endScore', parseInt(e.target.value) || 0)}
                                            className="w-full px-2 py-1 outline-none bg-transparent text-center text-black placeholder-gray-400"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className={`border-r border-gray-200 p-2 text-center bg-blue-50/50 ${diffClass}`}>
                                        {formatNumber(difference)}
                                    </td>
                                    <td className="border-r border-gray-200 p-1">
                                         <input 
                                            type="text" 
                                            value={member.reward}
                                            onChange={(e) => updateMember(member.id, 'reward', e.target.value)}
                                            className="w-full px-2 py-1 outline-none bg-transparent text-black placeholder-gray-400"
                                            placeholder="-"
                                        />
                                    </td>
                                    <td className="p-1 text-center">
                                        <button 
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="text-red-500 hover:text-red-700 p-1 rounded"
                                            title="Удалить"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Add Row Button */}
                        <tr className="bg-gray-50">
                            <td colSpan={7} className="p-2 text-center border-t border-gray-300">
                                <button 
                                    onClick={handleAddMember}
                                    className="flex items-center justify-center gap-2 w-full text-gray-600 hover:text-black py-2 font-medium transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Добавить строку
                                </button>
                            </td>
                        </tr>
                    </tbody>
                    {/* Footer with Dates */}
                    <tfoot className="bg-white border-t-2 border-gray-300">
                        <tr>
                            <td className="border-r border-gray-200"></td>
                            <td className="border-r border-gray-200"></td>
                            <td className="border-r border-gray-200 p-2">
                                <input 
                                    type="text" 
                                    value={dates.start}
                                    onChange={(e) => setDates({...dates, start: e.target.value})}
                                    className="w-full text-center italic text-black text-xs outline-none border-b border-transparent focus:border-blue-400"
                                    placeholder="ДД.ММ.ГГГГ"
                                />
                            </td>
                            <td className="border-r border-gray-200 p-2">
                                <input 
                                    type="text" 
                                    value={dates.end}
                                    onChange={(e) => setDates({...dates, end: e.target.value})}
                                    className="w-full text-center italic text-black text-xs outline-none border-b border-transparent focus:border-blue-400"
                                    placeholder="ДД.ММ.ГГГГ"
                                />
                            </td>
                            <td colSpan={3}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default GuildManager;
