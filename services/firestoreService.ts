/**
 * Firestore Service — replaces all Convex queries/mutations.
 * Uses flat collections with documents keyed by Firebase UID.
 * All reads are wrapped in try-catch to handle offline/connectivity issues gracefully.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "@/configs/firebaseConfig";
import {
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where,
} from "firebase/firestore";

/** Safe Firestore read — returns cache instantly, then fetches and updates cache */
async function safeGetDoc(path: string, ...pathSegments: string[]) {
    const fullPath = [path, ...pathSegments].join('/');
    const cacheKey = `@firestore_cache_${fullPath}`;
    const docRef = doc(db, path, ...pathSegments);
    
    // 1. Try to load from cache first
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            // Background fetch to update cache for next time
            getDoc(docRef).then(snap => {
                if (snap.exists()) AsyncStorage.setItem(cacheKey, JSON.stringify(snap.data()));
            }).catch(() => {});
            return JSON.parse(cached);
        }
    } catch (e) {}

    // 2. Fallback to network if no cache
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
            return data;
        }
        return null;
    } catch (err: any) {
        console.warn(`[Firestore] Could not read ${fullPath}:`, err?.message);
        return null;
    }
}

/** Safe Firestore write — saves to cache instantly, then to network */
async function safeSetDoc(data: any, path: string, ...pathSegments: string[]) {
    const fullPath = [path, ...pathSegments].join('/');
    const cacheKey = `@firestore_cache_${fullPath}`;
    const docRef = doc(db, path, ...pathSegments);
    
    // 1. Optimistic cache update
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        const existing = cached ? JSON.parse(cached) : {};
        const merged = { ...existing, ...data };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(merged));
    } catch (e) {}

    // 2. Network update
    try {
        await setDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (err: any) {
        console.warn(`[Firestore] Could not write ${fullPath}:`, err?.message);
    }
}

/** 
 * Safe Firestore Subscription — instantly calls back with cache, 
 * then subscribes to network and updates cache on changes.
 */
function safeSubscribeToDoc(callback: (data: any) => void, path: string, ...pathSegments: string[]) {
    const fullPath = [path, ...pathSegments].join('/');
    const cacheKey = `@firestore_cache_${fullPath}`;
    const docRef = doc(db, path, ...pathSegments);
    
    // 1. Instantly return cache
    AsyncStorage.getItem(cacheKey).then(cached => {
        if (cached) {
            try { callback(JSON.parse(cached)); } catch (e) {}
        }
    });

    // 2. Network subscription
    return onSnapshot(docRef, (snap) => {
        const data = snap.exists() ? snap.data() : null;
        if (data) {
            AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        }
        callback(data);
    }, (err) => {
        console.warn(`[Firestore] Subscription error for ${fullPath}:`, err.message);
    });
}

/* ═══════════════════════════════════════════
   USER PROFILES
   ═══════════════════════════════════════════ */
export async function upsertProfile(uid: string, data: {
    fullName: string;
    email: string;
    photoURL?: string;
}) {
    await safeSetDoc(data, "userProfiles", uid);
}

export function subscribeToProfile(uid: string, callback: (data: any) => void) {
    return safeSubscribeToDoc(callback, "userProfiles", uid);
}

/* ═══════════════════════════════════════════
   HEALTH GOALS
   ═══════════════════════════════════════════ */
export async function getGoals(uid: string) {
    const data = await safeGetDoc("healthGoals", uid);
    return data as { selectedGoals: string[] } | null;
}

export function subscribeToGoals(uid: string, callback: (data: { selectedGoals: string[] } | null) => void) {
    return safeSubscribeToDoc(callback, "healthGoals", uid);
}

export async function saveGoals(uid: string, selectedGoals: string[]) {
    await safeSetDoc({ selectedGoals }, "healthGoals", uid);
}

/* ═══════════════════════════════════════════
   PREFERENCES
   ═══════════════════════════════════════════ */
export async function getPreferences(uid: string) {
    const data = await safeGetDoc("preferences", uid);
    return data as {
        notifications: boolean;
        dailyReminders: boolean;
        darkMode: boolean;
        themeMode?: 'light' | 'dark' | 'system';
        language: string;
    } | null;
}

export function subscribeToPreferences(uid: string, callback: (data: any) => void) {
    return safeSubscribeToDoc(callback, "preferences", uid);
}

export async function savePreferences(uid: string, prefs: {
    notifications: boolean;
    dailyReminders: boolean;
    darkMode?: boolean;
    themeMode?: 'light' | 'dark' | 'system';
    language: string;
}) {
    await safeSetDoc(prefs, "preferences", uid);
}

/* ═══════════════════════════════════════════
   DOSHA RESULTS
   ═══════════════════════════════════════════ */
export async function getDoshaResult(uid: string) {
    const data = await safeGetDoc("doshaResults", uid);
    return data as {
        doshaType: string;
        vataScore: number;
        pittaScore: number;
        kaphaScore: number;
        aiAnalysis: string;
        answers: string[];
    } | null;
}

export function subscribeToDoshaResult(uid: string, callback: (data: any) => void) {
    return safeSubscribeToDoc(callback, "doshaResults", uid);
}

export async function saveDoshaResult(uid: string, data: {
    doshaType: string;
    vataScore: number;
    pittaScore: number;
    kaphaScore: number;
    aiAnalysis: string;
    answers: string[];
}) {
    await safeSetDoc({ ...data, createdAt: serverTimestamp() }, "doshaResults", uid);
}

/* ═══════════════════════════════════════════
   ONBOARDING
   ═══════════════════════════════════════════ */
export async function getOnboarding(uid: string) {
    const data = await safeGetDoc("onboarding", uid);
    return data as {
        weight: number;
        height: number;
        age: number;
        gender: string;
        diet: string;
        region: string;
        goal: string;
        completed: boolean;
    } | null;
}

export function subscribeToOnboarding(uid: string, callback: (data: any) => void) {
    return safeSubscribeToDoc(callback, "onboarding", uid);
}

export async function saveOnboarding(uid: string, data: {
    weight: number;
    height: number;
    age: number;
    gender: string;
    diet: string;
    region: string;
    goal: string;
}) {
    await safeSetDoc({ ...data, completed: true, createdAt: serverTimestamp() }, "onboarding", uid);
}

/* ═══════════════════════════════════════════
   DIETITIANS & CLINICAL CONNECTION
   ═══════════════════════════════════════════ */

export async function getDietitianConnection(patientUid: string) {
    const data = await safeGetDoc("patientDietitians", patientUid);
    return data as { dietitianId: string; connectedAt: any } | null;
}

export function subscribeToDietitianConnection(patientUid: string, callback: (data: any) => void) {
    return safeSubscribeToDoc(callback, "patientDietitians", patientUid);
}

export async function connectDietitian(patientUid: string, dietitianId: string) {
    await safeSetDoc({
        dietitianId,
        connectedAt: serverTimestamp()
    }, "patientDietitians", patientUid);
}

// Mock function to fetch verified dietitians
export async function getAvailableDietitians() {
    // In a real app, this would query the "dietitians" collection
    // return (await getDocs(collection(db, "dietitians"))).docs.map(d => ({id: d.id, ...d.data()}));

    // For now, return mock data as per implementation plan
    return [
        {
            id: "mock_dr_suresh",
            name: "Dr. Suresh Kumar",
            clinic: "AyurCare Clinic, Mysuru",
            bamsNumber: "BAMS-KA-2015-8842",
            experience: "10 Years"
        },
        {
            id: "mock_dr_lakshmi",
            name: "Dr. Lakshmi N",
            clinic: "Prakriti Wellness, Bengaluru",
            bamsNumber: "BAMS-KA-2018-9102",
            experience: "6 Years"
        },
        {
            id: "mock_dr_vikram",
            name: "Dr. Vikram Singh",
            clinic: "Healing Hands Ayurveda, Delhi",
            bamsNumber: "BAMS-DL-2012-4011",
            experience: "14 Years"
        }
    ];
}

/* ═══════════════════════════════════════════
   MEAL PLANS (Calendar-Based Weekly)
   Subcollection: mealPlans/{uid}/weeks/{weekStart}
   ═══════════════════════════════════════════ */

/** Save a meal plan for a specific week */
export async function saveMealPlan(uid: string, weekPlan: any, weekStart: string) {
    await safeSetDoc({
        weekPlan,
        generatedAt: serverTimestamp(),
        weekStart,
        updatedAt: serverTimestamp(),
    }, "mealPlans", uid, "weeks", weekStart);
}

/** Load a specific week's meal plan */
export async function getMealPlanForWeek(uid: string, weekStart: string) {
    const data = await safeGetDoc("mealPlans", uid, "weeks", weekStart);
    return data as { weekPlan: any; generatedAt: any; weekStart: string } | null;
}

/** Subscribe to a specific week's meal plan */
export function subscribeToMealPlanWeek(
    uid: string,
    weekStart: string,
    callback: (data: { weekPlan: any; generatedAt: any; weekStart: string } | null) => void
) {
    return safeSubscribeToDoc(callback, "mealPlans", uid, "weeks", weekStart);
}

/** Get all available week IDs (for history navigation) */
export async function getAvailableWeeks(uid: string): Promise<string[]> {
    try {
        const q = query(collection(db, "mealPlans", uid, "weeks"), orderBy("weekStart", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.id);
    } catch (err: any) {
        console.warn(`[Firestore] Could not list weeks:`, err?.message);
        return [];
    }
}

/**
 * Migrate old single-document meal plan to the new week subcollection.
 * Checks if old `mealPlans/{uid}` has a `weekPlan` field (old format).
 * If found, moves it to `mealPlans/{uid}/weeks/{weekStart}` and clears the old fields.
 */
export async function migrateOldMealPlan(uid: string, getWeekStartDate: (date?: Date) => string): Promise<boolean> {
    try {
        const oldSnap = await getDoc(doc(db, "mealPlans", uid));
        if (!oldSnap.exists()) return false;
        const oldData = oldSnap.data();
        if (!oldData?.weekPlan) return false;

        // Determine the week start from generatedAt
        let weekStart: string;
        if (oldData.generatedAt?.toDate) {
            weekStart = getWeekStartDate(oldData.generatedAt.toDate());
        } else if (oldData.generatedAt) {
            weekStart = getWeekStartDate(new Date(oldData.generatedAt));
        } else {
            weekStart = getWeekStartDate();
        }

        // Save to new subcollection
        await setDoc(doc(db, "mealPlans", uid, "weeks", weekStart), {
            weekPlan: oldData.weekPlan,
            generatedAt: oldData.generatedAt || serverTimestamp(),
            weekStart,
            migratedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // Clear old fields from parent doc (mark as migrated)
        await setDoc(doc(db, "mealPlans", uid), {
            migrated: true,
            migratedAt: serverTimestamp(),
            weekPlan: deleteField(),
            generatedAt: deleteField(),
        }, { merge: true });

        console.log(`[Firestore] ✅ Migrated old meal plan to week ${weekStart}`);
        return true;
    } catch (err: any) {
        console.warn(`[Firestore] Migration failed:`, err?.message);
        return false;
    }
}

/* ═══════════════════════════════════════════
   MEAL CHECKED STATE (Per-Week)
   ═══════════════════════════════════════════ */

export async function saveCheckedMeals(uid: string, checkedMeals: Record<string, boolean>, weekStart: string) {
    await safeSetDoc({
        checkedMeals,
        updatedAt: serverTimestamp(),
    }, "mealChecked", uid, "weeks", weekStart);
}

export function subscribeToCheckedMeals(uid: string, weekStart: string, callback: (data: Record<string, boolean>) => void) {
    return onSnapshot(doc(db, "mealChecked", uid, "weeks", weekStart), (snap) => {
        if (snap.exists()) {
            const raw = snap.data();
            callback(raw?.checkedMeals || {});
        } else {
            callback({});
        }
    });
}

/* ═══════════════════════════════════════════
   FAVORITE MEALS
   ═══════════════════════════════════════════ */

export async function saveFavoriteMeals(uid: string, favorites: any[]) {
    await safeSetDoc({ favorites }, "favoriteMeals", uid);
}

export function subscribeToFavorites(uid: string, callback: (favorites: any[]) => void) {
    return safeSubscribeToDoc((data) => {
        callback(data?.favorites || []);
    }, "favoriteMeals", uid);
}

/* ═══════════════════════════════════════════
   WEEKLY FEEDBACK (meal ratings for AI learning)
   ═══════════════════════════════════════════ */

export async function saveWeekFeedback(
    uid: string,
    weekStart: string,
    feedback: { liked: string[]; disliked: string[] }
) {
    await safeSetDoc({
        ...feedback,
        createdAt: serverTimestamp(),
    }, "weekFeedback", uid, "weeks", weekStart);
}

export async function getWeekFeedback(uid: string, weekStart: string): Promise<{ liked: string[]; disliked: string[] } | null> {
    const data = await safeGetDoc("weekFeedback", uid, "weeks", weekStart);
    if (data) {
        return { liked: data?.liked || [], disliked: data?.disliked || [] };
    }
    return null;
}

/* ═══════════════════════════════════════════
   MEAL DETAILS CACHE
   Stores AI-generated Ayurvedic detail per meal so it never
   needs to be generated again for the same dish.
   Doc ID = uid + sanitised meal name (e.g. "abc123_masala_dosa")
   ═══════════════════════════════════════════ */

function mealDetailDocId(mealName: string, doshaType?: string): string {
    // Sanitise: lowercase, replace non-alphanumeric with underscore, trim
    const safeMeal = mealName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").slice(0, 50);
    const safeDosha = (doshaType || "general").toLowerCase();
    return `${safeDosha}_${safeMeal}`;
}

export async function saveMealDetail(uid: string, mealName: string, detail: any, doshaType?: string) {
    const docId = mealDetailDocId(mealName, doshaType);
    await safeSetDoc({
        uid, // Track who last updated it
        mealName,
        doshaType: doshaType || "general",
        detail,
        cachedAt: serverTimestamp(),
    }, "mealDetails", docId);
}

export async function getMealDetail(mealName: string, doshaType?: string): Promise<any | null> {
    const docId = mealDetailDocId(mealName, doshaType);
    const data = await safeGetDoc("mealDetails", docId);
    return data?.detail ?? null;
}

/* ═══════════════════════════════════════════
   RECIPE CACHE
   Stores AI-generated recipes per user prompt and dosha.
   Doc ID = uid + dosha + sanitised input prompt
   ═══════════════════════════════════════════ */

function recipeCacheDocId(input: string, doshaType?: string): string {
    const safeInput = input.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").slice(0, 60);
    const safeDosha = (doshaType || "general").toLowerCase();
    return `${safeDosha}_${safeInput}`;
}

export async function saveRecipeCache(uid: string, input: string, doshaType: string | undefined, recipes: any[]) {
    const docId = recipeCacheDocId(input, doshaType);
    console.log(`[Firestore] 📥 Saving Recipe Cache: ${docId}`);
    await safeSetDoc({
        uid, // Revert to 'uid' for getRecentRecipeCache compatibility
        input,
        doshaType: doshaType || "general",
        recipes,
        cachedAt: serverTimestamp(),
    }, "recipeCache", docId);
}

export async function getRecipeCache(input: string, doshaType: string | undefined): Promise<any[] | null> {
    const docId = recipeCacheDocId(input, doshaType);
    console.log(`[Firestore] 📤 Checking Recipe Cache: ${docId}`);
    const data = await safeGetDoc("recipeCache", docId);
    if (data) console.log(`[Firestore] ✅ Cache hit for: ${docId}`);
    else console.log(`[Firestore] ❌ Cache MISS for: ${docId}`);
    return data?.recipes ?? null;
}

export async function getRecentRecipeCache(uid: string): Promise<{ input: string, recipes: any[] } | null> {
    try {
        const q = query(
            collection(db, "recipeCache"),
            where("uid", "==", uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data());
            docs.sort((a, b) => {
                const timeA = a.cachedAt?.toMillis?.() || a.cachedAt?.seconds || 0;
                const timeB = b.cachedAt?.toMillis?.() || b.cachedAt?.seconds || 0;
                return timeB - timeA;
            });
            const data = docs[0];
            return {
                input: data.input || "",
                recipes: data.recipes || []
            };
        }
    } catch (err: any) {
        console.warn(`[Firestore] Could not fetch recent recipe cache:`, err?.message);
    }
    return null;
}

/* ═══════════════════════════════════════════
   CHAT MESSAGES
   Stores user chat history with Vaidya AI
   ═══════════════════════════════════════════ */

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: any;
}

export async function saveChatMessage(uid: string, message: Omit<ChatMessage, 'timestamp'>) {
    await safeSetDoc({
        ...message,
        timestamp: serverTimestamp(),
    }, "chatMessages", uid, "messages", message.id);
}

export function subscribeToChatMessages(uid: string, callback: (messages: ChatMessage[]) => void) {
    const q = query(
        collection(db, "chatMessages", uid, "messages"),
        orderBy("timestamp", "asc")
    );
    return onSnapshot(q, (snap) => {
        const messages = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
        callback(messages);
    }, (err) => {
        console.warn(`[Firestore] Chat subscription error:`, err?.message);
        callback([]);
    });
}

export async function getRecentChatMessages(uid: string, limitCount: number = 50): Promise<ChatMessage[]> {
    try {
        const q = query(
            collection(db, "chatMessages", uid, "messages"),
            orderBy("timestamp", "desc"),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        const messages = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
        return messages.reverse(); // Return in chronological order
    } catch (err: any) {
        console.warn(`[Firestore] Could not fetch chat messages:`, err?.message);
        return [];
    }
}

export async function clearChatHistory(uid: string) {
    try {
        const q = query(collection(db, "chatMessages", uid, "messages"));
        const snap = await getDocs(q);
        const batch = snap.docs.map(d => deleteDoc(doc(db, "chatMessages", uid, "messages", d.id)));
        await Promise.all(batch);
        console.log(`[Firestore] ✅ Cleared chat history for ${uid}`);
    } catch (err: any) {
        console.warn(`[Firestore] Could not clear chat history:`, err?.message);
    }
}

/* ═══════════════════════════════════════════
   DINACHARYA (Daily Routine) TRACKER
   Subcollection: dinacharyaProgress/{uid}/days/{date}
   ═══════════════════════════════════════════ */

export interface DinacharyaDay {
    tasks: Record<string, boolean>;
    completedCount: number;
    totalTasks: number;
    date: string;
    updatedAt?: any;
}

export async function saveDinacharyaProgress(uid: string, date: string, data: DinacharyaDay) {
    await safeSetDoc({
        ...data,
        updatedAt: serverTimestamp(),
    }, "dinacharyaProgress", uid, "days", date);
}

export function subscribeToDinacharyaDay(
    uid: string,
    date: string,
    callback: (data: DinacharyaDay | null) => void
) {
    return safeSubscribeToDoc(callback, "dinacharyaProgress", uid, "days", date);
}

/** Calculate streak by checking consecutive past days */
export async function getDinacharyaStreak(uid: string): Promise<number> {
    try {
        const q = query(
            collection(db, "dinacharyaProgress", uid, "days"),
            orderBy("date", "desc"),
            limit(30)
        );
        const snap = await getDocs(q);
        if (snap.empty) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = checkDate.toISOString().split("T")[0];

            const dayDoc = snap.docs.find((d) => d.id === dateStr);
            if (dayDoc) {
                const data = dayDoc.data();
                if (data.completedCount >= Math.ceil(data.totalTasks * 0.5)) {
                    streak++;
                } else if (i > 0) {
                    break;
                }
            } else if (i > 0) {
                break;
            }
        }
        return streak;
    } catch (err: any) {
        console.warn(`[Firestore] Could not calculate streak:`, err?.message);
        return 0;
    }
}

/* ═══════════════════════════════════════════
   HYDRATION TRACKER
   Subcollection: hydration/{uid}/days/{date}
   ═══════════════════════════════════════════ */

export interface HydrationLog {
    time: string;
    amount: number;
    type: string;
}

export interface HydrationDay {
    glasses: number;
    target: number;
    totalMl: number;
    logs: HydrationLog[];
    date: string;
    updatedAt?: any;
}

export async function saveHydration(uid: string, date: string, data: HydrationDay) {
    await safeSetDoc({
        ...data,
        updatedAt: serverTimestamp(),
    }, "hydration", uid, "days", date);
}

export function subscribeToHydration(
    uid: string,
    date: string,
    callback: (data: HydrationDay | null) => void
) {
    return safeSubscribeToDoc(callback, "hydration", uid, "days", date);
}

export async function getHydrationHistory(uid: string, days: number = 7): Promise<HydrationDay[]> {
    try {
        const q = query(
            collection(db, "hydration", uid, "days"),
            orderBy("date", "desc"),
            limit(days)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as HydrationDay);
    } catch (err: any) {
        console.warn(`[Firestore] Could not fetch hydration history:`, err?.message);
        return [];
    }
}

/* ═══════════════════════════════════════════
   AGNI (Digestive Fire) MONITOR
   Subcollection: agniLogs/{uid}/days/{date}
   ═══════════════════════════════════════════ */

export interface AgniDay {
    appetite: number;    // 1-5 scale
    digestion: number;   // 1-5 scale
    energy: number;      // 1-5 scale
    agniScore: number;   // average of 3
    agniType: string;    // "Sama" | "Vishama" | "Tikshna" | "Manda"
    date: string;
    notes?: string;
    updatedAt?: any;
}

export async function saveAgniLog(uid: string, date: string, data: AgniDay) {
    await safeSetDoc({
        ...data,
        updatedAt: serverTimestamp(),
    }, "agniLogs", uid, "days", date);
}

export function subscribeToAgniDay(
    uid: string,
    date: string,
    callback: (data: AgniDay | null) => void
) {
    return safeSubscribeToDoc(callback, "agniLogs", uid, "days", date);
}

export async function getAgniHistory(uid: string, days: number = 14): Promise<AgniDay[]> {
    try {
        const q = query(
            collection(db, "agniLogs", uid, "days"),
            orderBy("date", "desc"),
            limit(days)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data() as AgniDay);
    } catch (err: any) {
        console.warn(`[Firestore] Could not fetch agni history:`, err?.message);
        return [];
    }
}

/* ═══════════════════════════════════════════
   VIKRUTI (Current Imbalance) ASSESSMENT
   Subcollection: vikrutiLogs/{uid}/assessments/{date}
   ═══════════════════════════════════════════ */

export interface VikrutiLog {
    vataScore: number;   // 0-100
    pittaScore: number;  // 0-100
    kaphaScore: number;  // 0-100
    dominantImbalance: string; // "Vata" | "Pitta" | "Kapha" | "Balanced"
    symptoms: string[];
    date: string;
    updatedAt?: any;
}

export async function saveVikrutiLog(uid: string, date: string, data: VikrutiLog) {
    await safeSetDoc({
        ...data,
        updatedAt: serverTimestamp(),
    }, "vikrutiLogs", uid, "assessments", date);
}

export function subscribeToLatestVikruti(
    uid: string,
    callback: (data: VikrutiLog | null) => void
) {
    const cacheKey = `@firestore_cache_latestVikruti_${uid}`;
    AsyncStorage.getItem(cacheKey).then(c => { if(c) { try { callback(JSON.parse(c)); } catch(e){} } });

    // Subscribe to the latest assessment by ordering by date desc
    const q = query(
        collection(db, "vikrutiLogs", uid, "assessments"),
        orderBy("date", "desc"),
        limit(1)
    );
    return onSnapshot(q, (snap) => {
        if (!snap.empty) {
            const data = snap.docs[0].data() as VikrutiLog;
            AsyncStorage.setItem(cacheKey, JSON.stringify(data));
            callback(data);
        } else {
            callback(null);
        }
    });
}

export async function getLatestVikruti(uid: string): Promise<VikrutiLog | null> {
    try {
        const q = query(
            collection(db, "vikrutiLogs", uid, "assessments"),
            orderBy("date", "desc"),
            limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return snap.docs[0].data() as VikrutiLog;
    } catch (err: any) {
        console.warn(`[Firestore] Could not fetch latest vikruti:`, err?.message);
        return null;
    }
}

/** Get the average Agni score from the last N days (for AI feedback loop) */
export async function getRecentAgniAverage(uid: string, days: number = 5): Promise<{ avgScore: number; dominantType: string } | null> {
    try {
        const q = query(
            collection(db, "agniLogs", uid, "days"),
            orderBy("date", "desc"),
            limit(days)
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;

        const logs = snap.docs.map((d) => d.data() as AgniDay);
        const avgScore = Math.round((logs.reduce((sum, l) => sum + l.agniScore, 0) / logs.length) * 10) / 10;

        // Find the most common agni type
        const typeCounts: Record<string, number> = {};
        logs.forEach((l) => { typeCounts[l.agniType] = (typeCounts[l.agniType] || 0) + 1; });
        const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Sama";

        return { avgScore, dominantType };
    } catch (err: any) {
        console.warn(`[Firestore] Could not calculate recent agni:`, err?.message);
        return null;
    }
}
