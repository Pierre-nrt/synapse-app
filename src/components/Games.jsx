import React, { useState, useEffect, useRef } from "react";
import { Brain, Zap, Puzzle, Eye, Target, Lightbulb, Check, X as XIcon } from "lucide-react";
import { t } from "../i18n.js";
import { COLOR_DEFS } from "../challenges.js";

export const TYPE_META = {
  memory: { icon: Brain, color: "#9B8AC4" },
  calc: { icon: Zap, color: "#E8C468" },
  logic: { icon: Puzzle, color: "#4FA3A0" },
  observation: { icon: Eye, color: "#7FB88A" },
  concentration: { icon: Target, color: "#D66B63" },
};

const CHOICE_COLORS = ["#D66B63", "#4FA3A0", "#E8C468", "#7FB88A"];

/* ============================================================
   MÉMOIRE
   ============================================================ */
export function MemoryGame({ data, lang, onFinish }) {
  const [roundLen, setRoundLen] = useState(3);
  const [lastCompletedLen, setLastCompletedLen] = useState(0);
  const [phase, setPhase] = useState("show");
  const [litIndex, setLitIndex] = useState(-1);
  const [userStep, setUserStep] = useState(0);
  const startRef = useRef(Date.now());
  const timeoutsRef = useRef([]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setPhase("show");
    setUserStep(0);
    let time = 200;
    for (let i = 0; i < roundLen; i++) {
      timeoutsRef.current.push(setTimeout(() => setLitIndex(i), time));
      timeoutsRef.current.push(setTimeout(() => setLitIndex(-1), time + 380));
      time += 620;
    }
    timeoutsRef.current.push(setTimeout(() => setPhase("input"), time + 150));
    return () => timeoutsRef.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundLen]);

  function finish(score) {
    setPhase("result");
    onFinish({ score, maxScore: data.maxScore, timeSec: Math.round((Date.now() - startRef.current) / 1000) });
  }

  function handlePick(idx) {
    if (phase !== "input") return;
    const expected = data.sequence[userStep];
    if (idx === expected) {
      const nextStep = userStep + 1;
      if (nextStep === roundLen) {
        setLastCompletedLen(roundLen);
        if (roundLen >= data.maxScore) finish(roundLen);
        else setRoundLen(roundLen + 1);
      } else {
        setUserStep(nextStep);
      }
    } else {
      finish(lastCompletedLen);
    }
  }

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "#9C9488", marginBottom: 4 }}>{t("memoryInstruction", lang)}</p>
      <p style={{ color: "#E8C468", fontWeight: 600, minHeight: 22, marginBottom: 18 }}>
        {phase === "show" ? t("watch", lang) : phase === "input" ? t("yourTurn", lang) : ""}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 280, margin: "0 auto" }}>
        {CHOICE_COLORS.map((c, i) => (
          <button
            key={i}
            disabled={phase !== "input"}
            onClick={() => handlePick(i)}
            style={{
              height: 92,
              borderRadius: 16,
              border: "none",
              cursor: phase === "input" ? "pointer" : "default",
              background: c,
              opacity: litIndex === i ? 1 : phase === "show" ? 0.32 : 0.88,
              boxShadow: litIndex === i ? `0 0 0 4px ${c}55, 0 0 26px ${c}` : "none",
              transition: "opacity 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease",
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 18, fontFamily: "'IBM Plex Mono', monospace", color: "#9C9488", fontSize: "0.9rem" }}>
        {lastCompletedLen} / {data.maxScore}
      </div>
    </div>
  );
}

/* ============================================================
   CALCUL RAPIDE
   ============================================================ */
const CALC_TIME_MS = 8000;

export function CalcGame({ data, lang, onFinish, hints, onUseHint }) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [timeLeft, setTimeLeft] = useState(CALC_TIME_MS);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const startRef = useRef(Date.now());
  const ivRef = useRef(null);
  const lockRef = useRef(false);

  useEffect(() => {
    setInputVal("");
    setRevealed(false);
    setFeedback(null);
    lockRef.current = false;
    setTimeLeft(CALC_TIME_MS);
    const t0 = Date.now();
    ivRef.current = setInterval(() => {
      const remain = CALC_TIME_MS - (Date.now() - t0);
      if (remain <= 0) {
        clearInterval(ivRef.current);
        submit(true);
      } else setTimeLeft(remain);
    }, 100);
    return () => clearInterval(ivRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function submit(timeout) {
    if (lockRef.current) return;
    lockRef.current = true;
    clearInterval(ivRef.current);
    const q = data.questions[index];
    const val = parseInt(inputVal, 10);
    const ok = !timeout && val === q.answer;
    setFeedback(ok ? "ok" : "no");
    const newCorrect = correct + (ok ? 1 : 0);
    setCorrect(newCorrect);
    setTimeout(() => {
      if (index + 1 >= data.questions.length) {
        onFinish({ score: newCorrect, maxScore: data.maxScore, timeSec: Math.round((Date.now() - startRef.current) / 1000) });
      } else {
        setIndex(index + 1);
      }
    }, 550);
  }

  const q = data.questions[index];
  const pct = Math.max(0, (timeLeft / CALC_TIME_MS) * 100);

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "#9C9488", marginBottom: 16 }}>{t("calcInstruction", lang)}</p>
      <div style={{ height: 5, background: "#242320", borderRadius: 3, overflow: "hidden", marginBottom: 22 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct < 25 ? "#D66B63" : "#E8C468", transition: "width 0.1s linear" }} />
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "2.4rem",
          fontWeight: 600,
          marginBottom: 20,
          color: feedback === "ok" ? "#7FB88A" : feedback === "no" ? "#D66B63" : "#EDE7DD",
        }}
      >
        {q.a} {q.op} {q.b} = {revealed ? q.answer : "?"}
      </div>
      <input
        type="number"
        inputMode="numeric"
        autoFocus
        value={inputVal}
        disabled={!!feedback}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit(false)}
        placeholder={t("answerPlaceholder", lang)}
        style={{
          width: 160,
          textAlign: "center",
          fontSize: "1.3rem",
          fontFamily: "'IBM Plex Mono', monospace",
          background: "#1C1830",
          border: "1px solid #33304a",
          borderRadius: 10,
          padding: "0.6rem",
          color: "#EDE7DD",
        }}
      />
      <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          onClick={() => submit(false)}
          disabled={!!feedback}
          style={{ background: "#E8C468", color: "#1B1A17", border: "none", borderRadius: 10, padding: "0.6rem 1.4rem", fontWeight: 600, cursor: "pointer" }}
        >
          {t("validate", lang)}
        </button>
        <button
          onClick={() => {
            if (revealed || feedback) return;
            if (onUseHint()) setRevealed(true);
          }}
          disabled={hints <= 0 || revealed || !!feedback}
          title={t("useHint", lang)}
          style={{
            background: "transparent",
            border: "1px solid #33304a",
            borderRadius: 10,
            padding: "0.6rem 0.8rem",
            color: hints > 0 ? "#E8C468" : "#5c5870",
            cursor: hints > 0 ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Lightbulb size={16} /> {hints}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   LOGIQUE
   ============================================================ */
export function LogicGame({ data, lang, onFinish, hints, onUseHint }) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState(null);
  const [eliminated, setEliminated] = useState([]);
  const startRef = useRef(Date.now());
  const lockRef = useRef(false);

  useEffect(() => {
    setSelected(null);
    setEliminated([]);
    lockRef.current = false;
  }, [index]);

  const q = data.questions[index];

  function handleSelect(optIdx) {
    if (lockRef.current || eliminated.includes(optIdx)) return;
    lockRef.current = true;
    setSelected(optIdx);
    const ok = optIdx === q.correctIndex;
    const newCorrect = correct + (ok ? 1 : 0);
    setCorrect(newCorrect);
    setTimeout(() => {
      if (index + 1 >= data.questions.length) {
        onFinish({ score: newCorrect, maxScore: data.maxScore, timeSec: Math.round((Date.now() - startRef.current) / 1000) });
      } else {
        setIndex(index + 1);
      }
    }, 700);
  }

  function useHintNow() {
    if (eliminated.length > 0 || selected !== null) return;
    if (!onUseHint()) return;
    const wrongIdx = q.options.map((_, i) => i).filter((i) => i !== q.correctIndex);
    const toEliminate = wrongIdx.sort(() => 0.5 - Math.random()).slice(0, 2);
    setEliminated(toEliminate);
  }

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "#9C9488", marginBottom: 16 }}>{t("logicInstruction", lang)}</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {q.terms.map((n, i) => (
          <div
            key={i}
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#1C1830",
              border: "1px solid #33304a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "1.1rem",
            }}
          >
            {n}
          </div>
        ))}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: "#4FA3A0",
            color: "#1B1A17",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "1.2rem",
          }}
        >
          ?
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 320, margin: "0 auto" }}>
        {q.options.map((opt, i) => {
          const isElim = eliminated.includes(i);
          const isCorrect = selected !== null && i === q.correctIndex;
          const isWrongPick = selected === i && i !== q.correctIndex;
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={isElim || selected !== null}
              style={{
                padding: "0.9rem",
                borderRadius: 12,
                border: "1px solid #33304a",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "1.1rem",
                cursor: isElim || selected !== null ? "default" : "pointer",
                background: isCorrect ? "#7FB88A" : isWrongPick ? "#D66B63" : "#1C1830",
                color: isCorrect || isWrongPick ? "#1B1A17" : isElim ? "#4a4660" : "#EDE7DD",
                opacity: isElim ? 0.35 : 1,
                transition: "all 0.15s ease",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <button
        onClick={useHintNow}
        disabled={hints <= 0 || eliminated.length > 0 || selected !== null}
        style={{
          marginTop: 18,
          background: "transparent",
          border: "1px solid #33304a",
          borderRadius: 10,
          padding: "0.5rem 0.9rem",
          color: hints > 0 ? "#E8C468" : "#5c5870",
          cursor: hints > 0 ? "pointer" : "default",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Lightbulb size={15} /> {t("useHint", lang)} ({hints})
      </button>
    </div>
  );
}

/* ============================================================
   OBSERVATION
   ============================================================ */
export function ObservationGame({ data, lang, onFinish }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1);
  const [locked, setLocked] = useState(false);
  const startRef = useRef(Date.now());
  const ivRef = useRef(null);

  const round = data.rounds[roundIdx];
  const duration = Math.max(3000, 6500 - roundIdx * 500);

  useEffect(() => {
    setLocked(false);
    setTimeLeft(duration);
    const t0 = Date.now();
    ivRef.current = setInterval(() => {
      const remain = duration - (Date.now() - t0);
      if (remain <= 0) {
        clearInterval(ivRef.current);
        advance(false);
      } else setTimeLeft(remain);
    }, 100);
    return () => clearInterval(ivRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  function advance(wasCorrect) {
    if (locked) return;
    setLocked(true);
    clearInterval(ivRef.current);
    const newCorrect = correct + (wasCorrect ? 1 : 0);
    setCorrect(newCorrect);
    setTimeout(() => {
      if (roundIdx + 1 >= data.rounds.length) {
        onFinish({ score: newCorrect, maxScore: data.maxScore, timeSec: Math.round((Date.now() - startRef.current) / 1000) });
      } else {
        setRoundIdx(roundIdx + 1);
      }
    }, 350);
  }

  const cols = Math.round(Math.sqrt(round.size));
  const pct = Math.max(0, (timeLeft / duration) * 100);

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "#9C9488", marginBottom: 12 }}>{t("observationInstruction", lang)}</p>
      <div style={{ height: 5, background: "#242320", borderRadius: 3, overflow: "hidden", marginBottom: 18, maxWidth: 320, margin: "0 auto 18px" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct < 30 ? "#D66B63" : "#7FB88A", transition: "width 0.1s linear" }} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 8,
          maxWidth: cols * 56,
          margin: "0 auto",
        }}
      >
        {Array.from({ length: round.size }).map((_, i) => (
          <button
            key={i}
            onClick={() => advance(i === round.oddIndex)}
            disabled={locked}
            style={{
              width: 48,
              height: 48,
              fontSize: "1.4rem",
              border: "1px solid #2a2740",
              borderRadius: 10,
              background: "#1C1830",
              cursor: locked ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {i === round.oddIndex ? round.odd : round.base}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16, fontFamily: "'IBM Plex Mono', monospace", color: "#9C9488", fontSize: "0.9rem" }}>
        {correct} / {data.maxScore}
      </div>
    </div>
  );
}

/* ============================================================
   CONCENTRATION (Stroop)
   ============================================================ */
const COLOR_LABEL_KEY = { red: "colorRed", blue: "colorBlue", yellow: "colorYellow", green: "colorGreen", purple: "colorPurple" };

export function ConcentrationGame({ data, lang, onFinish }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState(null);
  const startRef = useRef(Date.now());
  const toRef = useRef(null);

  const round = data.rounds[roundIdx];

  useEffect(() => {
    setLocked(false);
    setFlash(null);
    toRef.current = setTimeout(() => advance(false), round.timeMs);
    return () => clearTimeout(toRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  function advance(wasCorrect) {
    if (locked) return;
    setLocked(true);
    clearTimeout(toRef.current);
    setFlash(wasCorrect ? "ok" : "no");
    const newCorrect = correct + (wasCorrect ? 1 : 0);
    setCorrect(newCorrect);
    setTimeout(() => {
      if (roundIdx + 1 >= data.rounds.length) {
        onFinish({ score: newCorrect, maxScore: data.maxScore, timeSec: Math.round((Date.now() - startRef.current) / 1000) });
      } else {
        setRoundIdx(roundIdx + 1);
      }
    }, 280);
  }

  const displayHex = COLOR_DEFS.find((c) => c.key === round.displayColor).hex;

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "#9C9488", marginBottom: 20 }}>{t("concentrationInstruction", lang)}</p>
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: "2.4rem",
          color: displayHex,
          marginBottom: 26,
          transition: "opacity 0.1s",
          opacity: flash ? 0.3 : 1,
        }}
      >
        {t(COLOR_LABEL_KEY[round.wordColor], lang)}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", maxWidth: 320, margin: "0 auto" }}>
        {COLOR_DEFS.map((c) => (
          <button
            key={c.key}
            onClick={() => advance(c.key === round.displayColor)}
            disabled={locked}
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              border: "none",
              background: c.hex,
              cursor: locked ? "default" : "pointer",
              boxShadow: flash && c.key === round.displayColor ? `0 0 0 4px ${c.hex}55` : "none",
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 18, fontFamily: "'IBM Plex Mono', monospace", color: "#9C9488", fontSize: "0.9rem" }}>
        {correct} / {data.maxScore}
      </div>
    </div>
  );
}

/* ============================================================
   CONSTELLATION DU JOUR — élément signature
   ============================================================ */
export function Constellation({ typesDone, accent, onSelect, lang }) {
  const order = ["memory", "calc", "logic", "observation", "concentration"];
  const positions = [
    { x: 10, y: 60 },
    { x: 30, y: 15 },
    { x: 52, y: 55 },
    { x: 74, y: 15 },
    { x: 92, y: 60 },
  ];

  return (
    <div style={{ position: "relative", height: 150, margin: "0 8px 8px" }}>
      <svg width="100%" height="150" style={{ position: "absolute", inset: 0 }} viewBox="0 0 100 75" preserveAspectRatio="none">
        {positions.slice(0, -1).map((p, i) => {
          const n = positions[i + 1];
          const bothDone = typesDone[order[i]] && typesDone[order[i + 1]];
          return (
            <line
              key={i}
              x1={p.x}
              y1={p.y}
              x2={n.x}
              y2={n.y}
              stroke={bothDone ? accent : "#2a2740"}
              strokeWidth={bothDone ? 1 : 0.6}
              style={{ transition: "stroke 0.4s ease" }}
            />
          );
        })}
      </svg>
      {order.map((type, i) => {
        const Icon = TYPE_META[type].icon;
        const done = !!typesDone[type];
        const p = positions[i];
        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            title={t(type, lang)}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: "translate(-50%, -50%)",
              width: 52,
              height: 52,
              borderRadius: "50%",
              border: done ? `2px solid ${accent}` : "2px solid #33304a",
              background: done ? `${accent}22` : "#1C1830",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: done ? `0 0 18px ${accent}55` : "none",
              transition: "all 0.3s ease",
            }}
          >
            <Icon size={22} color={done ? accent : "#6a6580"} />
            {done && (
              <div style={{ position: "absolute", top: -4, right: -4, background: accent, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={10} color="#1B1A17" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   PUBLICITÉ
   Fonctionne avec ou sans configuration : sans ID renseigné,
   ces composants ne rendent rien et l'app tourne normalement.
   ============================================================ */
const ADSENSE_CLIENT = ""; // ex: "ca-pub-1234567890123456" — laisse vide pour désactiver
const ADSENSE_SLOT = "";

// Note app mobile native (AdMob) : AdMob ne se charge pas dans une page web.
// Une fois l'app empaquetée avec Capacitor/React Native, remplace ces composants par :
//   import { AdMob, BannerAdPosition } from '@capacitor-community/admob';
//   AdMob.showBanner({ adId: 'ca-app-pub-xxxx/yyyy', position: BannerAdPosition.BOTTOM_CENTER });
//   AdMob.showInterstitial({ adId: 'ca-app-pub-xxxx/zzzz' });
//   AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-xxxx/wwww' }); AdMob.showRewardVideoAd();

export function BannerAd() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ADSENSE_CLIENT) return;
    try {
      if (!window.__adsenseLoaded) {
        const s = document.createElement("script");
        s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
        s.async = true;
        s.crossOrigin = "anonymous";
        s.onload = () => setReady(true);
        document.head.appendChild(s);
        window.__adsenseLoaded = true;
      } else setReady(true);
    } catch (e) {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      /* ignore */
    }
  }, [ready]);
  if (!ADSENSE_CLIENT) return null;
  return (
    <div style={{ margin: "1rem 0", border: "1px solid #26313F", borderRadius: 10, overflow: "hidden" }}>
      <ins className="adsbygoogle" style={{ display: "block", minHeight: 90 }} data-ad-client={ADSENSE_CLIENT} data-ad-slot={ADSENSE_SLOT} data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}

export function InterstitialAd({ onDone, lang }) {
  const [secs, setSecs] = useState(3);
  useEffect(() => {
    if (secs <= 0) {
      onDone();
      return;
    }
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs, onDone]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0d0c14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 50, color: "#EDE7DD" }}>
      <div style={{ fontSize: "0.85rem", color: "#6a6580", marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("adPlaying", lang)}</div>
      <div style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid #33304a", borderTopColor: "#E8C468", animation: "spin 1s linear infinite" }} />
      <div style={{ marginTop: 16, fontFamily: "'IBM Plex Mono', monospace" }}>{secs}s</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function RewardedAdModal({ onClose, onReward, lang }) {
  const [secs, setSecs] = useState(3);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (secs <= 0) {
      setDone(true);
      return;
    }
    const id = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,9,15,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#1C1830", border: "1px solid #33304a", borderRadius: 16, padding: "2rem", textAlign: "center", width: 280 }}>
        {!done ? (
          <>
            <div style={{ fontSize: "0.8rem", color: "#6a6580", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>{t("adPlaying", lang)}</div>
            <div style={{ width: 56, height: 56, margin: "0 auto", borderRadius: "50%", border: "3px solid #33304a", borderTopColor: "#E8C468", animation: "spin 1s linear infinite" }} />
            <div style={{ marginTop: 14, fontFamily: "'IBM Plex Mono', monospace", color: "#EDE7DD" }}>{secs}s</div>
          </>
        ) : (
          <>
            <Lightbulb size={36} color="#E8C468" style={{ marginBottom: 10 }} />
            <p style={{ color: "#EDE7DD", marginBottom: 18 }}>{t("adThanks", lang)}</p>
            <button
              onClick={() => {
                onReward();
                onClose();
              }}
              style={{ background: "#E8C468", color: "#1B1A17", border: "none", borderRadius: 10, padding: "0.6rem 1.4rem", fontWeight: 600, cursor: "pointer" }}
            >
              OK
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
