import { randomInt, pickOne } from "../random.js";
import { clamp, gcd, rampValue } from "../math.js";

const PROPER_FRACTION_SHARE = 0.8;
const SUM_DENOMINATOR_CAP = 24;
const PRODUCT_DENOMINATOR_CAP = 16;
const MIXED_DENOMINATOR_CAP = 12;
// Bei Nenner 2 ist 1/2 der einzige mögliche Bruch — drei davon ergäben lauter
// gleiche Aufgaben, deshalb startet die Rampe der gemischten Aufgaben höher.
const MIXED_DENOMINATOR_START = 4;

function randomFraction(random, maxDenominator, maxNumerator) {
  const denominator = randomInt(random, 2, Math.max(2, maxDenominator));
  const numeratorCeiling = Math.max(1, Math.min(denominator - 1, maxNumerator));
  return { numerator: randomInt(random, 1, numeratorCeiling), denominator };
}

// -- Section I: Brüche kürzen --------------------------------------------

export function createKuerzenTask(random, index, count, settings) {
  const baseEnd = clamp(Math.floor(settings.maxDenominator / 2), 4, 40);
  const factorEnd = clamp(Math.floor(settings.maxDenominator / 5), 2, 12);
  const baseMax = rampValue(index, count, Math.min(4, baseEnd), baseEnd);
  const factorMax = rampValue(index, count, 2, factorEnd);
  const scale = randomInt(random, 2, Math.max(2, Math.min(
    factorMax,
    Math.floor(settings.maxDenominator / 3),
    Math.floor(settings.maxNumerator / 3)
  )));
  const aMax = Math.max(3, Math.min(baseMax, Math.floor(settings.maxNumerator / scale)));
  const bMax = Math.max(3, Math.min(baseMax, Math.floor(settings.maxDenominator / scale)));

  let a;
  let b;
  // Ohne "Zähler immer kleiner" bleiben 20 % der Aufgaben unechte Brüche.
  if (settings.properOnly || random() < PROPER_FRACTION_SHARE) {
    b = randomInt(random, 3, bMax);
    a = randomInt(random, 2, Math.min(aMax, b - 1));
  } else {
    a = randomInt(random, 3, aMax);
    b = randomInt(random, 2, Math.min(bMax, a - 1));
  }

  const numerator = a * scale;
  const denominator = b * scale;
  const divisor = gcd(numerator, denominator);
  return {
    numerator,
    denominator,
    answerNumerator: numerator / divisor,
    answerDenominator: denominator / divisor
  };
}

// -- Section II: Brüche erweitern ----------------------------------------

export function createErweiternTask(random, index, count, settings) {
  const baseEnd = clamp(Math.floor(settings.maxDenominator / 3), 3, 20);
  const factorEnd = clamp(Math.floor(settings.maxDenominator / 4), 2, 10);
  const baseMax = rampValue(index, count, Math.min(3, baseEnd), baseEnd);
  const factorMax = rampValue(index, count, 2, factorEnd);
  const scale = randomInt(random, 2, Math.max(2, Math.min(
    factorMax,
    Math.floor(settings.maxDenominator / 3),
    settings.maxNumerator
  )));
  const bMax = Math.max(3, Math.min(baseMax, Math.floor(settings.maxDenominator / scale)));
  const aMax = Math.max(1, Math.floor(settings.maxNumerator / scale));

  let a;
  let b;
  let attempts = 0;
  do {
    b = randomInt(random, 3, bMax);
    a = randomInt(random, 1, Math.min(b - 1, aMax));
    attempts++;
  } while (gcd(a, b) !== 1 && attempts < 30);
  if (gcd(a, b) !== 1) a = 1;

  const expandedNumerator = a * scale;
  const expandedDenominator = b * scale;
  const blankIsNumerator = random() < 0.5;
  return {
    numerator: a,
    denominator: b,
    targetNumerator: blankIsNumerator ? null : expandedNumerator,
    targetDenominator: blankIsNumerator ? expandedDenominator : null,
    answerValue: blankIsNumerator ? expandedNumerator : expandedDenominator
  };
}

// -- Fraction arithmetic sections -----------------------------------------

function sumDenominatorMax(index, count, settings) {
  return rampValue(index, count, 3, clamp(Math.floor(settings.maxDenominator * 0.7), 3, SUM_DENOMINATOR_CAP));
}

function productDenominatorMax(index, count, settings) {
  return rampValue(index, count, 2, clamp(Math.floor(settings.maxDenominator / 2), 2, PRODUCT_DENOMINATOR_CAP));
}

export function createAdditionFractionTask(random, index, count, settings) {
  // Unter Nenner 3 gibt es keine zwei echten Brüche mit echter Summe.
  const maxDen = Math.max(settings.properOnly ? 3 : 2, sumDenominatorMax(index, count, settings));
  let a;
  let b;
  let numerator;
  let denominator;
  let attempts = 0;
  do {
    a = randomFraction(random, maxDen, settings.maxNumerator);
    b = randomFraction(random, maxDen, settings.maxNumerator);
    numerator = a.numerator * b.denominator + b.numerator * a.denominator;
    denominator = a.denominator * b.denominator;
    attempts++;
  } while (settings.properOnly && numerator >= denominator && attempts < 30);
  if (settings.properOnly && numerator >= denominator) {
    a = b = { numerator: 1, denominator: 3 };
    numerator = 2;
    denominator = 3;
  }
  const divisor = gcd(numerator, denominator);
  return {
    aNum: a.numerator,
    aDen: a.denominator,
    bNum: b.numerator,
    bDen: b.denominator,
    operatorSymbol: "+",
    answerNumerator: numerator / divisor,
    answerDenominator: denominator / divisor
  };
}

export function createSubtractionFractionTask(random, index, count, settings) {
  const maxDen = sumDenominatorMax(index, count, settings);
  let a;
  let b;
  let numerator;
  const denominator = () => a.denominator * b.denominator;
  let attempts = 0;
  do {
    a = randomFraction(random, maxDen, settings.maxNumerator);
    b = randomFraction(random, maxDen, settings.maxNumerator);
    if (a.numerator * b.denominator < b.numerator * a.denominator) {
      [a, b] = [b, a];
    }
    numerator = a.numerator * b.denominator - b.numerator * a.denominator;
    attempts++;
  } while (numerator === 0 && attempts < 30);
  if (numerator === 0) {
    a = { numerator: 2, denominator: 3 };
    b = { numerator: 1, denominator: 3 };
    numerator = 3;
  }
  const divisor = gcd(numerator, denominator());
  return {
    aNum: a.numerator,
    aDen: a.denominator,
    bNum: b.numerator,
    bDen: b.denominator,
    operatorSymbol: "−",
    answerNumerator: numerator / divisor,
    answerDenominator: denominator() / divisor
  };
}

export function createMultiplicationFractionTask(random, index, count, settings) {
  const maxDen = productDenominatorMax(index, count, settings);
  const a = randomFraction(random, maxDen, settings.maxNumerator);
  const b = randomFraction(random, maxDen, settings.maxNumerator);
  const numerator = a.numerator * b.numerator;
  const denominator = a.denominator * b.denominator;
  const divisor = gcd(numerator, denominator);
  return {
    aNum: a.numerator,
    aDen: a.denominator,
    bNum: b.numerator,
    bDen: b.denominator,
    operatorSymbol: "⋅",
    answerNumerator: numerator / divisor,
    answerDenominator: denominator / divisor
  };
}

export function createDivisionFractionTask(random, index, count, settings) {
  const maxDen = Math.max(settings.properOnly ? 3 : 2, productDenominatorMax(index, count, settings));
  let a;
  let b;
  let numerator;
  let denominator;
  let attempts = 0;
  do {
    a = randomFraction(random, maxDen, settings.maxNumerator);
    b = randomFraction(random, maxDen, settings.maxNumerator);
    // a/b : c/d ist genau dann ein echter Bruch, wenn a/b < c/d ist.
    if (settings.properOnly && a.numerator * b.denominator > b.numerator * a.denominator) {
      [a, b] = [b, a];
    }
    numerator = a.numerator * b.denominator;
    denominator = a.denominator * b.numerator;
    attempts++;
  } while (settings.properOnly && numerator >= denominator && attempts < 30);
  if (settings.properOnly && numerator >= denominator) {
    a = { numerator: 1, denominator: 3 };
    b = { numerator: 2, denominator: 3 };
    numerator = 1;
    denominator = 2;
  }
  const divisor = gcd(numerator, denominator);
  return {
    aNum: a.numerator,
    aDen: a.denominator,
    bNum: b.numerator,
    bDen: b.denominator,
    operatorSymbol: ":",
    answerNumerator: numerator / divisor,
    answerDenominator: denominator / divisor
  };
}

// -- Mixed blocks: three fractions, two operators --------------------------

const HIGH_PRECEDENCE = new Set(["⋅", ":"]);

function applyOperation(symbol, a, b) {
  if (symbol === "+") return { n: a.n * b.d + b.n * a.d, d: a.d * b.d };
  if (symbol === "−") return { n: a.n * b.d - b.n * a.d, d: a.d * b.d };
  if (symbol === "⋅") return { n: a.n * b.n, d: a.d * b.d };
  if (symbol === ":") return { n: a.n * b.d, d: a.d * b.n };
  throw new RangeError(`Unknown operation: ${symbol}`);
}

// Punkt vor Strich: bei gemischter Priorität wird der Punktteil zuerst
// gerechnet, sonst von links nach rechts.
export function evaluateMixed(parts, firstSymbol, secondSymbol) {
  if (!HIGH_PRECEDENCE.has(firstSymbol) && HIGH_PRECEDENCE.has(secondSymbol)) {
    const inner = applyOperation(secondSymbol, parts[1], parts[2]);
    return { inner, result: applyOperation(firstSymbol, parts[0], inner) };
  }
  const inner = applyOperation(firstSymbol, parts[0], parts[1]);
  return { inner, result: applyOperation(secondSymbol, inner, parts[2]) };
}

export function createMixedTask(symbols) {
  if (!symbols.length || symbols.some(symbol => !["+", "−", "⋅", ":"].includes(symbol))) {
    throw new RangeError("Mixed tasks require at least one supported operation.");
  }
  return (random, index, count, settings) => {
    const maxDen = rampValue(index, count, MIXED_DENOMINATOR_START, clamp(Math.floor(settings.maxDenominator / 2), MIXED_DENOMINATOR_START, MIXED_DENOMINATOR_CAP));
    const build = (parts, firstSymbol, secondSymbol) => {
      const { inner, result } = evaluateMixed(parts, firstSymbol, secondSymbol);
      if (inner.n <= 0 || result.n <= 0 || (settings.properOnly && result.n >= result.d)) return null;
      const divisor = gcd(result.n, result.d);
      return {
        aNum: parts[0].n,
        aDen: parts[0].d,
        firstSymbol,
        bNum: parts[1].n,
        bDen: parts[1].d,
        secondSymbol,
        cNum: parts[2].n,
        cDen: parts[2].d,
        answerNumerator: result.n / divisor,
        answerDenominator: result.d / divisor
      };
    };
    for (let attempt = 0; attempt < 60; attempt++) {
      const parts = [0, 1, 2].map(() => {
        const fraction = randomFraction(random, maxDen, settings.maxNumerator);
        return { n: fraction.numerator, d: fraction.denominator };
      });
      const task = build(parts, pickOne(random, symbols), pickOne(random, symbols));
      if (task) return task;
    }
    // Bounded fallback preserves the requested operations AND proper-fraction rule.
    // These candidates fit even the smallest supported number range.
    const candidates = [{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 1, d: 4 }, { n: 2, d: 3 }, { n: 3, d: 4 }];
    for (const a of candidates) for (const b of candidates) for (const c of candidates) {
      const task = build([a, b, c], symbols[0], symbols[0]);
      if (task) return task;
    }
    throw new RangeError("No valid mixed task for the selected operations.");
  };
}
