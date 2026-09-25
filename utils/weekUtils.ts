/**
 * Week & Season Utilities for AyurNutri Calendar-Based Meal Plans
 */

export type DayInfo = {
    dayShort: string;    // "Mon"
    dayFull: string;     // "Monday"
    date: number;        // 12
    month: string;       // "Mar"
    monthFull: string;   // "March"
    full: string;        // "2026-03-12"
    isToday: boolean;
};

export type SeasonInfo = {
    name: string;            // "Spring"
    ayurvedic: string;       // "Vasanta Ritu"
    emoji: string;           // "🌸"
    dominantDosha: string;   // "Kapha"
    advice: string;          // "Favor light, bitter, astringent..."
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Get the Monday of the week containing the given date.
 * Returns ISO date string "YYYY-MM-DD"
 */
export function getWeekStartDate(date: Date = new Date()): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ...
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // shift to Monday
    d.setDate(d.getDate() + diff);
    return toISODate(d);
}

/**
 * Get info for all 7 days of the week starting from weekStart.
 */
export function getWeekDates(weekStart: string): DayInfo[] {
    const start = parseISODate(weekStart);
    const today = toISODate(new Date());

    return DAYS_SHORT.map((dayShort, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const full = toISODate(d);
        return {
            dayShort,
            dayFull: DAYS_FULL[i],
            date: d.getDate(),
            month: MONTHS[d.getMonth()],
            monthFull: MONTHS_FULL[d.getMonth()],
            full,
            isToday: full === today,
        };
    });
}

/**
 * Format week range for display: "Mar 10 – 16, 2026"
 */
export function formatWeekRange(weekStart: string): string {
    const start = parseISODate(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const startMonth = MONTHS[start.getMonth()];
    const endMonth = MONTHS[end.getMonth()];
    const year = start.getFullYear();

    if (start.getMonth() === end.getMonth()) {
        return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${year}`;
}

/**
 * Navigate to previous or next week's start date.
 */
export function shiftWeek(weekStart: string, direction: -1 | 1): string {
    const d = parseISODate(weekStart);
    d.setDate(d.getDate() + direction * 7);
    return toISODate(d);
}

/**
 * Check if a week start is in the future (beyond current week).
 */
export function isFutureWeek(weekStart: string): boolean {
    const currentWeekStart = getWeekStartDate();
    return weekStart > currentWeekStart;
}

/**
 * Check if a week start is the current week.
 */
export function isCurrentWeek(weekStart: string): boolean {
    return weekStart === getWeekStartDate();
}

/**
 * Get today's day index within a week (Mon=0, Tue=1, ..., Sun=6).
 */
export function getTodayIndex(): number {
    const day = new Date().getDay(); // 0=Sun
    return day === 0 ? 6 : day - 1;
}

/**
 * Determine current Ayurvedic season (Ritu) based on month.
 * Based on traditional Indian 6-season calendar.
 */
export function getCurrentSeason(): SeasonInfo {
    const month = new Date().getMonth(); // 0-11

    // Ayurvedic seasons (approximate Gregorian mapping)
    if (month === 1 || month === 2) {
        // Feb–Mar: Vasanta (Spring)
        return {
            name: "Spring",
            ayurvedic: "Vasanta Ritu",
            emoji: "🌸",
            dominantDosha: "Kapha",
            advice: "Favor light, dry, warm foods. Include bitter & astringent tastes. Reduce sweet, sour, salty. Use honey, barley, ginger, turmeric.",
        };
    }
    if (month === 3 || month === 4) {
        // Apr–May: Grishma (Summer)
        return {
            name: "Summer",
            ayurvedic: "Grishma Ritu",
            emoji: "☀️",
            dominantDosha: "Pitta",
            advice: "Favor sweet, cold, liquid foods. Include cooling herbs like mint, coriander, fennel. Avoid spicy, sour, salty. Drink buttermilk, coconut water.",
        };
    }
    if (month === 5 || month === 6) {
        // Jun–Jul: Varsha (Monsoon)
        return {
            name: "Monsoon",
            ayurvedic: "Varsha Ritu",
            emoji: "🌧️",
            dominantDosha: "Vata",
            advice: "Favor warm, freshly cooked, easily digestible foods. Use ginger, garlic, asafoetida. Avoid raw salads, cold food. Include soups and light khichdi.",
        };
    }
    if (month === 7 || month === 8) {
        // Aug–Sep: Sharad (Autumn)
        return {
            name: "Autumn",
            ayurvedic: "Sharad Ritu",
            emoji: "🍂",
            dominantDosha: "Pitta",
            advice: "Favor sweet, bitter, astringent tastes. Include cooling foods like rice, ghee, amla. Avoid hot, spicy, fermented foods. Drink warm milk with turmeric.",
        };
    }
    if (month === 9 || month === 10) {
        // Oct–Nov: Hemanta (Early Winter)
        return {
            name: "Early Winter",
            ayurvedic: "Hemanta Ritu",
            emoji: "❄️",
            dominantDosha: "Vata",
            advice: "Favor heavy, oily, warm, nourishing foods. Include ghee, sesame oil, nuts, jaggery. Sweet, sour, salty tastes are beneficial. Eat heartily — Agni is strongest.",
        };
    }
    // month === 11 || month === 0: Dec–Jan: Shishira (Late Winter)
    return {
        name: "Winter",
        ayurvedic: "Shishira Ritu",
        emoji: "🥶",
        dominantDosha: "Kapha",
        advice: "Favor warm, cooked, spiced foods. Include ginger, black pepper, cinnamon. Moderate oily/heavy foods. Avoid cold, raw, frozen foods. Hot soups and stews are ideal.",
    };
}

/* ── Internal helpers ── */

function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseISODate(iso: string): Date {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
}
