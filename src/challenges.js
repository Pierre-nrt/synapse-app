import { seededRng, pick, randInt, shuffle } from "./rng.js";

/* ============================================================
   Pourquoi procédural plutôt que des milliers de défis écrits à la main :
   chaque défi est généré à partir de règles + d'une graine (seed) dérivée
   de la date du jour. Résultat : un défi différent chaque jour, pour un
   nombre de jours quasi illimité, sans fichier de contenu à maintenir.
   ============================================================ */

export const CHALLENGE_TYPES = ["memory", "calc", "logic", "observation", "concentration"];

export function generateDailyChallenges(dateStr) {
  return {
    memory: generateMemory(dateStr),
    calc: generateCalc(dateStr),
    logic: generateLogic(dateStr),
    observation: generateObservation(dateStr),
    concentration: generateConcentration(dateStr),
  };
}

/* ---------- MÉMOIRE (séquence à reproduire, type Simon) ---------- */
export function generateMemory(dateStr) {
  const rng = seededRng(dateStr, "memory");
  const sequence = Array.from({ length: 9 }, () => Math.floor(rng() * 4));
  return { type: "memory", sequence, maxScore: 9 };
}

/* ---------- CALCUL RAPIDE ---------- */
export function generateCalc(dateStr) {
  const rng = seededRng(dateStr, "calc");
  const questions = [];
  const ops = ["+", "-", "×"];
  for (let i = 0; i < 8; i++) {
    const op = pick(rng, ops);
    let a, b, answer;
    if (op === "+") {
      a = randInt(rng, 3, 30 + i * 5);
      b = randInt(rng, 3, 30 + i * 5);
      answer = a + b;
    } else if (op === "-") {
      a = randInt(rng, 10, 40 + i * 5);
      b = randInt(rng, 1, a);
      answer = a - b;
    } else {
      a = randInt(rng, 2, 9 + Math.floor(i / 2));
      b = randInt(rng, 2, 9 + Math.floor(i / 2));
      answer = a * b;
    }
    questions.push({ a, b, op, answer });
  }
  return { type: "calc", questions, maxScore: 8 };
}

/* ---------- LOGIQUE (suites numériques) ---------- */
export function generateLogic(dateStr) {
  const rng = seededRng(dateStr, "logic");
  const patternTypes = ["arithmetic", "geometric", "fibonacci", "alternating"];
  const questions = [];
  for (let i = 0; i < 5; i++) {
    const kind = pick(rng, patternTypes);
    let terms = [];
    let next;
    if (kind === "arithmetic") {
      const start = randInt(rng, 1, 12);
      const step = randInt(rng, 2, 9);
      terms = [start, start + step, start + 2 * step, start + 3 * step];
      next = start + 4 * step;
    } else if (kind === "geometric") {
      const start = randInt(rng, 1, 5);
      const ratio = randInt(rng, 2, 3);
      terms = [start, start * ratio, start * ratio ** 2, start * ratio ** 3];
      next = start * ratio ** 4;
    } else if (kind === "fibonacci") {
      const a0 = randInt(rng, 1, 6);
      const a1 = randInt(rng, 1, 6);
      const a2 = a0 + a1;
      const a3 = a1 + a2;
      terms = [a0, a1, a2, a3];
      next = a2 + a3;
    } else {
      const start = randInt(rng, 10, 30);
      const up = randInt(rng, 3, 8);
      const down = randInt(rng, 1, 4);
      const t1 = start + up;
      const t2 = t1 - down;
      const t3 = t2 + up;
      terms = [start, t1, t2, t3];
      next = t3 - down;
    }

    const distractors = new Set();
    let guard = 0;
    while (distractors.size < 3 && guard < 50) {
      guard++;
      const delta = randInt(rng, -Math.max(3, Math.abs(next) * 0.2 || 3), Math.max(3, Math.abs(next) * 0.2 || 3));
      const candidate = next + delta === next ? next + delta + 1 : next + delta;
      if (candidate !== next) distractors.add(candidate);
    }
    const options = shuffle(rng, [next, ...Array.from(distractors)]);
    const correctIndex = options.indexOf(next);
    questions.push({ terms, options, correctIndex });
  }
  return { type: "logic", questions, maxScore: 5 };
}

/* ---------- OBSERVATION (intrus dans une grille) ---------- */
const EMOJI_PAIRS = [
  ["⭐", "🌟"],
  ["🔵", "🟣"],
  ["🟩", "🟦"],
  ["🔺", "🔻"],
  ["🍀", "☘️"],
  ["⚡", "✨"],
  ["🌙", "🌛"],
  ["❤️", "🧡"],
  ["🟠", "🔴"],
  ["🐱", "🐈"],
];

export function generateObservation(dateStr) {
  const rng = seededRng(dateStr, "observation");
  const sizes = [9, 9, 16, 16, 25];
  const rounds = sizes.map((size) => {
    const [base, odd] = pick(rng, EMOJI_PAIRS);
    const oddIndex = Math.floor(rng() * size);
    return { size, base, odd, oddIndex };
  });
  return { type: "observation", rounds, maxScore: rounds.length };
}

/* ---------- CONCENTRATION (effet Stroop) ---------- */
export const COLOR_DEFS = [
  { key: "red", hex: "#D66B63" },
  { key: "blue", hex: "#4FA3A0" },
  { key: "yellow", hex: "#E8C468" },
  { key: "green", hex: "#7FB88A" },
  { key: "purple", hex: "#9B8AC4" },
];

export function generateConcentration(dateStr) {
  const rng = seededRng(dateStr, "concentration");
  const rounds = [];
  for (let i = 0; i < 10; i++) {
    const wordColor = pick(rng, COLOR_DEFS).key;
    let displayColor = pick(rng, COLOR_DEFS).key;
    // biaise vers un décalage mot/couleur (plus difficile) environ 75% du temps
    if (rng() < 0.75 && displayColor === wordColor) {
      const others = COLOR_DEFS.filter((c) => c.key !== wordColor);
      displayColor = pick(rng, others).key;
    }
    rounds.push({ wordColor, displayColor, timeMs: Math.max(1500, 3000 - i * 130) });
  }
  return { type: "concentration", rounds, maxScore: rounds.length };
}

export function rewardForScore(score, maxScore) {
  const accuracy = maxScore > 0 ? score / maxScore : 0;
  const xp = Math.round(15 + accuracy * 45);
  const coins = Math.round(5 + accuracy * 15);
  return { xp, coins };
}
