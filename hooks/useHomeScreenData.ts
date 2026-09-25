import { useAuth } from "@/context/AuthContext";
import * as firestoreDB from "@/services/firestoreService";
import { getTodayIndex, getWeekStartDate } from "@/utils/weekUtils";
import { useEffect, useState } from "react";

export interface Meal {
  name: string;
  type: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageKeyword?: string;
  ingredients?: string[];
  instructions?: string;
}

export interface UserHomeStats {
  dosha: string;
  plans: string;
  streak: string;
  hasActivePlan: boolean;
}

export function useHomeScreenData() {
  const { user } = useAuth();
  
  const [stats, setStats] = useState<UserHomeStats>({
    dosha: "Discover",
    plans: "0 Active",
    streak: "0 Days",
    hasActivePlan: false,
  });

  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<Meal[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubProfile = firestoreDB.subscribeToProfile(user.uid, (d: any) => {
      if (d?.photoURL) setProfilePhoto(d.photoURL);
    });

    const unsubDosha = firestoreDB.subscribeToDoshaResult(user.uid, (d: any) => {
      setStats(prev => ({ ...prev, dosha: d?.doshaType || "Discover" }));
    });

    const unsubOnboarding = firestoreDB.subscribeToOnboarding(user.uid, (d: any) => {
      if (d?.completed) {
        setStats(prev => ({
          ...prev,
          plans: "1 Active",
          streak: "1 Day",
          hasActivePlan: true,
        }));
      } else {
        setStats(prev => ({
          ...prev,
          plans: "0 Active",
          streak: "0 Days",
          hasActivePlan: false,
        }));
      }
    });

    const weekStart = getWeekStartDate();
    const unsubMealPlan = firestoreDB.subscribeToMealPlanWeek(user.uid, weekStart, (data: any) => {
      if (data?.weekPlan?.days) {
        const todayIdx = getTodayIndex();
        const meals = data.weekPlan.days[todayIdx]?.meals || [];
        setTodayMeals(meals);
      } else {
        setTodayMeals([]);
      }
      setLoadingMeals(false);
    });

    const unsubChecked = firestoreDB.subscribeToCheckedMeals(user.uid, weekStart, (data) => {
      setCheckedMeals(data || {});
    });

    const unsubFavorites = firestoreDB.subscribeToFavorites(user.uid, (favs: any[]) => {
      setFavorites(favs);
    });

    return () => {
      unsubDosha();
      unsubOnboarding();
      unsubMealPlan();
      unsubChecked();
      unsubFavorites();
      unsubProfile();
    };
  }, [user?.uid]);

  const toggleMealCheck = (mealIdx: number) => {
    const todayIdx = getTodayIndex();
    const key = `${todayIdx}-${mealIdx}`;
    setCheckedMeals((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      const weekStart = getWeekStartDate();
      if (user?.uid) firestoreDB.saveCheckedMeals(user.uid, updated, weekStart);
      return updated;
    });
  };

  const toggleFavorite = (meal: Meal) => {
    if (!user?.uid) return;
    const isFav = favorites.some((f: any) => f.name === meal.name);
    let updated;
    if (isFav) {
      updated = favorites.filter((f: any) => f.name !== meal.name);
    } else {
      updated = [...favorites, meal];
    }
    setFavorites(updated);
    firestoreDB.saveFavoriteMeals(user.uid, updated);
  };

  /* ── nutrition calculations ── */
  const todayIdx = getTodayIndex();
  const consumedCals = todayMeals.reduce((sum, meal, idx) => {
    return checkedMeals[`${todayIdx}-${idx}`] ? sum + (meal.calories || 0) : sum;
  }, 0);
  
  const totalCals = todayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0) || 1860;
  const progressPercent = totalCals > 0 ? (consumedCals / totalCals) : 0;

  const consumedMacros = todayMeals.reduce((acc, meal, idx) => {
    if (checkedMeals[`${todayIdx}-${idx}`]) {
      acc.p += meal.protein || 0;
      acc.c += meal.carbs || 0;
      acc.f += meal.fat || 0;
    }
    return acc;
  }, { p: 0, c: 0, f: 0 });

  const targetMacros = todayMeals.reduce((acc, meal) => {
    acc.p += meal.protein || 0;
    acc.c += meal.carbs || 0;
    acc.f += meal.fat || 0;
    return acc;
  }, { p: 0, c: 0, f: 0 });

  const goalMacros = {
    p: targetMacros.p || 39,
    c: targetMacros.c || 270,
    f: targetMacros.f || 58
  };

  return {
    user,
    stats,
    todayMeals,
    loadingMeals,
    checkedMeals,
    favorites,
    consumedCals,
    totalCals,
    progressPercent,
    goalMacros,
    consumedMacros,
    profilePhoto,
    toggleMealCheck,
    toggleFavorite,
  };
}
