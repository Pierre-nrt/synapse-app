import React, { useState, useEffect, useRef } from "react";
import {
  Flame, Coins, Star, Gift, Lock, ChevronLeft, Sparkles, Award,
  Home as HomeIcon, BarChart3, Settings as SettingsIcon, Globe, Palette,
  Trash2, Lightbulb,
} from "lucide-react";
import { t, LANGS, LANG_LABEL } from "./i18n.js";
import { generateDailyChallenges, rewardForScore, CHALLENGE_TYPES } from "./challenges.js";
import { todayStr } from "./rng.js";
import { useProfile, xpProgress, THEMES, BADGES } from "./useProfile.js";
import {
  MemoryGame, CalcGame, LogicGame, ObservationGame, ConcentrationGame,
  Constellation, TYPE_META, BannerAd, InterstitialAd, RewardedAdModal,
} from "./components/Games.jsx";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
`;

function LoadingScreen() {
  return (
    <div style={{ background: "#0D0C14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6a6580", fontFamily: "Inter, sans-serif" }}>
      …
    </div>
  );
}

function formatTime(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function App() {
  const {
    profile, loaded, todaysTypes, completeChallenge, claimDailyReward,
    useHint, earnHintFromAd, setLang, setTheme, togglePremium, resetProfile,
    lastUnlockedBadges, leveledUp, clearFlags,
  } = useProfile();

  const [screen, setScreen] = useState("home");
  const [activeType, setActiveType] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [rewardClaimedFlash, setRewardClaimedFlash] = useState(null);
  const sessionCountRef = useRef(0);

  useEffect(() => {
    setDailyData(generateDailyChallenges(todayStr()));
  }, []);

  if (!loaded || !profile || !dailyData) return <LoadingScreen />;

  const lang = profile.lang;
  const theme = THEMES.find((th) => th.id === profile.theme) || THEMES[0];
  const accent = theme.accent;
  const typesDone = todaysTypes();
  const allDoneToday = CHALLENGE_TYPES.every((tp) => typesDone[tp]);
  const prog = xpProgress(profile.xp);

  function requestStart(type) {
    sessionCountRef.current += 1;
    if (!profile.premium && sessionCountRef.current % 3 === 0) {
      setPendingType(type);
      setShowInterstitial(true);
    } else {
      setActiveType(type);
      setScreen("playing");
    }
  }

  function handleInterstitialDone() {
    setShowInterstitial(false);
    setActiveType(pendingType);
    setPendingType(null);
    setScreen("playing");
  }

  function handleFinish(type, result) {
    const wasAlreadyDone = !!typesDone[type];
    const reward = rewardForScore(result.score, result.maxScore);
    completeChallenge(type, { ...result, xp: reward.xp, coins: reward.coins });
    setLastResult({ type, ...result, ...reward, wasAlreadyDone });
    setScreen("results");
  }

  function backHome() {
    clearFlags();
    setActiveType(null);
    setLastResult(null);
    setScreen("home");
  }

  function handleClaimDaily() {
    const res = claimDailyReward();
    if (res.claimed) setRewardClaimedFlash(res.amount);
  }

  const styleSheet = `
    ${FONT_IMPORT}
    .synapse-root * { box-sizing: border-box; }
    .synapse-root { font-family: 'Inter', sans-serif; }
    .display { font-family: 'Space Grotesk', sans-serif; }
    .mono { font-family: 'IBM Plex Mono', monospace; }
    .navbtn { background: none; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 10px; }
    button:focus-visible, input:focus-visible { outline: 2px solid ${accent}; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  `;

  return (
    <div className="synapse-root" style={{ background: "#0D0C14", minHeight: "100vh", color: "#EDE7DD", paddingBottom: 76 }}>
      <style>{styleSheet}</style>

      {screen === "home" && (
        <HomeScreen
          profile={profile}
          lang={lang}
          accent={accent}
          prog={prog}
          typesDone={typesDone}
          allDoneToday={allDoneToday}
          onSelect={requestStart}
          onClaimDaily={handleClaimDaily}
          rewardClaimedFlash={rewardClaimedFlash}
          onWatchAd={() => setShowRewardedAd(true)}
        />
      )}

      {screen === "playing" && activeType && (
        <PlayScreen
          type={activeType}
          data={dailyData[activeType]}
          lang={lang}
          hints={profile.hints}
          onUseHint={useHint}
          onFinish={(res) => handleFinish(activeType, res)}
          onBack={backHome}
        />
      )}

      {screen === "results" && lastResult && (
        <ResultsScreen
          result={lastResult}
          lang={lang}
          accent={accent}
          leveledUp={leveledUp}
          newBadges={lastUnlockedBadges}
          allDoneToday={CHALLENGE_TYPES.every((tp) => todaysTypes()[tp])}
          onBack={backHome}
        />
      )}

      {screen === "stats" && <StatsScreen profile={profile} lang={lang} />}

      {screen === "badges" && <BadgesScreen profile={profile} lang={lang} accent={accent} />}

      {screen === "settings" && (
        <SettingsScreen
          profile={profile}
          lang={lang}
          accent={accent}
          onSetLang={setLang}
          onSetTheme={setTheme}
          onTogglePremium={togglePremium}
          resetConfirm={resetConfirm}
          setResetConfirm={setResetConfirm}
          onReset={() => {
            resetProfile();
            setResetConfirm(false);
            backHome();
          }}
        />
      )}

      {screen !== "playing" && (
        <BottomNav screen={screen} setScreen={setScreen} lang={lang} accent={accent} />
      )}

      {showInterstitial && <InterstitialAd lang={lang} onDone={handleInterstitialDone} />}
      {showRewardedAd && (
        <RewardedAdModal lang={lang} onClose={() => setShowRewardedAd(false)} onReward={earnHintFromAd} />
      )}
    </div>
  );
}

/* ============================================================ */

function BottomNav({ screen, setScreen, lang, accent }) {
  const items = [
    { id: "home", icon: HomeIcon, label: t("home", lang) },
    { id: "stats", icon: BarChart3, label: t("stats", lang) },
    { id: "badges", icon: Award, label: t("badges", lang) },
    { id: "settings", icon: SettingsIcon, label: t("settings", lang) },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#141220", borderTop: "1px solid #26233a", display: "flex", justifyContent: "space-around", padding: "6px 0", zIndex: 20 }}>
      {items.map((it) => {
        const Icon = it.icon;
        const active = screen === it.id;
        return (
          <button key={it.id} className="navbtn" onClick={() => setScreen(it.id)}>
            <Icon size={20} color={active ? accent : "#6a6580"} />
            <span style={{ fontSize: "0.68rem", color: active ? accent : "#6a6580" }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HomeScreen({ profile, lang, accent, prog, typesDone, allDoneToday, onSelect, onClaimDaily, rewardClaimedFlash, onWatchAd }) {
  const claimedToday = profile.dailyRewardClaimedDate === todayStr();

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 1.1rem 1rem" }}>
      <div className="display" style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
        {t("appName", lang)}
      </div>
      <div style={{ color: "#6a6580", fontSize: "0.88rem", marginBottom: "1.25rem" }}>{t("tagline", lang)}</div>

      {/* Top stats row */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem" }}>
        <StatPill icon={Flame} value={profile.streak} label={t("streak", lang)} color="#D66B63" />
        <StatPill icon={Star} value={profile.level} label={t("level", lang)} color={accent} />
        <StatPill icon={Coins} value={profile.coins} label={t("coins", lang)} color="#E8C468" />
      </div>

      {/* XP bar */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#6a6580", marginBottom: 4 }}>
          <span>{t("level", lang)} {prog.level}</span>
          <span className="mono">{prog.into} / {prog.need} XP</span>
        </div>
        <div style={{ height: 7, background: "#1C1830", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(prog.into / prog.need) * 100}%`, background: accent, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Constellation */}
      <Constellation typesDone={typesDone} accent={accent} onSelect={onSelect} lang={lang} />

      {allDoneToday && (
        <div style={{ background: `${accent}18`, border: `1px solid ${accent}55`, borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "1.1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("allDoneTitle", lang)}</div>
          <div style={{ fontSize: "0.85rem", color: "#a39dbf" }}>{t("allDoneBody", lang)}</div>
        </div>
      )}

      {/* Challenge list */}
      <div style={{ border: "1px solid #26233a", borderRadius: 14, overflow: "hidden", marginBottom: "1.25rem" }}>
        {CHALLENGE_TYPES.map((type, i) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          const done = !!typesDone[type];
          return (
            <div
              key={type}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.85rem 1rem", borderTop: i === 0 ? "none" : "1px solid #201d30", background: "#141220" }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${meta.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={meta.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: "0.92rem" }}>{t(type, lang)}</div>
                {done && <div style={{ fontSize: "0.72rem", color: "#7FB88A" }}>{t("done", lang)} ✓</div>}
              </div>
              <button
                onClick={() => onSelect(type)}
                style={{
                  background: done ? "transparent" : meta.color,
                  color: done ? meta.color : "#14121f",
                  border: done ? `1px solid ${meta.color}` : "none",
                  borderRadius: 8,
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {done ? t("practice", lang) : t("start", lang)}
              </button>
            </div>
          );
        })}
      </div>

      {/* Daily reward */}
      <div style={{ background: "#141220", border: "1px solid #26233a", borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "0.9rem", display: "flex", alignItems: "center", gap: 12 }}>
        <Gift size={22} color="#E8C468" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{t("dailyReward", lang)}</div>
          {rewardClaimedFlash && claimedToday && <div style={{ fontSize: "0.75rem", color: "#7FB88A" }}>+{rewardClaimedFlash} {t("coins", lang).toLowerCase()}</div>}
        </div>
        <button
          onClick={onClaimDaily}
          disabled={claimedToday}
          style={{
            background: claimedToday ? "transparent" : "#E8C468",
            color: claimedToday ? "#6a6580" : "#1B1A17",
            border: claimedToday ? "1px solid #33304a" : "none",
            borderRadius: 8,
            padding: "0.45rem 0.9rem",
            fontWeight: 600,
            fontSize: "0.8rem",
            cursor: claimedToday ? "default" : "pointer",
          }}
        >
          {claimedToday ? t("claimed", lang) : t("claim", lang)}
        </button>
      </div>

      {/* Rewarded ad for hint */}
      {!profile.premium && (
        <button
          onClick={onWatchAd}
          style={{ width: "100%", background: "transparent", border: "1px dashed #33304a", borderRadius: 12, padding: "0.75rem", color: "#9C9488", fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Lightbulb size={15} /> {t("watchAdHint", lang)}
        </button>
      )}

      <BannerAd />
    </div>
  );
}

function StatPill({ icon: Icon, value, label, color }) {
  return (
    <div style={{ flex: 1, background: "#141220", border: "1px solid #26233a", borderRadius: 12, padding: "0.65rem 0.5rem", textAlign: "center" }}>
      <Icon size={16} color={color} style={{ marginBottom: 3 }} />
      <div className="mono" style={{ fontSize: "1.05rem", fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: "0.65rem", color: "#6a6580" }}>{label}</div>
    </div>
  );
}

function PlayScreen({ type, data, lang, hints, onUseHint, onFinish, onBack }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.25rem 1.1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#9C9488", display: "flex" }}>
          <ChevronLeft size={22} />
        </button>
        <Icon size={18} color={meta.color} />
        <span className="display" style={{ fontWeight: 600 }}>{t(type, lang)}</span>
      </div>

      {type === "memory" && <MemoryGame data={data} lang={lang} onFinish={onFinish} />}
      {type === "calc" && <CalcGame data={data} lang={lang} onFinish={onFinish} hints={hints} onUseHint={onUseHint} />}
      {type === "logic" && <LogicGame data={data} lang={lang} onFinish={onFinish} hints={hints} onUseHint={onUseHint} />}
      {type === "observation" && <ObservationGame data={data} lang={lang} onFinish={onFinish} />}
      {type === "concentration" && <ConcentrationGame data={data} lang={lang} onFinish={onFinish} />}
    </div>
  );
}

function ResultsScreen({ result, lang, accent, leveledUp, newBadges, allDoneToday, onBack }) {
  const meta = TYPE_META[result.type];
  const Icon = meta.icon;
  const accuracy = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.1rem", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${meta.color}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
        <Icon size={32} color={meta.color} />
      </div>
      <div className="display" style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 4 }}>{t(result.type, lang)}</div>
      <div style={{ color: "#6a6580", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{t("resultTitle", lang)}</div>

      <div style={{ display: "flex", gap: 10, marginBottom: "1.5rem" }}>
        <MiniStat label={t("score", lang)} value={`${result.score}/${result.maxScore}`} />
        <MiniStat label={t("accuracy", lang)} value={`${accuracy}%`} />
      </div>

      {!result.wasAlreadyDone ? (
        <div style={{ display: "flex", gap: 10, marginBottom: "1.5rem" }}>
          <MiniStat label={t("xpEarned", lang)} value={`+${result.xp}`} color={accent} />
          <MiniStat label={t("coinsEarned", lang)} value={`+${result.coins}`} color="#E8C468" />
        </div>
      ) : (
        <div style={{ color: "#9C9488", fontSize: "0.82rem", marginBottom: "1.5rem" }}>{t("alreadyDoneToday", lang)}</div>
      )}

      {leveledUp && (
        <div style={{ background: `${accent}18`, border: `1px solid ${accent}55`, borderRadius: 12, padding: "0.75rem", marginBottom: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Sparkles size={16} color={accent} />
          <span style={{ fontSize: "0.88rem" }}>{t("levelUp", lang)}</span>
        </div>
      )}

      {newBadges.length > 0 && (
        <div style={{ background: "#141220", border: "1px solid #26233a", borderRadius: 12, padding: "0.9rem", marginBottom: "0.9rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
            <Award size={16} color="#E8C468" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{t("newBadge", lang)}</span>
          </div>
          {newBadges.map((id) => (
            <div key={id} style={{ fontSize: "0.8rem", color: "#a39dbf" }}>{t("badge_" + id, lang)}</div>
          ))}
        </div>
      )}

      {allDoneToday && !result.wasAlreadyDone && (
        <div style={{ background: `${accent}18`, border: `1px solid ${accent}55`, borderRadius: 12, padding: "0.9rem", marginBottom: "0.9rem" }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t("allDoneTitle", lang)}</div>
        </div>
      )}

      <button
        onClick={onBack}
        style={{ background: accent, color: "#14121f", border: "none", borderRadius: 12, padding: "0.75rem 1.6rem", fontWeight: 600, cursor: "pointer", marginTop: "0.5rem" }}
      >
        {t("backHome", lang)}
      </button>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: "#141220", border: "1px solid #26233a", borderRadius: 12, padding: "0.7rem" }}>
      <div className="mono" style={{ fontSize: "1.15rem", fontWeight: 600, color: color || "#EDE7DD" }}>{value}</div>
      <div style={{ fontSize: "0.68rem", color: "#6a6580" }}>{label}</div>
    </div>
  );
}

function StatsScreen({ profile, lang }) {
  const s = profile.stats;
  const accuracy = s.totalQuestions > 0 ? Math.round((s.totalCorrect / s.totalQuestions) * 100) : 0;

  if (s.totalCompleted === 0) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "2.5rem 1.5rem", textAlign: "center", color: "#6a6580" }}>
        {t("noStatsYet", lang)}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 1.1rem" }}>
      <div className="display" style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.25rem" }}>{t("stats", lang)}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.25rem" }}>
        <MiniStat label={t("totalCompleted", lang)} value={s.totalCompleted} />
        <MiniStat label={t("accuracy", lang)} value={`${accuracy}%`} />
        <MiniStat label={t("perfectSessions", lang)} value={s.perfectSessions} />
        <MiniStat label={t("timePlayed", lang)} value={formatTime(s.totalTimePlayedSec)} />
      </div>

      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#9C9488", marginBottom: "0.6rem" }}>{t("bestScores", lang)}</div>
      <div style={{ border: "1px solid #26233a", borderRadius: 14, overflow: "hidden" }}>
        {CHALLENGE_TYPES.map((type, i) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          return (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.75rem 1rem", borderTop: i === 0 ? "none" : "1px solid #201d30" }}>
              <Icon size={16} color={meta.color} />
              <span style={{ flex: 1, fontSize: "0.88rem" }}>{t(type, lang)}</span>
              <span className="mono" style={{ fontSize: "0.9rem" }}>{s.bestScores[type] || 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BadgesScreen({ profile, lang, accent }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 1.1rem" }}>
      <div className="display" style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.25rem" }}>{t("badges", lang)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {BADGES.map((b) => {
          const unlocked = profile.badges.includes(b.id);
          return (
            <div
              key={b.id}
              style={{
                background: "#141220",
                border: `1px solid ${unlocked ? accent + "55" : "#26233a"}`,
                borderRadius: 14,
                padding: "1rem",
                textAlign: "center",
                opacity: unlocked ? 1 : 0.55,
              }}
            >
              {unlocked ? <Award size={26} color={accent} style={{ marginBottom: 8 }} /> : <Lock size={22} color="#6a6580" style={{ marginBottom: 8 }} />}
              <div style={{ fontSize: "0.8rem" }}>{t("badge_" + b.id, lang)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsScreen({ profile, lang, accent, onSetLang, onSetTheme, onTogglePremium, resetConfirm, setResetConfirm, onReset }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 1.1rem" }}>
      <div className="display" style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.5rem" }}>{t("settings", lang)}</div>

      {/* Premium */}
      <div style={{ background: "#141220", border: "1px solid #26233a", borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "1.25rem" }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("premium", lang)}</div>
        <div style={{ fontSize: "0.8rem", color: "#9C9488", marginBottom: 10 }}>
          {profile.premium ? t("premiumActive", lang) : t("goPremium", lang)}
        </div>
        <button
          onClick={onTogglePremium}
          style={{
            background: profile.premium ? "transparent" : accent,
            color: profile.premium ? accent : "#14121f",
            border: `1px solid ${accent}`,
            borderRadius: 10,
            padding: "0.55rem 1rem",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          {profile.premium ? "✓ " + t("premiumActive", lang).split(" —")[0] : t("goPremium", lang)}
        </button>
      </div>

      {/* Language */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", fontWeight: 600, color: "#9C9488", marginBottom: "0.6rem" }}>
          <Globe size={16} /> {t("language", lang)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => onSetLang(l)}
              style={{
                flex: 1,
                background: lang === l ? accent : "#141220",
                color: lang === l ? "#14121f" : "#EDE7DD",
                border: `1px solid ${lang === l ? accent : "#26233a"}`,
                borderRadius: 10,
                padding: "0.6rem 0.3rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", fontWeight: 600, color: "#9C9488", marginBottom: "0.6rem" }}>
          <Palette size={16} /> {t("theme", lang)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {THEMES.map((th) => {
            const unlocked = profile.level >= th.unlockLevel;
            const active = profile.theme === th.id;
            return (
              <button
                key={th.id}
                onClick={() => unlocked && onSetTheme(th.id)}
                disabled={!unlocked}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#141220",
                  border: `1px solid ${active ? th.accent : "#26233a"}`,
                  borderRadius: 10,
                  padding: "0.6rem 0.7rem",
                  cursor: unlocked ? "pointer" : "default",
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: th.accent, flexShrink: 0 }} />
                <div style={{ textAlign: "left", flex: 1 }}>
                  <div style={{ fontSize: "0.78rem" }}>{unlocked ? (active ? "✓ " : "") + th.id : `${t("unlocksAt", lang)} ${th.unlockLevel}`}</div>
                </div>
                {!unlocked && <Lock size={13} color="#6a6580" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      {!resetConfirm ? (
        <button
          onClick={() => setResetConfirm(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "1px solid #26233a", borderRadius: 10, padding: "0.65rem 1rem", color: "#9C9488", fontSize: "0.82rem", cursor: "pointer" }}
        >
          <Trash2 size={15} /> {t("resetData", lang)}
        </button>
      ) : (
        <div style={{ background: "#141220", border: "1px solid #D66B6355", borderRadius: 12, padding: "1rem" }}>
          <div style={{ fontSize: "0.85rem", marginBottom: 10 }}>{t("resetConfirm", lang)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setResetConfirm(false)} style={{ flex: 1, background: "transparent", border: "1px solid #26233a", borderRadius: 8, padding: "0.5rem", color: "#EDE7DD", cursor: "pointer" }}>
              {t("cancel", lang)}
            </button>
            <button onClick={onReset} style={{ flex: 1, background: "#D66B63", border: "none", borderRadius: 8, padding: "0.5rem", color: "#1B1A17", fontWeight: 600, cursor: "pointer" }}>
              {t("confirm", lang)}
            </button>
          </div>
        </div>
      )}

      {/* À propos */}
      <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: 6, fontSize: "0.8rem" }}>
        <a href="/a-propos.html" style={{ color: "#6a6580" }}>{t("about", lang)}</a>
        <a href="/comment-ca-marche.html" style={{ color: "#6a6580" }}>{t("howItWorks", lang)}</a>
        <a href="/privacy.html" style={{ color: "#6a6580" }}>{t("privacyPolicy", lang)}</a>
      </div>
    </div>
  );
}
