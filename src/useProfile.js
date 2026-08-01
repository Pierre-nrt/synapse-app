import { useState, useEffect, useCallback } from "react";
import { CHALLENGE_TYPES } from "./challenges.js";
import { todayStr, yesterdayStr } from "./rng.js";

const STORAGE_KEY = "synapse:profile";

export const THEMES = [
  { id: "gold", unlockLevel: 1, accent: "#E8C468" },
  { id: "teal", unlockLevel: 5, accent: "#4FA3A0" },
  { id: "coral", unlockLevel: 10, accent: "#D66B63" },
  { id: "violet", unlockLevel: 15, accent: "#9B8AC4" },
];

export const BADGES = [
  { id: "firstDay", cond: (p) => p.lastCompletedDate !== null },
  { id: "streak3", cond: (p) => p.streak >= 3 },
  { id: "streak7", cond: (p) => p.streak >= 7 },
  { id: "streak30", cond: (p) => p.streak >= 30 },
  { id: "level5", cond: (p) => p.level >= 5 },
  { id: "level10", cond: (p) => p.level >= 10 },
  { id: "hundred", cond: (p) => p.stats.totalCorrect >= 100 },
  { id: "perfect", cond: (p) => p.stats.perfectSessions >= 1 },
];

function defaultProfile() {
  return {
    xp: 0,
    level: 1,
    coins: 20,
    hints: 1,
    streak: 0,
    lastCompletedDate: null,
    completedToday: { date: "", types: {} },
    dailyRewardClaimedDate: "",
    badges: [],
    lang: "fr",
    theme: "gold",
    premium: false,
    stats: {
      totalCompleted: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      perfectSessions: 0,
      totalTimePlayedSec: 0,
      bestScores: { memory: 0, calc: 0, logic: 0, observation: 0, concentration: 0 },
    },
  };
}

function levelFromXp(xp) {
  let level = 1;
  let total = 0;
  let need = 100;
  while (xp >= total + need) {
    total += need;
    level++;
    need = 100 + (level - 1) * 40;
  }
  return level;
}

export function xpProgress(xp) {
  let level = 1;
  let total = 0;
  let need = 100;
  while (xp >= total + need) {
    total += need;
    level++;
    need = 100 + (level - 1) * 40;
  }
  return { level, into: xp - total, need };
}

function mergeDefaults(saved) {
  const d = defaultProfile();
  return {
    ...d,
    ...saved,
    stats: { ...d.stats, ...(saved?.stats || {}), bestScores: { ...d.stats.bestScores, ...(saved?.stats?.bestScores || {}) } },
    completedToday: saved?.completedToday || d.completedToday,
  };
}

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [lastUnlockedBadges, setLastUnlockedBadges] = useState([]);
  const [leveledUp, setLeveledUp] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setProfile(mergeDefaults(raw ? JSON.parse(raw) : null));
    } catch (e) {
      setProfile(defaultProfile());
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || !profile) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      /* stockage indisponible : l'app continue de fonctionner en mémoire */
    }
  }, [profile, loaded]);

  const todaysTypes = useCallback(() => {
    if (!profile) return {};
    const today = todayStr();
    return profile.completedToday && profile.completedToday.date === today ? profile.completedToday.types : {};
  }, [profile]);

  const completeChallenge = useCallback((type, { score, maxScore, xp, coins, timeSec }) => {
    const today = todayStr();
    setProfile((prev) => {
      const prevTypes = prev.completedToday && prev.completedToday.date === today ? prev.completedToday.types : {};
      const alreadyDoneToday = !!prevTypes[type];
      const types = { ...prevTypes, [type]: true };
      const allDoneNow = CHALLENGE_TYPES.every((t) => types[t]);
      const wasAllDoneBefore = CHALLENGE_TYPES.every((t) => prevTypes[t]);

      let streak = prev.streak;
      let lastCompletedDate = prev.lastCompletedDate;
      if (allDoneNow && !wasAllDoneBefore) {
        const y = yesterdayStr();
        if (lastCompletedDate === y) streak = prev.streak + 1;
        else streak = 1;
        lastCompletedDate = today;
      }

      const awardXp = alreadyDoneToday ? 0 : xp;
      const awardCoins = alreadyDoneToday ? 0 : coins;
      const newXp = prev.xp + awardXp;
      const newLevel = levelFromXp(newXp);
      const leveledUpNow = newLevel > prev.level;

      const stats = alreadyDoneToday
        ? prev.stats
        : {
            ...prev.stats,
            totalCompleted: prev.stats.totalCompleted + 1,
            totalCorrect: prev.stats.totalCorrect + score,
            totalQuestions: prev.stats.totalQuestions + maxScore,
            perfectSessions: prev.stats.perfectSessions + (score === maxScore && maxScore > 0 ? 1 : 0),
            totalTimePlayedSec: prev.stats.totalTimePlayedSec + (timeSec || 0),
            bestScores: { ...prev.stats.bestScores, [type]: Math.max(prev.stats.bestScores[type] || 0, score) },
          };

      const candidateProfile = { ...prev, xp: newXp, level: newLevel, streak, lastCompletedDate, stats };
      const newlyUnlocked = BADGES.filter((b) => !prev.badges.includes(b.id) && b.cond(candidateProfile)).map((b) => b.id);

      setLastUnlockedBadges(newlyUnlocked);
      setLeveledUp(leveledUpNow);

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        coins: prev.coins + awardCoins,
        streak,
        lastCompletedDate,
        completedToday: { date: today, types },
        stats,
        badges: [...prev.badges, ...newlyUnlocked],
      };
    });
  }, []);

  const claimDailyReward = useCallback(() => {
    const today = todayStr();
    let claimed = false;
    let amount = 0;
    setProfile((prev) => {
      if (prev.dailyRewardClaimedDate === today) return prev;
      amount = 10 + Math.floor(Math.random() * 21);
      claimed = true;
      return { ...prev, coins: prev.coins + amount, dailyRewardClaimedDate: today };
    });
    return { claimed, amount };
  }, []);

  const useHint = useCallback(() => {
    let ok = false;
    setProfile((prev) => {
      if (prev.hints <= 0) return prev;
      ok = true;
      return { ...prev, hints: prev.hints - 1 };
    });
    return ok;
  }, []);

  const earnHintFromAd = useCallback(() => {
    setProfile((prev) => ({ ...prev, hints: prev.hints + 1 }));
  }, []);

  const setLang = useCallback((lang) => setProfile((prev) => ({ ...prev, lang })), []);
  const setTheme = useCallback((theme) => setProfile((prev) => ({ ...prev, theme })), []);
  const togglePremium = useCallback(() => setProfile((prev) => ({ ...prev, premium: !prev.premium })), []);
  const resetProfile = useCallback(() => setProfile(defaultProfile()), []);

  return {
    profile,
    loaded,
    todaysTypes,
    completeChallenge,
    claimDailyReward,
    useHint,
    earnHintFromAd,
    setLang,
    setTheme,
    togglePremium,
    resetProfile,
    lastUnlockedBadges,
    leveledUp,
    clearFlags: () => {
      setLastUnlockedBadges([]);
      setLeveledUp(false);
    },
  };
}
