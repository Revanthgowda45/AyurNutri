/**
 * Robust JSON extraction utility.
 * Handles cases where AI models (especially OpenRouter) return
 * extra text/markdown around the JSON object or array,
 * AND truncated JSON from token-limited free models.
 */

/**
 * Extracts and parses a JSON object or array from an AI response string.
 * Uses proper brace-depth matching to find the correct JSON boundary,
 * even when models include extra text, thinking tags, or explanations.
 * If the JSON is truncated, attempts to repair it by closing open braces.
 */
export function extractAndParseJSON<T = any>(raw: string, validator?: (data: any) => boolean): T {
    let text = raw.trim();

    // Strip <think>...</think> blocks (DeepSeek, some models emit reasoning)
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // Strip markdown code fences: ```json ... ``` or ``` ... ```
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    // Fix unquoted property keys (common AI quirk)
    text = text.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

    // Find the first '{' or '['
    const objStart = text.indexOf("{");
    const arrStart = text.indexOf("[");

    let start = -1;
    let openChar = "";
    let closeChar = "";

    if (objStart === -1 && arrStart === -1) {
        return JSON.parse(text);
    } else if (objStart === -1) {
        start = arrStart;
        openChar = "[";
        closeChar = "]";
    } else if (arrStart === -1) {
        start = objStart;
        openChar = "{";
        closeChar = "}";
    } else {
        if (objStart < arrStart) {
            start = objStart;
            openChar = "{";
            closeChar = "}";
        } else {
            start = arrStart;
            openChar = "[";
            closeChar = "]";
        }
    }

    // ── Proper brace-depth matching ──
    // Walk forward from `start`, track depth, find the matching close.
    let depth = 0;
    let inString = false;
    let escape = false;
    let matchEnd = -1;

    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === openChar[0] || ch === (openChar === "{" ? "{" : "[")) {
            if (ch === "{" || ch === "[") {
                // Count opens generically
            }
        }
        if (ch === "{" || ch === "[") depth++;
        if (ch === "}" || ch === "]") depth--;
        if (depth === 0) {
            matchEnd = i;
            break;
        }
    }

    let jsonStr: string;
    if (matchEnd !== -1) {
        // Found proper matching close brace
        jsonStr = text.substring(start, matchEnd + 1);
    } else {
        // Truncated — take everything from start
        jsonStr = text.substring(start);
    }

    // First attempt: parse as-is
    let parsed: any;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (error: any) {
        // If it fails to parse, we do NOT attempt repair anymore.
        // We want this to violently fail so the AI API helper catches it
        // and falls back to OpenRouter.
        console.warn("[parseJSON] JSON truncated or invalid — aborting to trigger AI fallback.");
        throw new Error("Truncated or invalid JSON detected: " + error.message);
    }
    
    // If a validation function is provided, run it to ensure the parsed JSON is actually useful
    // (e.g., doesn't just return `{}` or `[]` because the repair cut off all the contents)
    if (typeof arguments[1] === "function") {
        const isValid = arguments[1](parsed);
        if (!isValid) {
            throw new Error("JSON parsed/repaired successfully but failed structural validation.");
        }
    }
    
    return parsed as T;
}

/**
 * Attempts to repair truncated JSON by:
 * 1. Removing trailing incomplete key-value pairs
 * 2. Closing all open brackets/braces
 */
function repairTruncatedJSON(json: string): string {
    let s = json.trim();

    // Remove trailing comma or incomplete value after last comma
    s = s.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, "");
    // Remove trailing comma
    s = s.replace(/,\s*$/, "");

    // Count open vs close braces/brackets
    const stack: string[] = [];
    let inString = false;
    let escape = false;

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === "{" || ch === "[") stack.push(ch);
        if (ch === "}") { if (stack.length && stack[stack.length - 1] === "{") stack.pop(); }
        if (ch === "]") { if (stack.length && stack[stack.length - 1] === "[") stack.pop(); }
    }

    // Close any unclosed string
    if (inString) s += '"';

    // Close open braces/brackets in reverse order
    for (let i = stack.length - 1; i >= 0; i--) {
        s += stack[i] === "{" ? "}" : "]";
    }

    return s;
}
