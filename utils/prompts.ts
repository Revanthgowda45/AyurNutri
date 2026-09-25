/**
 * Centralized AI Prompt Builder for AyurNutri
 * Professional, structured prompts for accurate Ayurvedic information.
 */

/* ═══════════════════════════════════════════════════
   0. CHAT BOT - AYURVEDIC AI ASSISTANT
   ═══════════════════════════════════════════════════ */
export function buildChatPrompt(
  userMessage: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  userContext: {
    doshaType?: string;
    doshaAnalysis?: any;
    goals?: string[];
    diet?: string;
    region?: string;
    todayMeals?: any[];
  }
): string {
  const { doshaType, doshaAnalysis, goals, diet, region, todayMeals } = userContext;

  // Build user context summary
  let contextSummary = "";
  
  if (doshaType && doshaType !== "Discover") {
    contextSummary += `\nPatient's Prakriti (Constitution): ${doshaType}`;
    if (doshaAnalysis) {
      try {
        const analysis = typeof doshaAnalysis === 'string' ? JSON.parse(doshaAnalysis) : doshaAnalysis;
        contextSummary += `\n• Strengths: ${(analysis.strengths || []).slice(0, 3).join(', ')}`;
        contextSummary += `\n• Health Focus: ${(analysis.challenges || []).slice(0, 2).join(', ')}`;
        contextSummary += `\n• Recommended Diet: ${(analysis.dietTips || []).slice(0, 2).join(' | ')}`;
      } catch {}
    }
  }

  if (goals && goals.length > 0) {
    contextSummary += `\nWellness Goals: ${goals.join(', ')}`;
  }

  if (diet) {
    contextSummary += `\nDietary Preference: ${diet}`;
  }

  if (region && region !== "India") {
    contextSummary += `\nRegion: ${region}, India`;
  }

  if (todayMeals && todayMeals.length > 0) {
    contextSummary += `\n\nToday's Planned Meals:`;
    todayMeals.forEach((meal, i) => {
      contextSummary += `\n${i + 1}. ${meal.emoji || '🍽'} ${meal.name} (${meal.calories || '?'} kcal)`;
    });
  }

  // Format chat history
  const historyText = chatHistory.slice(-6).map(msg => {
    const prefix = msg.role === 'user' ? 'Patient' : 'Vaidya';
    return `${prefix}: ${msg.content}`;
  }).join('\n');

  return `You are Vaidya AI, a wise and compassionate Ayurvedic health assistant with deep knowledge of classical Ayurvedic texts (Charaka Samhita, Sushruta Samhita, Ashtanga Hridaya). You speak like a knowledgeable friend - warm, encouraging, and authentic. You're not robotic or overly formal, but you always ground your advice in authentic Ayurvedic principles.

YOUR PERSONALITY:
• Warm, patient, and encouraging - like a trusted wellness mentor
• Use occasional emojis to keep conversations friendly ✨🌿
• Reference Ayurvedic concepts naturally (Agni, Dosha, Prakriti, etc.)
• Be concise but thorough - 2-4 sentences for simple questions, longer for complex ones
• Always personalize advice based on the user's context
• If you don't know something, be honest and suggest consulting a BAMS practitioner

USER CONTEXT:${contextSummary || '\nNew user - no assessment completed yet. Encourage them to take the Dosha assessment.'}

CONVERSATION HISTORY:
${historyText || 'This is the start of the conversation.'}

CURRENT MESSAGE:
Patient: ${userMessage}

INSTRUCTIONS:
1. Respond as Vaidya AI - warm, knowledgeable, and personalized
2. NEVER use markdown tables. If you need to list things, use simple, short bullet points.
3. Keep responses VERY SIMPLE, concise, and easy to read on a mobile screen.
4. Reference their Dosha/Prakriti if available
5. Suggest specific Ayurvedic foods, herbs, or practices when relevant
6. If they ask about their meal plan, reference their today's meals
7. For health concerns, be supportive but remind them you're not a replacement for medical care
8. Keep responses conversational and engaging
9. Do not use overly dense formatting.

Vaidya AI:`;
}

export function buildQuickReplyPrompt(
  userContext: {
    doshaType?: string;
    goals?: string[];
    todayMeals?: any[];
    checkedMeals?: Record<string, boolean>;
  }
): string {
  const { doshaType, goals, todayMeals, checkedMeals } = userContext;
  
  let mealProgress = "";
  if (todayMeals && todayMeals.length > 0 && checkedMeals) {
    const consumed = todayMeals.filter((_, i) => checkedMeals[`0-${i}`]).length;
    mealProgress = `${consumed}/${todayMeals.length} meals consumed today`;
  }

  return `You are Vaidya AI, an Ayurvedic wellness assistant. Generate 4 quick reply suggestions that the user might want to ask based on their current context.

USER CONTEXT:
${doshaType ? `• Dosha: ${doshaType}` : '• No dosha assessment yet'}
${goals?.length ? `• Goals: ${goals.join(', ')}` : ''}
${mealProgress ? `• Progress: ${mealProgress}` : ''}

Generate 4 natural, conversational quick replies the user might want to tap. Make them diverse - mix of practical advice requests, recipe ideas, and wellness tips. Keep each under 6 words.

RESPOND WITH ONLY A VALID JSON ARRAY:
["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"]

Examples:
["What should I eat for dinner?", "Suggest a Vata-balancing tea", "How to improve digestion?", "Quick healthy snack ideas"]`;
}

/* ═══════════════════════════════════════════════════
   1. DOSHA ASSESSMENT ANALYSIS
   ═══════════════════════════════════════════════════ */
export function buildDoshaAnalysisPrompt(
  doshaType: string,
  vataScore: number,
  pittaScore: number,
  kaphaScore: number,
  totalQuestions: number
): string {
  return `You are a certified Ayurvedic practitioner (BAMS) with 20+ years of clinical experience in Prakriti analysis and Ayurvedic lifestyle counseling.

A patient has completed a Dosha Prakriti assessment with the following results:
- Primary Constitution (Prakriti): ${doshaType}
- Vata Score: ${vataScore}/${totalQuestions} (${Math.round((vataScore / totalQuestions) * 100)}%)
- Pitta Score: ${pittaScore}/${totalQuestions} (${Math.round((pittaScore / totalQuestions) * 100)}%)
- Kapha Score: ${kaphaScore}/${totalQuestions} (${Math.round((kaphaScore / totalQuestions) * 100)}%)

Based on classical Ayurvedic texts (Charaka Samhita, Ashtanga Hridaya) and modern Ayurvedic practice, provide a comprehensive personalized analysis.

RESPOND WITH ONLY VALID JSON — no markdown, no backticks, no explanation outside JSON:
{
  "summary": "A 2-3 sentence personalized overview of their ${doshaType} constitution explaining what it means in daily life. Reference the specific dosha elements (Vata=Air+Space, Pitta=Fire+Water, Kapha=Earth+Water).",
  "strengths": [
    "4-5 genuine strengths specific to ${doshaType} prakriti (physical, mental, emotional). Be specific, not generic."
  ],
  "challenges": [
    "4-5 real health vulnerabilities and imbalance tendencies for ${doshaType}. Include seasonal vulnerability."
  ],
  "dietTips": [
    "5-6 specific, actionable Ayurvedic diet recommendations for ${doshaType}. Include specific Indian foods, tastes (rasa) to favor/avoid, and meal timing based on Agni (digestive fire)."
  ],
  "lifestyleTips": [
    "4-5 daily routine (Dinacharya) recommendations specific to ${doshaType}. Include wake time, exercise type, oil for Abhyanga, and relaxation techniques."
  ],
  "yogaPoses": [
    "4-5 specific yoga asanas beneficial for ${doshaType} balance with brief benefit explanation. Use proper Sanskrit names."
  ],
  "herbs": [
    "5-6 Ayurvedic herbs/spices beneficial for ${doshaType}. Use proper names (e.g., Ashwagandha, Brahmi, Triphala). Include how to consume them."
  ],
  "seasonalAdvice": "A detailed paragraph about which season (Ritu) is most challenging for ${doshaType} and practical seasonal regimen (Ritucharya) advice. Reference specific months."
}

IMPORTANT RULES:
- All information must be factually grounded in Ayurvedic science
- Diet tips must reference specific Indian foods and spices
- Herbs must be real Ayurvedic herbs with correct names
- Yoga poses must be real asanas with Sanskrit names
- Be specific to ${doshaType} — avoid generic wellness advice
- Every item should be a complete, actionable sentence`;
}

/* ═══════════════════════════════════════════════════
   2. RECIPE GENERATION
   ═══════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════
   3. MEAL PLAN GENERATION
   3b. MEAL DETAIL — On-demand Ayurvedic enrichment
   ═══════════════════════════════════════════════════ */
export function buildMealDetailPrompt(
  mealName: string,
  mealType: string,
  doshaType?: string
): string {
  const doshaContext = doshaType
    ? `The patient's Prakriti is ${doshaType}. Tailor all analysis to ${doshaType} dosha balance.`
    : "Provide general tridoshic analysis.";

  return `You are a senior Ayurvedic nutritionist (M.D. Ayurveda — Ahara Shastra specialist) and Indian food content expert.

${doshaContext}

Analyze this meal: "${mealName}" (${mealType} meal).

RESPOND WITH ONLY VALID JSON — no markdown, no backticks:
{
  "ingredients": [
    { "name": "Ingredient name", "quantity": "precise amount e.g., 50g or 1 tsp", "emoji": "relevant food emoji", "ayurvedicNote": "Brief Ayurvedic property e.g., 'Pitta-pacifying, cooling'" }
  ],
  "instructions": [
    "Step 1: Clear, concise cooking instruction with Ayurvedic tip if applicable",
    "Step 2: Next preparation step",
    "Step 3: Continue with cooking process",
    "Step 4: Final steps and serving suggestion"
  ],
  "guna": "Ayurvedic quality e.g., 'Laghu · Snigdha' (Light · Unctuous)",
  "virya": "Potency e.g., 'Ushna (mildly warming)' or 'Shita (cooling)'",
  "doshaEffect": "e.g., 'Strongly Balances ${doshaType || "Tridosha"}'",
  "rasa": ["Sweet", "Astringent"],
  "preparationTip": "One Ayurvedic preparation/eating tip referencing classical texts (Charaka Samhita etc.)",
  "videos": [
    {
      "title": "Exact real YouTube video title for this recipe",
      "channel": "Real YouTube channel name (e.g., Hebbar's Kitchen, Nisha Madhulika, Sanjeev Kapoor)",
      "searchQuery": "YouTube search query to find this video",
      "doshaMatch": 85,
      "reason": "One sentence why this video is good for ${doshaType || "general"} dosha"
    }
  ]
}

RULES:
- Include 5-8 realistic ingredients with precise quantities for this dish
- Include 4-6 clear, concise step-by-step cooking instructions for preparing this dish
- Each instruction step should be actionable and specific (not vague)
- Include Ayurvedic cooking tips where relevant (e.g., "Add cumin seeds to hot ghee — this releases volatile oils that kindle Agni")
- ayurvedicNote should mention dosha impact or Ayurvedic property
- rasa must be from: Sweet, Sour, Salty, Pungent, Bitter, Astringent
- guna from: Laghu/Guru (Light/Heavy), Snigdha/Ruksha (Unctuous/Dry), Ushna/Shita (Hot/Cold)
- preparationTip should be specific and actionable
- Include EXACTLY 1 YouTube video suggestion
- The video must reference a REAL popular Indian cooking YouTube channel
- doshaMatch is a percentage (0-100) of how well the video recipe matches ${doshaType || "tridoshic"} requirements
- searchQuery should be a realistic YouTube search string that would find this recipe`;
}

/* ═══════════════════════════════════════════════════
   4. FOOD SCANNER VISION ANALYSIS
   ═══════════════════════════════════════════════════ */
export function buildFoodScannerPrompt(doshaType?: string, dietPreference?: string): string {
  const doshaGuidance = doshaType
    ? `The user's dosha is ${doshaType}. Provide a personalized recommendation on whether this food is balancing or aggravating for them.`
    : "The user has no known dosha. Provide general Ayurvedic advice.";

  const dietGuidance = dietPreference
    ? `Note: The user follows a ${dietPreference} diet. ${dietPreference.toLowerCase() === 'mixed' ? "User consumes both vegetarian and non-vegetarian food." : `If the food contains ingredients violating this diet, highlight it.`}`
    : "";

  return `You are a professional Ayurvedic nutritionist. Analyze the provided image of food (or text description of food).

${doshaGuidance}
${dietGuidance}

Identify the food and provide a detailed Ayurvedic breakdown.

RESPOND WITH ONLY VALID JSON (no markdown, no backticks, no comments):
{
  "name": "Name of the food/dish identified",
  "compatibility": "Good" | "Neutral" | "Avoid",
  "calories": <estimated calories per typical serving as an integer>,
  "servingSize": "E.g., 1 cup, 1 piece, 100g",
  "ayurvedicProperties": {
    "rasa": "Primary tastes (e.g., Sweet, Pungent, Astringent)",
    "guna": "Qualities (e.g., Heavy, Dry, Hot, Light)",
    "virya": "Potency (Cooling or Heating)",
    "vipaka": "Post-digestive effect (Sweet, Sour, or Pungent)"
  },
  "doshaImpact": {
    "vata": "Increases" | "Decreases" | "Neutral",
    "pitta": "Increases" | "Decreases" | "Neutral",
    "kapha": "Increases" | "Decreases" | "Neutral"
  },
  "recommendation": "2-3 sentences explaining why this food is rated Good/Neutral/Avoid for the user's specific dosha (${doshaType || "general use"}) and how to make it more balancing (e.g., 'Add black pepper to improve digestion').",
  "dietaryWarning": "If it severely violates their ${dietPreference || "general"} diet or is unidentifiable, write a brief warning here. Otherwise, null."
}

RULES:
- Be highly accurate in identifying the food.
- Estimations are fine for calories but make them realistic.
- Ensure the JSON format is strictly followed.
- Do NOT output any text outside of the JSON block.`;
}
