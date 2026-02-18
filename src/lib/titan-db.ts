// =============================================
// 타이탄 DB 로더 유틸
// =============================================
import { Titan } from './types';
import fs from 'fs';
import path from 'path';

function loadJsonDb(): { titans: Titan[] } {
    const filePath = path.join(process.cwd(), 'data', 'titan_db.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

export function loadTitanDb(): Titan[] {
    return loadJsonDb().titans as Titan[];
}

export function filterTitansByCategory(category: string): Titan[] {
    const titans = loadTitanDb();
    return titans.filter(t => t.categories.includes(category));
}

export function searchTitans(keyword: string): Titan[] {
    const titans = loadTitanDb();
    const lower = keyword.toLowerCase();
    return titans.filter(
        t =>
            t.keywords.some(k => k.toLowerCase().includes(lower)) ||
            t.categories.some(c => c.toLowerCase().includes(lower)) ||
            t.methodology.toLowerCase().includes(lower) ||
            t.name.includes(keyword)
    );
}
