
import { GoogleGenAI } from "@google/genai";
import { GuildMember } from '../types';

const getAI = () => {
    if (!process.env.API_KEY) {
        console.error("API Key is missing");
        return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeGuildStats = async (members: GuildMember[]): Promise<string> => {
    const ai = getAI();
    if (!ai) return "Ошибка: API Key не найден.";

    const memberData = members.map(m => {
        const diff = m.endScore - m.investments;
        return `${m.name}: Вложения=${m.investments}, Старт=${m.startScore}, Итог=${m.endScore}, Разница(Итог-Вложения)=${diff}`;
    }).join('\n');

    const prompt = `
    Ты опытный аналитик игровых гильдий. Проанализируй следующий список участников и их прогресс за отчетный период.
    
    Данные (Вложения, Старт, Итог, Разница рассчитана как Итог - Вложения):
    ${memberData}

    Пожалуйста, предоставь краткий отчет (на русском языке) содержащий:
    1. MVP периода (игрок с наибольшей положительной разницей).
    2. Кто просел или не активен (отрицательная разница означает, что вложения не окупились или не было активности).
    3. Кто сделал наибольшие вложения.
    4. Общую оценку активности гильдии.
    5. Мотивирующую цитату для гильдии.
    
    Используй Markdown. Выдели ники жирным.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Не удалось получить анализ.";
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return "Произошла ошибка при связи с Оракулом Гильдии (AI).";
    }
};
