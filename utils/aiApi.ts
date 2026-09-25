/**
 * AI API Helper
 * Routes standard JSON generation and chat to the backend FastAPI (which uses Groq).
 * Routes vision requests directly to an image-capable model.
 */

/* ═══════════════════════════════════════════
   callAIVision — image + text
   ═══════════════════════════════════════════ */
export async function callAIVision(
    prompt: string,
    base64Image: string,
    mimeType: string = "image/jpeg",
    maxTokens = 4000
): Promise<string> {
    const { Platform } = require('react-native');
    const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
    const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || defaultUrl;

    console.log(`[Backend Vision AI] Forwarding to ${API_URL}`);
    const response = await fetch(`${API_URL}/api/analyze-food/`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify({ 
            prompt, 
            base64_image: base64Image, 
            mime_type: mimeType 
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Vision API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    
    if (data.status === "error") {
        throw new Error(`Vision API Error: ${data.message}`);
    }

    const text = data.response || "";
    if (!text) throw new Error("Vision API returned empty response");

    try {
        const { extractAndParseJSON } = require("./parseJSON");
        extractAndParseJSON(text, (parsed: any) => {
            if (Array.isArray(parsed)) return parsed.length > 0;
            if (parsed && typeof parsed === "object") return Object.keys(parsed).length > 0;
            return false;
        });
    } catch (parseErr: any) {
        throw new Error("Vision API returned invalid/truncated JSON: " + parseErr.message);
    }

    console.log("[Backend Vision AI] ✅ Success");
    return text;
}

/* ═══════════════════════════════════════════
   callAIChat — for conversational AI
   Routed to Backend FastAPI
   ═══════════════════════════════════════════ */
const recentCalls = new Map<string, { promise: Promise<string>; timestamp: number }>();
const CACHE_DURATION = 5000;

export async function callAIChat(
    prompt: string,
    maxTokens = 4000
): Promise<string> {
    const cacheKey = `${prompt.slice(0, 100)}_${maxTokens}`;
    const now = Date.now();

    const recentCall = recentCalls.get(cacheKey);
    if (recentCall && (now - recentCall.timestamp) < CACHE_DURATION) {
        return recentCall.promise;
    }

    const requestPromise = (async () => {
        const { Platform } = require('react-native');
        const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
        const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || defaultUrl;

        console.log(`[Backend Chat AI] Forwarding to ${API_URL}`);
        const response = await fetch(`${API_URL}/api/chat/`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Bypass-Tunnel-Reminder": "true" 
            },
            body: JSON.stringify({ query: prompt }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Backend API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        if (data.status === "error") {
            throw new Error(`Backend AI Error: ${data.message}`);
        }

        console.log("[Backend Chat AI] ✅ Success");
        return data.response || "";
    })();

    recentCalls.set(cacheKey, { promise: requestPromise, timestamp: now });

    if (recentCalls.size > 50) {
        const cutoff = now - CACHE_DURATION;
        for (const [key, value] of recentCalls.entries()) {
            if (value.timestamp < cutoff) {
                recentCalls.delete(key);
            }
        }
    }

    return requestPromise;
}

/* ═══════════════════════════════════════════
   callAI — text only (with JSON validation)
   Routed to Backend FastAPI
   ═══════════════════════════════════════════ */
export async function callAI(
    prompt: string,
    maxTokens = 4000
): Promise<string> {
    const { Platform } = require('react-native');
    const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
    const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || defaultUrl;

    console.log(`[Backend JSON AI] Forwarding to ${API_URL}`);
    const response = await fetch(`${API_URL}/api/generate-llm/`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Backend API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    
    if (data.status === "error") {
        throw new Error(`Backend AI Error: ${data.message}`);
    }

    const text = data.response || "";
    
    try {
        const { extractAndParseJSON } = require("./parseJSON");
        extractAndParseJSON(text, (parsed: any) => {
            if (Array.isArray(parsed)) return parsed.length > 0;
            if (parsed && typeof parsed === "object") return Object.keys(parsed).length > 0;
            return false;
        });
    } catch (parseErr: any) {
        throw new Error("Backend returned invalid/truncated JSON: " + parseErr.message);
    }

    console.log("[Backend JSON AI] ✅ Success");
    return text;
}
