import React, { createContext, ReactNode, useContext, useState } from 'react';

export type Language = 'en' | 'hi' | 'es' | 'fr';

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

export const translations: Translations = {
  preferences: {
    en: 'Preferences',
    hi: 'प्राथमिकताएं',
    es: 'Preferencias',
    fr: 'Préférences',
  },
  notifications: {
    en: 'NOTIFICATIONS',
    hi: 'सूचनाएं',
    es: 'NOTIFICACIONES',
    fr: 'NOTIFICATIONS',
  },
  push_notifs: {
    en: 'Push Notifications',
    hi: 'पुश नोटिफिकेशन',
    es: 'Notificaciones Push',
    fr: 'Notifications Push',
  },
  daily_reminders: {
    en: 'Daily Reminders',
    hi: 'दैनिक अनुस्मारक',
    es: 'Recordatorios Diarios',
    fr: 'Rappels Quotidiens',
  },
  appearance: {
    en: 'APPEARANCE',
    hi: 'दिखावट',
    es: 'APARIENCIA',
    fr: 'APPARENCE',
  },
  theme_mode: {
    en: 'Theme Mode',
    hi: 'थीम मोड',
    es: 'Modo de Tema',
    fr: 'Modo Thème',
  },
  language: {
    en: 'LANGUAGE',
    hi: 'भाषा',
    es: 'IDIOMA',
    fr: 'LANGUE',
  },
  app_language: {
    en: 'App Language',
    hi: 'ऐप की भाषा',
    es: 'Idioma de la aplicación',
    fr: "Langue de l'application",
  },
  save_prefs: {
    en: 'Save Preferences',
    hi: 'प्राथमिकताएं सहेजें',
    es: 'Guardar preferencias',
    fr: 'Enregistrer les préférences',
  },
  notif_desc: {
    en: 'Receive alerts for your diet plans',
    hi: 'अपनी आहार योजनाओं के लिए अलर्ट प्राप्त करें',
    es: 'Recibe alertas de tus planes de dieta.',
    fr: 'Recevez des alertes pour vos régimes alimentaires',
  },
  reminder_desc: {
    en: 'Morning tasks and meal times',
    hi: 'सुबह के कार्य और भोजन का समय',
    es: 'Tareas matutinas y horarios de comidas.',
    fr: 'Tâches du matin et heures des repas',
  },
  // Home
  good_morning: { en: 'Good Morning', hi: 'सुप्रभात', es: 'Buenos días', fr: 'Bon matin' },
  good_afternoon: { en: 'Good Afternoon', hi: 'नमस्कार', es: 'Buenas tardes', fr: 'Bon après-midi' },
  good_evening: { en: 'Good Evening', hi: 'शुभ संध्या', es: 'Buenas noches', fr: 'Bonsoir' },
  dosha_assessment: { en: 'Dosha Assessment', hi: 'दोष मूल्यांकन', es: 'Evaluación Dosha', fr: 'Évaluation Dosha' },
  dosha_desc: { en: 'Discover your Prakriti constitution', hi: 'अपनी प्रकृति संरचना की खोज करें', es: 'Descubre tu constitución Prakriti', fr: 'Découvrez votre constitution Prakriti' },
  ai_diet_plan: { en: 'AI Diet Plan', hi: 'एआई आहार योजना', es: 'Plan de dieta AI', fr: 'Plan de régime IA' },
  diet_desc: { en: 'Personalized 7-day Ayurvedic meals', hi: 'व्यक्तिगत 7-दिवसीय आयुर्वेदिक भोजन', es: 'Comidas ayurvédicas personalizadas de 7 días', fr: 'Repas ayurvédiques personnalisés de 7 jours' },
  recipe_gen: { en: 'Recipe Generator', hi: 'रेसिपी जेनरेटर', es: 'Generador de recetas', fr: 'Générateur de recettes' },
  recipe_desc: { en: 'Convert ingredients to Dosha recipes', hi: 'सामग्री को दोष व्यंजनों में बदलें', es: 'Convertir ingredientes en recetas Dosha', fr: 'Convertir les ingrédients en recettes Dosha' },
  food_scanner: { en: 'Food Scanner', hi: 'फूड स्कैनर', es: 'Escáner de alimentos', fr: 'Scanner alimentaire' },
  scanner_desc: { en: 'Scan food for Dosha compatibility', hi: 'दोष अनुकूलता के लिए भोजन को स्कैन करें', es: 'Escanear alimentos para compatibilidad Dosha', fr: 'Scanner les aliments pour la compatibilité Dosha' },
  todays_journey: { en: "Today's Journey", hi: 'आज की यात्रा', es: 'El viaje de hoy', fr: "Le voyage d'aujourd'hui" },
  view_week: { en: 'View Week', hi: 'हफ्ता देखें', es: 'Ver semana', fr: 'Voir la semaine' },
  protein: { en: 'Protein', hi: 'प्रोटीन', es: 'Proteína', fr: 'Protéine' },
  carbs: { en: 'Carbs', hi: 'कार्ब्स', es: 'Carbohidratos', fr: 'Glucides' },
  fat: { en: 'Fat', hi: 'वसा', es: 'Grasa', fr: 'Gras' },
  quick_actions: { en: 'Quick Actions', hi: 'त्वरित कार्य', es: 'Acciones rápidas', fr: 'Actions rapides' },
  ayurvedic_tip: { en: 'AYURVEDIC TIP', hi: 'आयुर्वेदिक टिप', es: 'CONSEJO AYURVÉDICO', fr: 'CONSEIL AYURVÉDIQUE' },
  // Meal Plan
  your_meal_plan: { en: 'Your Meal Plan', hi: 'आपकी भोजन योजना', es: 'Tu plan de comidas', fr: 'Votre plan de repas' },
  ai_nutrition: { en: 'AI-powered Ayurvedic nutrition', hi: 'एआई-संचालित आयुर्वेदिक पोषण', es: 'Nutrición ayurvédica impulsada por IA', fr: "Nutrition ayurvédique propulsée par l'IA" },
  new_week: { en: 'New Week', hi: 'नया सप्ताह', es: 'Nueva semana', fr: 'Nouvelle semaine' },
  gen_new_plan: { en: 'Generate your personalized Ayurvedic meal plan for this week', hi: 'इस सप्ताह के लिए अपनी व्यक्तिगत आयुर्वेदिक भोजन योजना तैयार करें', es: 'Genera tu plan de comidas ayurvédico personalizado para esta semana', fr: 'Générez votre plan de repas ayurvédique personnalisé pour cette semaine' },
  generate_plan: { en: 'Generate Plan', hi: 'योजना बनाएं', es: 'Generar plan', fr: 'Générer un plan' },
  how_was_last_week: { en: 'How was last week?', hi: 'पिछला सप्ताह कैसा रहा?', es: '¿Cómo estuvo la semana pasada?', fr: "Comment s'est passée la semaine dernière?" },
  rate_meals_desc: { en: 'Rate meals to help AI personalize your new plan', hi: 'एआई को आपकी नई योजना को व्यक्तिगत बनाने में मदद करने के लिए भोजन को रेट करें', es: 'Califica las comidas para ayudar a la IA a personalizar tu nuevo plan', fr: "Évaluez les repas pour aider l'IA à personnaliser votre nouveau plan" },
  skip_feedback: { en: 'Skip & Generate Without Feedback', hi: 'छोड़ें और प्रतिक्रिया के बिना उत्पन्न करें', es: 'Omitir y generar sin comentarios', fr: 'Ignorer et générer sans commentaires' },
  this_week: { en: 'This Week', hi: 'इस सप्ताह', es: 'Esta semana', fr: 'Cette semaine' },
  // Profile
  ayurvedic_profile: { en: 'AYURVEDIC PROFILE', hi: 'आयुर्वेदिक प्रोफाइल', es: 'PERFIL AYURVÉDICO', fr: 'PROFIL AYURVÉDIQUE' },
  member_since: { en: 'Member since', hi: 'सदस्यता की तिथि', es: 'Miembro desde', fr: 'Membre depuis' },
  ayurvedic_insights: { en: 'AYURVEDIC INSIGHTS', hi: 'आयुर्वेदिक अंतर्दृष्टि', es: 'CONOCIMIENTOS AYURVÉDICOS', fr: 'APERCUS AYURVÉDIQUES' },
  current_constitution: { en: 'Current Constitution', hi: 'वर्तमान संरचना', es: 'Constitución actual', fr: 'Constitution actuelle' },
  tap_to_retake: { en: '(Tap to Retake)', hi: '(फिर से लेने के लिए टैप करें)', es: '(Toca para volver a tomar)', fr: '(Appuyez pour reprendre)' },
  tap_to_start: { en: '(Tap to Start)', hi: '(शुरू करने के लिए टैप करें)', es: '(Toca para comenzar)', fr: '(Appuyez pour commencer)' },
  unknown_dosha: { en: 'Unknown Dosha', hi: 'अज्ञात दोष', es: 'Dosha desconocido', fr: 'Dosha inconnu' },
  dosha_assessment_invite: { en: 'Take the assessment to discover your body type and get personalized recommendations.', hi: 'अपने शरीर के प्रकार की खोज करने और व्यक्तिगत सिफारिशें प्राप्त करने के लिए मूल्यांकन लें।', es: 'Realiza la evaluación para descubrir tu tipo de cuerpo y obtener recomendaciones personalizadas.', fr: "Faites l'évaluation pour découvrir votre type de corps et obtenir des recommandations personnalisées." },
  start_assessment: { en: 'Start Assessment', hi: 'मूल्यांकन शुरू करें', es: 'Iniciar evaluación', fr: "Démarrer l'évaluation" },
  balanced: { en: 'Balanced', hi: 'संतुलित', es: 'Equilibrado', fr: 'Équilibré' },
  progress: { en: 'Progress', hi: 'प्रगति', es: 'Progreso', fr: 'Progrès' },
  personal_details: { en: 'PERSONAL DETAILS', hi: 'व्यक्तिगत विवरण', es: 'DETALLES PERSONALES', fr: 'DÉTAILS PERSONNELS' },
  full_name_edit: { en: 'Full Name (Tap to Edit)', hi: 'पूरा नाम (संपादित करने के लिए टैप करें)', es: 'Nombre completo (toca para editar)', fr: 'Nom complet (Appuyez pour modifier)' },
  email: { en: 'Email', hi: 'ईमेल', es: 'Correo electrónico', fr: 'E-mail' },
  password: { en: 'Password', hi: 'पासवर्ड', es: 'Contraseña', fr: 'Mot de passe' },
  update_password: { en: 'Update Password', hi: 'पासवर्ड अपडेट करें', es: 'Actualizar contraseña', fr: 'Mettre à jour le mot de passe' },
  wellness_journey: { en: 'WELLNESS JOURNEY', hi: 'कल्याण यात्रा', es: 'VIAJE DE BIENESTAR', fr: 'VOYAGE DE BIEN-ÊTRE' },
  active_diet_plan: { en: 'Active Diet Plan', hi: 'सक्रिय आहार योजना', es: 'Plan de dieta activo', fr: 'Plan de régime actif' },
  your_dietitian: { en: 'Your Dietitian', hi: 'आपका आहार विशेषज्ञ', es: 'Tu dietista', fr: 'Votre diététicien' },
  health_profile: { en: 'Health Profile', hi: 'स्वास्थ्य प्रोफाइल', es: 'Perfil de salud', fr: 'Profil de santé' },
  wellness_goals: { en: 'Wellness Goals', hi: 'कल्याण लक्ष्य', es: 'Objetivos de bienestar', fr: 'Objectifs de bien-être' },
  favorite_recipes: { en: 'FAVORITE RECIPES', hi: 'पसंदीदा रेसिपी', es: 'RECETAS FAVORITAS', fr: 'RECETTES PRÉFÉRÉES' },
  view_all: { en: 'View All', hi: 'सभी देखें', es: 'Ver todo', fr: 'Voir tout' },
  app_preferences: { en: 'PREFERENCES', hi: 'प्राथमिकताएं', es: 'PREFERENCIAS', fr: 'PRÉFÉRENCES' },
  sign_out: { en: 'Sign Out', hi: 'साइन आउट', es: 'Cerrar sesión', fr: 'Se déconnecter' },
  dosha: { en: 'DOSHA', hi: 'दोष', es: 'DOSHA', fr: 'DOSHA' },
  plans: { en: 'PLANS', hi: 'योजनाएं', es: 'PLANES', fr: 'PLANS' },
  streak: { en: 'STREAK', hi: 'सिलसिला', es: 'RACHA', fr: 'SÉRIE' },
  // Chat Bot
  chat_bot: { en: 'Ask Vaidya AI', hi: 'वैद्या AI से पूछें', es: 'Pregunta a Vaidya AI', fr: 'Demandez à Vaidya AI' },
  chat_bot_desc: { en: 'Your personal Ayurvedic guide', hi: 'आपका व्यक्तिगत आयुर्वेदिक गाइड', es: 'Tu guía ayurvédica personal', fr: 'Votre guide ayurvédique personnel' },
  chat_placeholder: { en: 'Ask Vaidya anything...', hi: 'वैद्या से कुछ भी पूछें...', es: 'Pregunta cualquier cosa a Vaidya...', fr: 'Demandez n\'importe quoi à Vaidya...' },
  chat_typing: { en: 'Vaidya is thinking...', hi: 'वैद्या सोच रहा है...', es: 'Vaidya está pensando...', fr: 'Vaidya réfléchit...' },
  chat_clear: { en: 'Clear Chat', hi: 'चैट साफ़ करें', es: 'Borrar chat', fr: 'Effacer la conversation' },
  chat_subtitle: { en: 'Your Ayurvedic Guide', hi: 'आपका आयुर्वेदिक गाइड', es: 'Tu Guía Ayurvédica', fr: 'Votre Guide Ayurvédique' },
  // Dinacharya
  dinacharya: { en: 'Daily Routine', hi: 'दिनचर्या', es: 'Rutina Diaria', fr: 'Routine Quotidienne' },
  dinacharya_desc: { en: 'Ayurvedic Dinacharya rituals', hi: 'आयुर्वेदिक दिनचर्या अनुष्ठान', es: 'Rituales de Dinacharya ayurvédicos', fr: 'Rituels Dinacharya ayurvédiques' },
  dinacharya_sub: { en: 'Ayurvedic Dinacharya', hi: 'आयुर्वेदिक दिनचर्या', es: 'Dinacharya Ayurvédica', fr: 'Dinacharya Ayurvédique' },
  tasks_done: { en: 'tasks done', hi: 'कार्य पूर्ण', es: 'tareas hechas', fr: 'tâches faites' },
  day_streak: { en: 'day streak', hi: 'दिन का सिलसिला', es: 'racha de días', fr: 'jours consécutifs' },
  // Hydration
  hydration: { en: 'Hydration', hi: 'जलयोजन', es: 'Hidratación', fr: 'Hydratation' },
  hydration_desc: { en: 'Ayurvedic water tracker', hi: 'आयुर्वेदिक जल ट्रैकर', es: 'Rastreador de agua ayurvédico', fr: 'Suivi hydrique ayurvédique' },
  hydration_sub: { en: 'Ayurvedic Water Tracker', hi: 'आयुर्वेदिक जल ट्रैकर', es: 'Rastreador de Agua Ayurvédico', fr: 'Suivi Hydrique Ayurvédique' },
  glasses_today: { en: 'glasses today', hi: 'आज के गिलास', es: 'vasos hoy', fr: "verres aujourd'hui" },
  water_target: { en: 'daily target', hi: 'दैनिक लक्ष्य', es: 'meta diaria', fr: 'objectif quotidien' },
  // Agni
  agni_monitor: { en: 'Agni Monitor', hi: 'अग्नि मॉनिटर', es: 'Monitor de Agni', fr: 'Moniteur Agni' },
  agni_monitor_desc: { en: 'Track Digestive Fire', hi: 'पाचन अग्नि को ट्रैक करें', es: 'Rastrear fuego digestivo', fr: 'Suivre le feu digestif' },
  agni_sub: { en: 'Track Your Digestive Fire', hi: 'अपनी पाचन अग्नि को ट्रैक करें', es: 'Rastrea tu Fuego Digestivo', fr: 'Suivez Votre Feu Digestif' },
  // Vikruti
  vikruti_assessment: { en: 'Current Imbalance', hi: 'वर्तमान असंतुलन', es: 'Desequilibrio Actual', fr: 'Déséquilibre Actuel' },
  vikruti_desc: { en: 'Prakruti vs Vikruti check', hi: 'प्रकृति बनाम विकृति जाँच', es: 'Control Prakruti vs Vikruti', fr: 'Contrôle Prakruti vs Vikruti' },
  vikruti_sub: { en: 'Prakruti vs Vikruti Analysis', hi: 'प्रकृति बनाम विकृति विश्लेषण', es: 'Análisis Prakruti vs Vikruti', fr: 'Analyse Prakruti vs Vikruti' },

};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
