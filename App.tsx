
import React, { useState } from 'react';
import { Users, BarChart3, Dices, Sparkles, Shield } from 'lucide-react';
import GuildManager from './components/GuildManager';
import LotterySystem from './components/LotterySystem';
import StatsChart from './components/StatsChart';
import { analyzeGuildStats } from './services/geminiService';
import { GuildMember, TabView } from './types';

// Initial data from the screenshot
const INITIAL_MEMBERS: GuildMember[] = [
    { id: '1', name: 'Фасоль#51817', investments: 150818174500, startScore: 0, endScore: 0, reward: '' },
    { id: '2', name: 'Мяу#97418', investments: 723767374500, startScore: 0, endScore: 0, reward: '' },
    { id: '3', name: 'dimandorf#98147', investments: 347739374500, startScore: 0, endScore: 0, reward: '' },
    { id: '4', name: 'Nezhdanchick#90542', investments: 121985674500, startScore: 0, endScore: 0, reward: '' },
    { id: '5', name: 'Дэментор#5030', investments: 375947374500, startScore: 0, endScore: 0, reward: '' },
    { id: '6', name: 'Adanei#72323', investments: 60665339100, startScore: 0, endScore: 0, reward: '' },
    { id: '7', name: 'Асула#92795', investments: 241222674500, startScore: 0, endScore: 0, reward: '' },
    { id: '8', name: 'Shadow#24330', investments: 97337374500, startScore: 0, endScore: 0, reward: '' },
    { id: '9', name: 'selfaa#67769', investments: 243840424500, startScore: 0, endScore: 0, reward: '' },
    { id: '10', name: 'Mihaqlovich#89594', investments: 500117374500, startScore: 0, endScore: 0, reward: '' },
    { id: '11', name: 'Zarya#88899', investments: 641617374500, startScore: 0, endScore: 0, reward: '' },
    { id: '12', name: 'INKI#33936', investments: 358867374500, startScore: 0, endScore: 0, reward: '' },
    { id: '13', name: 'RaineR#73242', investments: 462659374500, startScore: 0, endScore: 0, reward: '' },
    { id: '14', name: 'Алена#20153', investments: 284313374500, startScore: 0, endScore: 0, reward: '' },
    { id: '15', name: 'Алекс#46688', investments: 920007374500, startScore: 0, endScore: 0, reward: '' },
    { id: '16', name: 'Калямбус#3224', investments: 88030874500, startScore: 0, endScore: 0, reward: '' },
    { id: '17', name: 'Aver1n#93710', investments: 125861370700, startScore: 0, endScore: 0, reward: '' },
    { id: '18', name: 'Сатана#38064', investments: 307767374500, startScore: 0, endScore: 0, reward: '' },
    { id: '19', name: 'Nipi#58068', investments: 163467488400, startScore: 0, endScore: 0, reward: '' },
    { id: '20', name: 'YuryQ#38320', investments: 617395374500, startScore: 0, endScore: 0, reward: '' },
];

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabView>('members');
    const [members, setMembers] = useState<GuildMember[]>(INITIAL_MEMBERS);
    const [aiAnalysis, setAiAnalysis] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dates, setDates] = useState({ start: '15.11.2025', end: '01.01.2026' });

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        const result = await analyzeGuildStats(members);
        setAiAnalysis(result);
        setIsAnalyzing(false);
    };

    return (
        <div className="min-h-screen bg-guild-900 text-gray-100 font-sans pb-12">
            {/* Header */}
            <header className="bg-guild-800 border-b border-guild-700 sticky top-0 z-50 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-guild-accent p-2 rounded-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-wide text-white">Guild<span className="text-guild-accent">Master</span></h1>
                    </div>
                    
                    <nav className="flex gap-1 md:gap-4">
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'members' ? 'bg-guild-700 text-white shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-guild-800'}`}
                        >
                            <Users className="w-4 h-4" />
                            <span className="hidden md:inline">Таблица</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'stats' ? 'bg-guild-700 text-white shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-guild-800'}`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span className="hidden md:inline">Статистика</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('lottery')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'lottery' ? 'bg-guild-700 text-white shadow-inner' : 'text-gray-400 hover:text-gray-200 hover:bg-guild-800'}`}
                        >
                            <Dices className="w-4 h-4" />
                            <span className="hidden md:inline">Розыгрыш</span>
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Content Container */}
                <div className="animate-fade-in">
                    {activeTab === 'members' && (
                        <div className="space-y-6">
                            <GuildManager 
                                members={members} 
                                setMembers={setMembers} 
                                dates={dates}
                                setDates={setDates}
                            />
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h2 className="text-2xl font-bold text-white">Анализ Прогресса</h2>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {isAnalyzing ? 'Оракул думает...' : 'Спросить Оракула (AI)'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <StatsChart members={members} />
                                
                                <div className="bg-guild-800 p-6 rounded-xl border border-guild-700 shadow-lg min-h-[400px]">
                                    <h3 className="text-xl font-bold text-white mb-4 border-b border-guild-700 pb-2">Отчет Оракула</h3>
                                    {aiAnalysis ? (
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <div dangerouslySetInnerHTML={{ 
                                                __html: aiAnalysis
                                                    .replace(/\n/g, '<br/>')
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-guild-accent">$1</strong>') 
                                                }} 
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                                            <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                                            <p className="text-center max-w-xs">Нажмите кнопку выше, чтобы AI проанализировал эффективность ваших участников.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lottery' && (
                        <div className="space-y-6">
                            <div className="mb-4">
                                <h2 className="text-2xl font-bold text-white">Великий Рандом</h2>
                                <p className="text-gray-400 mt-1">Проводите честные розыгрыши среди участников гильдии на основе их разницы показателей.</p>
                            </div>
                            <LotterySystem members={members} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
