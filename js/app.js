// Nur Kürzen und Erweitern sind auf dem Startblatt an — die vier
// Rechenarten-Abschnitte und Gemischte Aufgaben muss die Lehrkraft bewusst
// dazuschalten (siehe growToEvenPages-Aufruf im Controller, der Kürzen/
// Erweitern anschließend proportional bis zur nächsten geraden Seitenzahl
// hochskaliert, statt mit einem vorkonfigurierten Block zu starten).
const KUERZEN_COUNT = 32;
const ERWEITERN_COUNT = 12;
const OPERATION_SECTION_DEFAULT_COUNT = 0;

const TASK_GRID_COLUMNS = 4;
const MIXED_GRID_COLUMNS = 3;

// Seitenaufteilung rechnet in echten Pixeln der *Druck*-Geometrie, nicht in
// abstrakten "Lasteinheiten". Alle Werte sind aus einem echten PDF ausgelesen
// (Textpositionen in page.pdf(), pt → px mit 96/72), nicht geschätzt:
//   Satzspiegel    Seitenhöhe 1123.84 − 2×16mm Rand (60.47) = 1002.9px
//   Aufgabenzeile  Zeilenkasten 42 + row-gap 6 → Raster 48px
//   Überschrift    margin-top 22 + 20 + margin-bottom 12     = 54px
//                  am Seitenanfang ohne margin-top           = 32px
//   Titelzeile     26 + margin-bottom 18                     = 44px
// Wichtig: am Bildschirm misst dieselbe Zeile nur 40.4px (46.19px Raster) —
// Chromium rendert Text im Druck mit anderen Metriken. Für die Seitenaufteilung
// zählt allein die Druckgeometrie, sonst bricht die Vorschau an anderen Stellen
// um als der Ausdruck. Ein Vorgängermodell rechnete mit angepassten
// Lasteinheiten (55/59 Aufgaben je Seite); die waren gegenüber diesem
// Stylesheet um rund ein Drittel zu klein, sodass die Vorschau schon nach
// Abschnitt II umbrach, während der Ausdruck noch III und IV auf dieselbe Seite
// setzte. Ändern sich Schriftgrößen oder Abstände: am PDF neu messen
// (siehe CLAUDE.md), nicht nach Augenmaß nachziehen.
const PAGE_CONTENT_PX = 1002.9;
const TASK_ROW_BOX_PX = 42;
const TASK_ROW_GAP_PX = 6;
const SECTION_HEAD_PX = 54;
const SECTION_HEAD_TOP_PX = 32;
// Die Überschrift eines gemischten Blocks trägt das Malzeichen "⋅" aus einer
// Ersatzschrift (siehe CLAUDE.md) und ist dadurch 1px höher als die anderen.
// Klingt nach Kleinkram, entscheidet aber echte Grenzfälle: bei einem
// vermessenen Blatt lag der Umbruch genau auf diesem einen Pixel.
const MIXED_HEAD_EXTRA_PX = 1;
const TITLE_PX = 44;

// Der Lösungsteil, ebenfalls am PDF gemessen: eine Antwortzeile ist 23px hoch,
// vom Ende der letzten Aufgabenzeile bis zur ersten Antwortzeile sind es 78px
// (margin-top, Trennlinie, padding, "Lösungen"-Label, Gruppenlabel), und von
// einer Gruppe zur nächsten 24px (10px Abstand + Gruppenlabel). Am Seitenanfang
// entfällt jeweils der obere Abstand.
// Der Lösungsteil bricht zeilenweise um, nicht nur zwischen Gruppen: bei einem
// Blatt mit 64 Kürzen-Aufgaben standen drei Antwortzeilen der ersten Gruppe auf
// Seite 1 und fünf auf Seite 2.
// Der "Lösungen"-Balken samt Trennlinie ist ein eigener Block: der Browser
// lässt ihn am Seitenfuß stehen und beginnt die Gruppen erst auf der nächsten
// Seite, statt ihn mitzuziehen. Genau so gemessen — auf einem Blatt stand der
// Balken unten auf Seite 4 und die erste Antwortzeile oben auf Seite 5.
const SOLUTIONS_COLUMNS = 8;
const SOLUTIONS_ROW_PX = 23;
const SOLUTIONS_BANNER_PX = 63.5;
const SOLUTIONS_BANNER_TOP_PX = 41.5;
const SOLUTIONS_FIRST_HEAD_PX = 14.5;
const SOLUTIONS_GROUP_HEAD_PX = 24;
const SOLUTIONS_GROUP_HEAD_TOP_PX = 15;

const PROPER_FRACTION_SHARE = 0.8;
const DEFAULT_MAX_NUMERATOR = 26;
const DEFAULT_MAX_DENOMINATOR = 36;
const DEFAULT_BLOCK_COUNT = 12;
const BLOCK_COUNT_OPTIONS = [6, 9, 12, 15, 18, 24, 30];
// Schnellwahl für die Blockgröße, analog zu TYPE_QUICK_PICKS: eine Auswahl der
// gängigen Größen aus BLOCK_COUNT_OPTIONS, die Auswahlliste bleibt Quelle für
// alle Werte (auch die hier ausgelassenen 9 und 15).
const BLOCK_QUICK_PICKS = [6, 12, 18, 24, 30];

// Aufgabenzahl je Typ: Schnellwahl für die üblichen Größen, Auswahlliste für
// alles dazwischen. Alle Werte sind Vielfache der Spaltenzahl, damit die
// letzte Zeile eines Abschnitts immer voll ist.
const TYPE_COUNT_OPTIONS = Array.from({ length: 17 }, (_, index) => index * TASK_GRID_COLUMNS);
const TYPE_QUICK_PICKS = [0, 8, 16, 24, 32];
const MAX_TYPE_COUNT = TYPE_COUNT_OPTIONS[TYPE_COUNT_OPTIONS.length - 1];

// Obergrenzen für die Nenner der Rechenabschnitte. Die Nennerschieber begrenzen
// die Aufgabe, aber die Ergebnisnenner multiplizieren sich — ohne diese Deckel
// stünden im Lösungsschlüssel vierstellige Nenner.
const SUM_DENOMINATOR_CAP = 24;
const PRODUCT_DENOMINATOR_CAP = 16;
const MIXED_DENOMINATOR_CAP = 12;
// Bei Nenner 2 ist 1/2 der einzige mögliche Bruch — drei davon ergäben lauter
// gleiche Aufgaben, deshalb startet die Rampe der gemischten Aufgaben höher.
const MIXED_DENOMINATOR_START = 4;
// Fester Startwert für die Beispielaufgabe eines Blocks: das Beispiel soll sich
// nur ändern, wenn sich Rechenarten, Anzahl oder Zahlenbereich ändern — nicht
// bei jeder anderen Einstellung im Formular.
const BLOCK_EXAMPLE_SEED = 0x5eed;

function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(random, min, max) {
  const upper = Math.max(min, max);
  return Math.floor(random() * (upper - min + 1)) + min;
}

function pickOne(random, values) {
  return values[randomInt(random, 0, values.length - 1)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function rampValue(index, count, start, end) {
  const t = count > 1 ? index / (count - 1) : 0;
  return Math.round(start + (end - start) * t);
}

function toRoman(value) {
  const table = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let rest = value;
  let result = "";
  for (const [amount, symbol] of table) {
    while (rest >= amount) {
      result += symbol;
      rest -= amount;
    }
  }
  return result;
}

function randomFraction(random, maxDenominator, maxNumerator) {
  const denominator = randomInt(random, 2, Math.max(2, maxDenominator));
  const numeratorCeiling = Math.max(1, Math.min(denominator - 1, maxNumerator));
  return { numerator: randomInt(random, 1, numeratorCeiling), denominator };
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[character]));
}

// -- Section I: Brüche kürzen --------------------------------------------

function createKuerzenTask(random, index, count, settings) {
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

function createErweiternTask(random, index, count, settings) {
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

function createAdditionFractionTask(random, index, count, settings) {
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

function createSubtractionFractionTask(random, index, count, settings) {
  const maxDen = sumDenominatorMax(index, count, settings);
  let a;
  let b;
  let numerator;
  const denominator = () => a.denominator * b.denominator;
  do {
    a = randomFraction(random, maxDen, settings.maxNumerator);
    b = randomFraction(random, maxDen, settings.maxNumerator);
    if (a.numerator * b.denominator < b.numerator * a.denominator) {
      [a, b] = [b, a];
    }
    numerator = a.numerator * b.denominator - b.numerator * a.denominator;
  } while (numerator === 0);
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

function createMultiplicationFractionTask(random, index, count, settings) {
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

function createDivisionFractionTask(random, index, count, settings) {
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
  return { n: a.n * b.d, d: a.d * b.n };
}

// Punkt vor Strich: bei gemischter Priorität wird der Punktteil zuerst
// gerechnet, sonst von links nach rechts.
function evaluateMixed(parts, firstSymbol, secondSymbol) {
  if (!HIGH_PRECEDENCE.has(firstSymbol) && HIGH_PRECEDENCE.has(secondSymbol)) {
    const inner = applyOperation(secondSymbol, parts[1], parts[2]);
    return { inner, result: applyOperation(firstSymbol, parts[0], inner) };
  }
  const inner = applyOperation(firstSymbol, parts[0], parts[1]);
  return { inner, result: applyOperation(secondSymbol, inner, parts[2]) };
}

function createMixedTask(symbols) {
  return (random, index, count, settings) => {
    const maxDen = rampValue(index, count, MIXED_DENOMINATOR_START, clamp(Math.floor(settings.maxDenominator / 2), MIXED_DENOMINATOR_START, MIXED_DENOMINATOR_CAP));
    let fallback = null;

    for (let attempt = 0; attempt < 60; attempt++) {
      const parts = [0, 1, 2].map(() => {
        const fraction = randomFraction(random, maxDen, settings.maxNumerator);
        return { n: fraction.numerator, d: fraction.denominator };
      });
      const firstSymbol = pickOne(random, symbols);
      const secondSymbol = pickOne(random, symbols);
      const { inner, result } = evaluateMixed(parts, firstSymbol, secondSymbol);

      // Zwischenergebnis und Ergebnis müssen positiv bleiben: auf dem
      // Arbeitsblatt kommen keine negativen Zahlen vor.
      if (inner.n <= 0 || result.n <= 0) continue;

      const divisor = gcd(result.n, result.d);
      const task = {
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
      if (!settings.properOnly || result.n < result.d) return task;
      if (!fallback) fallback = task;
    }

    if (fallback) return fallback;
    // Reine Additionen sind immer positiv und damit ein sicherer Ausweg.
    return createMixedTask(["+"])(random, index, count, { ...settings, properOnly: false });
  };
}

const OPERATION_CHOICES = [
  { value: "addition", label: "Addition", symbol: "+", createTask: createAdditionFractionTask },
  { value: "subtraktion", label: "Subtraktion", symbol: "−", createTask: createSubtractionFractionTask },
  { value: "multiplikation", label: "Multiplikation", symbol: "⋅", createTask: createMultiplicationFractionTask },
  { value: "division", label: "Division", symbol: ":", createTask: createDivisionFractionTask }
];

function createBlockDefinition(block) {
  const operations = OPERATION_CHOICES.filter((choice) => block.operations.includes(choice.value));
  const symbols = operations.map((choice) => choice.symbol);
  return {
    key: `block-${block.id}`,
    heading: `Gemischte Aufgaben (${symbols.join(" ")})`,
    count: block.count,
    type: "mixed",
    createTask: createMixedTask(symbols)
  };
}

function taskSignature(type, task) {
  if (type === "erweitern") {
    return `${task.numerator}/${task.denominator}->${task.targetNumerator ?? "_"}/${task.targetDenominator ?? "_"}`;
  }
  if (type === "mixed") {
    return `${task.aNum}/${task.aDen}${task.firstSymbol}${task.bNum}/${task.bDen}${task.secondSymbol}${task.cNum}/${task.cDen}`;
  }
  if (type === "operation") {
    return `${task.aNum}/${task.aDen}${task.operatorSymbol}${task.bNum}/${task.bDen}`;
  }
  return `${task.numerator}/${task.denominator}`;
}

function createUniqueTasks(definition, count, random, settings) {
  const seen = new Set();
  return Array.from({ length: count }, (_, index) => {
    let task;
    let attempts = 0;
    do {
      task = definition.createTask(random, index, count, settings);
      attempts++;
    } while (seen.has(taskSignature(definition.type, task)) && attempts < 30);
    seen.add(taskSignature(definition.type, task));
    return task;
  });
}

function nextBlockOption(count) {
  return BLOCK_COUNT_OPTIONS.find((option) => option > count);
}

const SECTION_DEFINITIONS = [
  { key: "kuerzen", heading: "Brüche kürzen", count: KUERZEN_COUNT, createTask: createKuerzenTask, type: "kuerzen" },
  { key: "erweitern", heading: "Brüche erweitern", count: ERWEITERN_COUNT, createTask: createErweiternTask, type: "erweitern" },
  { key: "addition", heading: "Addition", count: OPERATION_SECTION_DEFAULT_COUNT, createTask: createAdditionFractionTask, type: "operation" },
  { key: "subtraktion", heading: "Subtraktion", count: OPERATION_SECTION_DEFAULT_COUNT, createTask: createSubtractionFractionTask, type: "operation" },
  { key: "multiplikation", heading: "Multiplikation", count: OPERATION_SECTION_DEFAULT_COUNT, createTask: createMultiplicationFractionTask, type: "operation" },
  { key: "division", heading: "Division", count: OPERATION_SECTION_DEFAULT_COUNT, createTask: createDivisionFractionTask, type: "operation" }
];

const DEFAULT_SECTION_COUNTS = Object.fromEntries(
  SECTION_DEFINITIONS.map((definition) => [definition.key, definition.count])
);

class WorksheetModel {
  constructor() {
    this.state = {
      title: "Arbeitsblatt Brüche",
      sectionCounts: { ...DEFAULT_SECTION_COUNTS },
      maxNumerator: DEFAULT_MAX_NUMERATOR,
      maxDenominator: DEFAULT_MAX_DENOMINATOR,
      properOnly: true,
      blocks: []
    };
    this.lastDefinitions = new Map();
  }

  update(patch) {
    this.state = { ...this.state, ...patch };
  }

  getState() {
    return { ...this.state };
  }

  getGeneratorSettings() {
    return {
      maxNumerator: this.state.maxNumerator,
      maxDenominator: this.state.maxDenominator,
      properOnly: this.state.properOnly
    };
  }

  // Mirrors what createWorksheet would build, without generating any tasks.
  // Ein Block ohne gewählte Rechenarten zählt nicht mit — die Lehrkraft muss
  // sie erst auswählen.
  planSections(settings) {
    const baseSections = SECTION_DEFINITIONS
      .map((definition) => ({ definition, count: settings.sectionCounts[definition.key] || 0 }))
      .filter((entry) => entry.count > 0);
    const blocks = (settings.blocks || []).filter((block) => block.operations.length > 0 && block.count > 0);
    return { baseSections, blocks };
  }

  estimateLayout(settings) {
    const plan = this.planSections(settings);
    const standardTotal = plan.baseSections.reduce((sum, entry) => sum + entry.count, 0);
    const blockTotal = plan.blocks.reduce((sum, block) => sum + block.count, 0);
    const sectionCount = plan.baseSections.length + plan.blocks.length;
    const units = [
      ...plan.baseSections.map((entry) => ({ mixed: false, count: entry.count })),
      ...plan.blocks.map((block) => ({ mixed: true, count: block.count }))
    ];
    const { pages, freePx } = paginateWorksheet(units);
    const canGrow = plan.baseSections.some((entry) => entry.count < MAX_TYPE_COUNT)
      || plan.blocks.some((block) => nextBlockOption(block.count) !== undefined);
    // Eine zusätzliche Aufgabenzeile kostet die Zeile samt Abstand plus die
    // halbe Zeile, die ihre vier Antworten im 8-spaltigen Lösungsraster belegen.
    const rowCostPx = TASK_ROW_BOX_PX + TASK_ROW_GAP_PX
      + (TASK_GRID_COLUMNS / SOLUTIONS_COLUMNS) * SOLUTIONS_ROW_PX;
    return {
      total: standardTotal + blockTotal,
      pages,
      freePx,
      missing: Math.floor(freePx / rowCostPx) * TASK_GRID_COLUMNS,
      canGrow,
      incompleteBlocks: (settings.blocks || []).filter((block) => block.operations.length === 0).length,
      empty: sectionCount === 0
    };
  }

  // Skaliert die gewählten Aufgabenzahlen proportional auf die Zielseitenzahl —
  // nach oben wie nach unten, damit das von der Lehrkraft eingestellte
  // Verhältnis erhalten bleibt. Ein gewählter Typ fällt dabei nie ganz weg.
  // Geprüft wird direkt die Seitenzahl, nicht ein Ersatzmaß dafür: nur so kann
  // das Ergebnis nicht doch eine Seite zu lang werden.
  scaleSectionCounts(settings, targetPages) {
    const activeKeys = Object.keys(settings.sectionCounts).filter((key) => settings.sectionCounts[key] > 0);
    if (activeKeys.length === 0) return settings.sectionCounts;

    let smallest = null;
    let best = null;
    for (let step = 1; step <= 600; step++) {
      const factor = step * 0.02;
      const scaled = { ...settings.sectionCounts };
      activeKeys.forEach((key) => {
        const raw = Math.round((settings.sectionCounts[key] * factor) / TASK_GRID_COLUMNS) * TASK_GRID_COLUMNS;
        scaled[key] = clamp(raw, TASK_GRID_COLUMNS, MAX_TYPE_COUNT);
      });
      if (!smallest) smallest = scaled;
      // Die Seitenzahl wächst monoton mit dem Faktor: die erste Überschreitung
      // endet die Suche.
      if (this.estimateLayout({ ...settings, sectionCounts: scaled }).pages > targetPages) break;
      best = scaled;
    }
    return best || smallest;
  }

  // Bringt die Aufgabenzahlen auf eine gerade Seitenzahl. Zuerst wird nach oben
  // aufgefüllt; wenn das die nächste gerade Seitenzahl nicht erreicht (etwa
  // weil alle Typen am Maximum stehen), wird stattdessen auf die nächstkleinere
  // gerade Seitenzahl verkleinert — sonst bliebe das Blatt dauerhaft ungerade.
  fillCounts(settings) {
    const { pages } = this.estimateLayout(settings);
    const grown = this.scaleSectionCounts(settings, Math.max(2, pages + (pages % 2)));
    const grownPages = this.estimateLayout({ ...settings, sectionCounts: grown }).pages;
    if (grownPages % 2 === 0) return grown;
    return this.scaleSectionCounts(settings, Math.max(2, grownPages - 1));
  }

  // Eine Beispielaufgabe je Block, erzeugt mit demselben Generator wie das
  // Arbeitsblatt und denselben Einstellungen — die Lehrkraft sieht also
  // wirklich, was der Block liefert, nicht eine nachgebaute Attrappe. Der
  // Index liegt in der Mitte der Rampe, damit das Beispiel weder die
  // leichteste noch die schwerste Aufgabe des Blocks zeigt.
  // Ein Block ohne Rechenart liefert null: er wird auch nicht erzeugt.
  createBlockExamples(settings) {
    return (settings.blocks || []).map((block) => {
      if (!block.operations || block.operations.length === 0) return null;
      const count = Math.max(1, block.count);
      const random = createRandom(BLOCK_EXAMPLE_SEED + Number(block.id));
      return createBlockDefinition(block).createTask(random, Math.floor((count - 1) / 2), count, settings);
    });
  }

  createWorksheet() {
    const seed = Math.floor(Math.random() * 0xffffffff);
    const random = createRandom(seed);
    const settings = this.getGeneratorSettings();
    const plan = this.planSections(this.state);

    const definitions = [...plan.baseSections.map((entry) => entry.definition), ...plan.blocks.map(createBlockDefinition)];
    const counts = [...plan.baseSections.map((entry) => entry.count), ...plan.blocks.map((block) => block.count)];

    this.lastDefinitions = new Map();
    const sections = definitions.map((definition, i) => {
      this.lastDefinitions.set(definition.key, definition);
      const tasks = createUniqueTasks(definition, counts[i], random, settings);
      return { key: definition.key, heading: definition.heading, type: definition.type, tasks };
    });

    this.lastWorksheet = { ...this.getState(), seed, sections };
    return this.lastWorksheet;
  }

  regenerateTask(sectionKey, taskIndex) {
    if (!this.lastWorksheet) return this.lastWorksheet;
    const definition = this.lastDefinitions.get(sectionKey);
    const section = this.lastWorksheet.sections.find((s) => s.key === sectionKey);
    if (!definition || !section || !section.tasks[taskIndex]) return this.lastWorksheet;

    const random = createRandom(Math.floor(Math.random() * 0xffffffff));
    const settings = this.getGeneratorSettings();
    // Die aktuelle Aufgabe zählt mit: sonst darf das Neuwürfeln dieselbe
    // Aufgabe liefern, und der Klick sieht wirkungslos aus. Ist der
    // Zahlenraum erschöpft, greift nach 30 Versuchen weiterhin der Notausgang.
    const seen = new Set(section.tasks.map((task) => taskSignature(definition.type, task)));
    let task;
    let attempts = 0;
    do {
      task = definition.createTask(random, taskIndex, section.tasks.length, settings);
      attempts++;
    } while (seen.has(taskSignature(definition.type, task)) && attempts < 30);
    section.tasks[taskIndex] = task;

    return this.lastWorksheet;
  }
}

// Die Abschnitte, auf die es für die Seitenaufteilung ankommt: Reihenfolge wie
// im Blatt, je Abschnitt nur Aufgabenzahl und Rasterbreite. Sowohl der Plan aus
// dem Formular (planSections) als auch ein fertiges Arbeitsblatt lassen sich
// darauf abbilden — so rechnen Hinweis und Vorschau garantiert mit demselben.
function worksheetUnits(worksheet) {
  return worksheet.sections.map((section) => ({ mixed: section.type === "mixed", count: section.tasks.length }));
}

// Bildet die Seitenaufteilung des Druckers nach, indem dieselbe Geometrie
// durchlaufen wird, die der Browser später umbricht: Zeile für Zeile, und eine
// Zeile rutscht ganz auf die nächste Seite, sobald sie nicht mehr vollständig
// passt (break-inside: avoid auf den <li>). Liefert Seitenzahl *und*
// Umbruchstellen aus einem Durchlauf: vorher gab es dafür zwei getrennte
// Rechnungen (eine Formel für die Seitenzahl, ein Walker für die Vorschau), die
// sichtbar auseinanderlaufen konnten.
function paginateWorksheet(units) {
  const breaks = [];
  const solutionBreaks = [];
  let page = 1;
  let used = TITLE_PX;
  const nextPage = () => { page += 1; used = 0; };

  units.forEach((unit, sectionIndex) => {
    const columns = unit.mixed ? MIXED_GRID_COLUMNS : TASK_GRID_COLUMNS;
    const rows = Math.ceil(unit.count / columns);
    const extra = unit.mixed ? MIXED_HEAD_EXTRA_PX : 0;
    // break-after: avoid-page auf der Überschrift: sie darf nicht allein am
    // Seitenfuß stehen, sondern wandert mit ihrer ersten Zeile weiter.
    let headPx = (sectionIndex === 0 ? SECTION_HEAD_TOP_PX : SECTION_HEAD_PX) + extra;
    if (used + headPx + TASK_ROW_BOX_PX > PAGE_CONTENT_PX) {
      nextPage();
      breaks.push({ sectionIndex, taskIndex: 0, page });
      // Am Seitenanfang fällt der obere Abstand weg (Ränder werden beim
      // Seitenumbruch abgeschnitten), die Überschrift kostet dort weniger.
      headPx = SECTION_HEAD_TOP_PX + extra;
    }
    used += headPx;

    for (let row = 0; row < rows; row++) {
      // Der row-gap sitzt *zwischen* zwei Zeilen — hinter der letzten Zeile
      // eines Abschnitts gibt es keinen. Ihn dort mitzuzählen verschöbe jeden
      // folgenden Abschnitt um 6px und über ein langes Blatt um ganze Zeilen.
      const top = used + (row === 0 ? 0 : TASK_ROW_GAP_PX);
      if (top + TASK_ROW_BOX_PX > PAGE_CONTENT_PX) {
        nextPage();
        breaks.push({ sectionIndex, taskIndex: row * columns, page });
        used = TASK_ROW_BOX_PX;
      } else {
        used = top + TASK_ROW_BOX_PX;
      }
    }
  });

  // Der Lösungsteil zählt mit: bei großen Blättern füllt er über eine ganze
  // Seite. Eine Gruppe bleibt dabei immer zusammen (break-inside: avoid, siehe
  // Stylesheet) — sie ist selbst bei 64 Antworten nur acht Zeilen hoch.
  let bannerPage = page;
  if (units.length) {
    if (used + SOLUTIONS_BANNER_PX > PAGE_CONTENT_PX) {
      nextPage();
      used = SOLUTIONS_BANNER_TOP_PX;
    } else {
      used += SOLUTIONS_BANNER_PX;
    }
    bannerPage = page;
  }

  units.forEach((unit, groupIndex) => {
    const groupPx = Math.ceil(unit.count / SOLUTIONS_COLUMNS) * SOLUTIONS_ROW_PX;
    const headPx = groupIndex === 0 ? SOLUTIONS_FIRST_HEAD_PX : SOLUTIONS_GROUP_HEAD_PX;
    if (used + headPx + groupPx > PAGE_CONTENT_PX) {
      nextPage();
      solutionBreaks.push({ groupIndex, rowIndex: 0, page });
      used = SOLUTIONS_GROUP_HEAD_TOP_PX + groupPx;
    } else {
      used += headPx + groupPx;
    }
  });

  return { pages: page, breaks, solutionBreaks, bannerPage, freePx: Math.max(0, PAGE_CONTENT_PX - used) };
}

class WorksheetView {
  constructor(root) {
    this.root = root;
    this.form = root.querySelector("#worksheet-form");
    this.titleInput = root.querySelector("#worksheet-title");
    this.maxNumeratorInput = root.querySelector("#max-numerator");
    this.maxDenominatorInput = root.querySelector("#max-denominator");
    this.maxNumeratorOutput = root.querySelector("#max-numerator-value");
    this.maxDenominatorOutput = root.querySelector("#max-denominator-value");
    this.properOnlyInput = root.querySelector("#proper-only");
    this.blockList = root.querySelector("#block-list");
    this.addBlockButton = root.querySelector("#add-block");
    this.fillButton = root.querySelector("#fill-pages");
    this.fillNote = root.querySelector("#fill-pages-note");
    this.fillHint = root.querySelector("#fill-hint");
    this.previewTitle = root.querySelector("#preview-title");
    this.previewCanvas = root.querySelector("#preview-canvas");
    // Dieselbe Aktion steht oben und unten; beide Schaltflächen tragen
    // data-action="print" statt einer zweiten ID.
    this.printButtons = Array.from(root.querySelectorAll("[data-action='print']"));
    this.typeList = root.querySelector("#type-list");
    // Dieselbe Aktion steht oben und unten; beide tragen data-action="create".
    this.submitButtons = Array.from(root.querySelectorAll("[data-action='create']"));
    this.blockCounter = 0;
    this.renderTypeRows();
    this.watchPreviewWidth();
  }

  renderTypeRows() {
    this.typeList.innerHTML = SECTION_DEFINITIONS.map((definition) => {
      const picks = TYPE_QUICK_PICKS.map((value) => `
        <button type="button" class="quick-pick" data-key="${definition.key}" data-count="${value}"
          aria-label="${escapeHtml(definition.heading)}: ${value === 0 ? "aus" : `${value} Aufgaben`}">${value === 0 ? "Aus" : value}</button>`).join("");
      const options = TYPE_COUNT_OPTIONS.map((value) =>
        `<option value="${value}"${value === definition.count ? " selected" : ""}>${value === 0 ? "Aus" : value}</option>`).join("");
      return `
        <div class="type-row" data-key="${definition.key}">
          <label class="type-name" for="count-${definition.key}">${escapeHtml(definition.heading)}</label>
          <div class="type-controls">
            <div class="quick-picks">${picks}</div>
            <select class="type-count" id="count-${definition.key}" aria-label="${escapeHtml(definition.heading)}: Anzahl Aufgaben">${options}</select>
          </div>
        </div>`;
    }).join("");
    this.syncQuickPicks();
  }

  readSettings() {
    const sectionCounts = {};
    SECTION_DEFINITIONS.forEach((definition) => {
      sectionCounts[definition.key] = Number(this.typeList.querySelector(`#count-${definition.key}`).value);
    });
    return {
      title: this.titleInput.value,
      sectionCounts,
      maxNumerator: Number(this.maxNumeratorInput.value),
      maxDenominator: Number(this.maxDenominatorInput.value),
      properOnly: this.properOnlyInput.checked,
      blocks: this.readBlocks()
    };
  }

  setSectionCounts(counts) {
    Object.entries(counts).forEach(([key, value]) => {
      const select = this.typeList.querySelector(`#count-${key}`);
      if (select) select.value = String(value);
    });
    this.syncQuickPicks();
  }

  // Die Auswahlliste führt den Wert, die Schnellwahl zeigt ihn nur an.
  syncQuickPicks() {
    this.typeList.querySelectorAll(".type-row").forEach((row) => {
      const value = row.querySelector(".type-count").value;
      row.dataset.off = String(Number(value) === 0);
      row.querySelectorAll(".quick-pick").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.count === value));
      });
    });
  }

  setBlockCount(index, count) {
    this.blockList.querySelectorAll(".block-count")[index].value = String(count);
    this.syncBlockQuickPicks();
  }

  // Dasselbe Prinzip wie syncQuickPicks, nur je Block statt je Typ-Zeile: die
  // Auswahlliste des Blocks führt den Wert, die Schnellwahl zeigt ihn nur an.
  syncBlockQuickPicks() {
    this.blockList.querySelectorAll(".block-card").forEach((card) => {
      const value = card.querySelector(".block-count").value;
      card.querySelectorAll(".quick-pick").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.count === value));
      });
    });
  }

  syncBlockWarnings() {
    this.blockList.querySelectorAll(".block-card").forEach((card) => {
      const chosen = card.querySelectorAll(".block-op:checked").length > 0;
      card.dataset.incomplete = String(!chosen);
      card.querySelector(".block-warning").hidden = chosen;
    });
  }

  // Zeigt je Block die Beispielaufgabe aus dem Model. Ohne gewählte Rechenart
  // bleibt die Zeile leer — dort steht bereits die Warnung.
  renderBlockExamples(examples) {
    this.blockList.querySelectorAll(".block-card").forEach((card, index) => {
      const slot = card.querySelector(".block-example");
      if (!slot) return;
      const task = examples[index];
      slot.hidden = !task;
      if (task) slot.querySelector(".block-example-task").innerHTML = this.buildTaskRowHtml("mixed", task);
    });
  }

  readBlocks() {
    return Array.from(this.blockList.querySelectorAll(".block-card")).map((card) => ({
      id: card.dataset.blockId,
      count: Number(card.querySelector(".block-count").value),
      operations: Array.from(card.querySelectorAll(".block-op:checked")).map((input) => input.value)
    }));
  }

  bindSubmit(handler) {
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      handler();
    });
  }

  bindSettingsChange(handler) {
    const sync = () => {
      this.syncRangeOutputs();
      this.syncQuickPicks();
      this.syncBlockQuickPicks();
      this.syncBlockWarnings();
      handler();
    };
    this.form.addEventListener("input", sync);
    this.form.addEventListener("change", sync);
  }

  // Dieselbe Schnellwahl-Logik bedient beide Listen: ein Typ-Knopf trägt
  // data-key (welche Zeile), ein Block-Knopf data-block-id (welcher Block) —
  // das eine oder das andere ist immer gesetzt, nie beides.
  bindQuickPick(handler) {
    const applyPick = (event) => {
      const button = event.target.closest(".quick-pick");
      if (!button) return;
      if (button.dataset.key) {
        this.typeList.querySelector(`#count-${button.dataset.key}`).value = button.dataset.count;
        this.syncQuickPicks();
      } else if (button.dataset.blockId) {
        this.blockList.querySelector(`#block-${button.dataset.blockId}-count`).value = button.dataset.count;
        this.syncBlockQuickPicks();
      } else {
        return;
      }
      handler();
    };
    this.typeList.addEventListener("click", applyPick);
    this.blockList.addEventListener("click", applyPick);
  }

  bindAddBlock(handler) {
    this.addBlockButton.addEventListener("click", handler);
  }

  bindFillPages(handler) {
    this.fillButton.addEventListener("click", handler);
  }

  bindRemoveBlock(handler) {
    this.blockList.addEventListener("click", (event) => {
      const button = event.target.closest(".block-remove");
      if (!button) return;
      button.closest(".block-card").remove();
      this.refreshBlockLabels();
      handler();
    });
  }

  bindPrint(handler) {
    this.printButtons.forEach((button) => button.addEventListener("click", handler));
  }

  bindTaskClick(handler) {
    this.previewCanvas.addEventListener("click", (event) => {
      const button = event.target.closest(".task-row");
      if (!button) return;
      const li = button.closest("li");
      const ol = li.closest(".task-list");
      const sectionEl = ol.closest(".worksheet-section");
      const sectionKey = sectionEl.dataset.sectionKey;
      // Ein Abschnitt kann über mehrere Seiten (und damit mehrere <ol>, je
      // eines pro .worksheet-paper) verteilt sein; der Index innerhalb der
      // angeklickten Liste ist dann nicht der Index im Abschnitt. Das
      // start-Attribut der Liste liefert den Versatz (siehe buildSectionChunks).
      const offset = Number(ol.getAttribute("start") || "1") - 1;
      const taskIndex = offset + Array.from(ol.children).indexOf(li);
      handler(sectionKey, taskIndex);
    });
  }

  addBlock(preferredCount, operations = []) {
    const blockId = ++this.blockCounter;
    // Beim manuellen Anlegen bewusst nichts vorausgewählt: die Lehrkraft soll
    // die Rechenarten wählen.
    const options = OPERATION_CHOICES.map((choice) => `
      <div class="choice-option">
        <input type="checkbox" class="block-op" id="block-${blockId}-${choice.value}" value="${choice.value}"${operations.includes(choice.value) ? " checked" : ""}>
        <label for="block-${blockId}-${choice.value}"><span aria-hidden="true">${choice.symbol}</span><span class="visually-hidden">${choice.label}</span></label>
      </div>`).join("");

    // Immer alle Größen anbieten: eine bei knappem Platz angelegte Auswahlliste
    // bliebe sonst dauerhaft kurz, auch wenn später wieder Platz frei wird.
    const selected = BLOCK_COUNT_OPTIONS.includes(preferredCount) ? preferredCount : DEFAULT_BLOCK_COUNT;
    const countOptions = BLOCK_COUNT_OPTIONS
      .map((value) => `<option value="${value}"${value === selected ? " selected" : ""}>${value}</option>`)
      .join("");
    // Dieselbe Schnellwahl-plus-Auswahlliste wie bei den Aufgabentypen: die
    // Auswahlliste führt den Wert, die Schnellwahl-Knöpfe (data-block-id statt
    // data-key, siehe bindQuickPick) setzen und spiegeln ihn nur.
    const picks = BLOCK_QUICK_PICKS.map((value) => `
        <button type="button" class="quick-pick" data-block-id="${blockId}" data-count="${value}"
          aria-label="Aufgaben: ${value}">${value}</button>`).join("");

    const card = document.createElement("div");
    card.className = "block-card";
    card.dataset.blockId = String(blockId);
    card.innerHTML = `
      <div class="block-card-head">
        <span class="block-card-title">Block</span>
        <button type="button" class="block-remove">Entfernen</button>
      </div>
      <p class="block-prompt">Rechenarten wählen</p>
      <div class="choice-group choice-group--grid4">${options}</div>
      <p class="block-warning">Ohne Rechenart wird dieser Block nicht erzeugt.</p>
      <p class="block-example" hidden>
        <span class="block-example-label">Beispiel</span>
        <span class="block-example-task"></span>
      </p>
      <div class="block-count-row">
        <label for="block-${blockId}-count">Aufgaben</label>
        <div class="type-controls">
          <div class="quick-picks">${picks}</div>
          <select class="block-count" id="block-${blockId}-count">${countOptions}</select>
        </div>
      </div>`;

    this.blockList.appendChild(card);
    this.refreshBlockLabels();
    this.syncBlockWarnings();
    this.syncBlockQuickPicks();
  }

  refreshBlockLabels() {
    Array.from(this.blockList.querySelectorAll(".block-card")).forEach((card, index) => {
      card.querySelector(".block-card-title").textContent = `Block ${index + 1}`;
    });
  }

  syncRangeOutputs() {
    this.maxNumeratorOutput.textContent = this.maxNumeratorInput.value;
    this.maxDenominatorOutput.textContent = this.maxDenominatorInput.value;
  }

  renderFillHint(layout) {
    const pageLabel = layout.pages === 1 ? "1 Seite" : `${layout.pages} Seiten`;
    const odd = layout.pages % 2 === 1;
    let text;
    let state;
    if (layout.empty) {
      text = "Nichts ausgewählt: Stellen Sie für mindestens einen Aufgabentyp eine Anzahl ein oder wählen Sie in einem Block die Rechenarten.";
      state = "warn";
    } else if (layout.incompleteBlocks > 0) {
      text = `${layout.incompleteBlocks === 1 ? "Ein Block hat" : `${layout.incompleteBlocks} Blöcke haben`} noch keine Rechenart — bitte auswählen, sonst ${layout.incompleteBlocks === 1 ? "wird er" : "werden sie"} nicht erzeugt.`;
      state = "warn";
    } else if (odd) {
      text = `${layout.total} Aufgaben auf ${pageLabel} — ungerade Seitenzahl. Beim beidseitigen Druck bleibt eine Rückseite leer; "Seiten füllen" ergänzt auf ${layout.pages + 1} Seiten.`;
      state = "warn";
    } else if (layout.missing >= TASK_GRID_COLUMNS * 2) {
      text = `${layout.total} Aufgaben auf ${pageLabel}: Die letzte Seite bleibt teilweise leer. Ca. ${layout.missing} Aufgaben mehr füllen sie.`;
      state = "warn";
    } else {
      text = `${layout.total} Aufgaben auf ${pageLabel} — die Seiten sind gut gefüllt.`;
      state = "ok";
    }
    this.fillHint.textContent = text;
    this.fillHint.dataset.state = state;
    // Der Knopf erscheint nur, wenn er etwas verbessern könnte: bei ungerader
    // Seitenzahl hilft er immer (notfalls durch Verkleinern auf die
    // nächstkleinere gerade Seitenzahl), sonst nur, wenn noch genug wächst, um
    // die letzte Seite spürbar voller zu machen. Ist nichts ausgewählt, kann er
    // ohnehin nichts tun. Anders als ein bloßes disabled blendet das den Knopf
    // (und die erklärende Notiz darunter) ganz aus, statt ihn wirkungslos
    // stehen zu lassen — "nur anzeigen, wenn es hilft" statt "anzeigen, aber
    // manchmal nichts tun".
    const helpful = !layout.empty && (odd || (layout.canGrow && layout.missing >= TASK_GRID_COLUMNS));
    this.fillButton.hidden = !helpful;
    this.fillNote.hidden = !helpful;
    this.submitButtons.forEach((button) => { button.disabled = layout.empty; });
  }

  fractionHtml(numerator, denominator) {
    const part = (value) => (value === null ? '<span class="fraction-blank" aria-hidden="true"></span>' : value);
    let label;
    if (numerator === null && denominator === null) {
      label = "Bruch, Platz für die Lösung";
    } else if (numerator === null) {
      label = `Bruch mit fehlendem Zähler, Nenner ${denominator}`;
    } else if (denominator === null) {
      label = `Bruch mit fehlendem Nenner, Zähler ${numerator}`;
    } else {
      label = `${numerator} geteilt durch ${denominator}`;
    }
    return `<span class="fraction" aria-label="${label}"><span>${part(numerator)}</span><span>${part(denominator)}</span></span>`;
  }

  // Der reine Aufgabeninhalt ohne <li>/<button>: die Vorschau umschließt ihn
  // mit einer Schaltfläche zum Neuwürfeln, das Beispiel im Block-Kärtchen
  // zeigt ihn unverändert (eine Schaltfläche im Formular wäre dort auch die
  // falsche Semantik).
  buildTaskRowHtml(type, task) {
    let row;
    if (type === "erweitern") {
      row = `${this.fractionHtml(task.numerator, task.denominator)} <span class="equals">=</span> ${this.fractionHtml(task.targetNumerator, task.targetDenominator)}`;
    } else if (type === "mixed") {
      row = `${this.fractionHtml(task.aNum, task.aDen)} <span class="operator">${task.firstSymbol}</span> ${this.fractionHtml(task.bNum, task.bDen)} <span class="operator">${task.secondSymbol}</span> ${this.fractionHtml(task.cNum, task.cDen)} <span class="equals">=</span> ${this.fractionHtml(null, null)}`;
    } else if (type === "operation") {
      row = `${this.fractionHtml(task.aNum, task.aDen)} <span class="operator">${task.operatorSymbol}</span> ${this.fractionHtml(task.bNum, task.bDen)} <span class="equals">=</span> ${this.fractionHtml(null, null)}`;
    } else {
      row = `${this.fractionHtml(task.numerator, task.denominator)} <span class="equals">=</span> ${this.fractionHtml(null, null)}`;
    }
    return row;
  }

  buildItemHtml(type, task) {
    const row = this.buildTaskRowHtml(type, task);
    return `<li><button type="button" class="task-row">${row}<span class="task-hint" aria-hidden="true">Zum Ändern anklicken</span><span class="visually-hidden"> — anklicken zum Neuwürfeln</span></button></li>`;
  }

  buildAnswerHtml(type, task) {
    if (type === "erweitern") {
      const numerator = task.targetNumerator !== null ? task.targetNumerator : task.answerValue;
      const denominator = task.targetDenominator !== null ? task.targetDenominator : task.answerValue;
      return this.fractionHtml(numerator, denominator);
    }
    return this.fractionHtml(task.answerNumerator, task.answerDenominator);
  }

  // sectionBreaks: aufsteigend sortierte {taskIndex, page}-Stellen, an denen
  // laut Lastmodell innerhalb dieses Abschnitts eine neue Seite beginnt.
  // Ergebnis ist ein Chunk pro Seite, auf die der Abschnitt fällt — jeder
  // Chunk bleibt in sein eigenes .worksheet-section gewickelt (nur der erste
  // trägt die Überschrift), weil bindTaskClick per closest('.worksheet-section')
  // den data-section-key sucht: eine fortgesetzte Liste auf einer späteren
  // Seite ohne diesen Wrapper wäre nicht mehr anklickbar. Das <ol>-start
  // setzt die abschnittseigene Nummerierung über Seiten hinweg fort — Seiten
  // unterbrechen die Zählung nicht, nur Abschnitte tun das (siehe
  // Nummerierungslogik weiter oben).
  buildSectionChunks(section, sectionNumber, sectionBreaks, startPage) {
    const listClass = section.type === "mixed" ? "task-list task-list--mixed" : "task-list";
    const headingHtml = `
      <div class="section-heading-row">
        <h4 class="section-heading">${toRoman(sectionNumber)}. ${escapeHtml(section.heading)}</h4>
        <span class="section-heading-line" aria-hidden="true"></span>
      </div>`;
    let boundaries = sectionBreaks;
    let page = startPage;
    // Ein Umbruch bei taskIndex 0 verschiebt den ganzen Abschnitt auf eine
    // neue Seite, ohne dass davor etwas von ihm steht — dafür nur die
    // Startseite übernehmen, statt einen leeren Chunk mit der Überschrift auf
    // der alten Seite zu erzeugen.
    if (boundaries.length && boundaries[0].taskIndex === 0) {
      page = boundaries[0].page;
      boundaries = boundaries.slice(1);
    }
    const chunks = [];
    let start = 0;
    let first = true;
    const pushChunk = (end, chunkPage) => {
      const items = section.tasks.slice(start, end).map((task) => this.buildItemHtml(section.type, task)).join("");
      const ol = `<ol class="${listClass}" start="${start + 1}">${items}</ol>`;
      // Fortsetzungen tragen --continued: ohne das brächte jede Fortsetzung im
      // Druck den margin-top eines neuen Abschnitts mit (22px), den es vor der
      // Aufteilung in Seiten-Chunks nicht gab — die geschätzte Aufteilung würde
      // dann den echten Druck verschieben und sich selbst widerlegen.
      const classes = first ? "worksheet-section" : "worksheet-section worksheet-section--continued";
      chunks.push({ page: chunkPage, html: `<div class="${classes}" data-section-key="${section.key}">${first ? headingHtml : ""}${ol}</div>` });
      first = false;
      start = end;
    };
    boundaries.forEach(({ taskIndex, page: nextPage }) => {
      pushChunk(taskIndex, page);
      page = nextPage;
    });
    pushChunk(section.tasks.length, page);
    return chunks;
  }

  // Ein Stück einer Lösungsgruppe: das Label trägt nur das erste Stück, das
  // start-Attribut setzt die Nummerierung über einen Seitenumbruch hinweg fort.
  // Die Abstandsklassen stehen explizit im Markup statt über :first-of-type,
  // damit der Abstand nicht davon abhängt, wie die Vorschau die Gruppen auf
  // Seiten verteilt — sonst verschöbe die Aufteilung den echten Druck.
  buildSolutionsFragmentHtml(section, sectionNumber, answers, start, end, { first, groupStart }) {
    const items = answers.slice(start, end).join("");
    const label = groupStart
      ? `<p class="solutions-group-label">${toRoman(sectionNumber)}. ${escapeHtml(section.heading)}</p>`
      : "";
    const modifier = first ? " solutions-group--first" : (groupStart ? "" : " solutions-group--continued");
    return `
      <div class="solutions-group${modifier}">
        ${label}
        <ol class="solutions-list" start="${start + 1}">${items}</ol>
      </div>`;
  }

  // Der Lösungsteil wird wie die Aufgabenabschnitte auf Seiten verteilt: bei
  // einem großen Blatt ist er über eine Seite hoch. Umbrochen wird nur zwischen
  // zwei Gruppen (siehe paginateWorksheet). Die Fortsetzung auf einer Folgeseite
  // trägt kein "Lösungen"-Label und keine Trennlinie mehr — sie beginnt ohnehin
  // ganz oben auf einem frischen Blatt.
  buildSolutionsChunks(worksheet, solutionBreaks, bannerPage) {
    if (!worksheet.sections.length) return [];
    // Der "Lösungen"-Balken ist ein eigenes Stück: er kann am Fuß der
    // vorigen Seite stehen bleiben, während die Gruppen erst auf der nächsten
    // beginnen — genau das macht der Druck (siehe paginateWorksheet).
    const parts = [{ page: bannerPage, banner: true, html: '<p class="worksheet-label">Lösungen</p>' }];
    let page = bannerPage;
    let isFirstFragmentOfKey = true;
    worksheet.sections.forEach((section, groupIndex) => {
      const answers = section.tasks.map((task) => `<li>${this.buildAnswerHtml(section.type, task)}</li>`);
      const rowBreaks = solutionBreaks.filter((entry) => entry.groupIndex === groupIndex);
      let start = 0;
      let groupStart = true;
      const pushFragment = (end, fragmentPage) => {
        if (end <= start) return;
        parts.push({
          page: fragmentPage,
          html: this.buildSolutionsFragmentHtml(section, groupIndex + 1, answers, start, end, {
            first: isFirstFragmentOfKey,
            groupStart
          })
        });
        isFirstFragmentOfKey = false;
        groupStart = false;
        start = end;
      };
      rowBreaks.forEach(({ rowIndex, page: nextPageNo }) => {
        pushFragment(rowIndex * SOLUTIONS_COLUMNS, page);
        page = nextPageNo;
      });
      pushFragment(answers.length, page);
    });

    // Aufeinanderfolgende Stücke derselben Seite teilen sich einen
    // .worksheet-solutions-Rahmen. Nur der Rahmen mit dem Balken trägt
    // Trennlinie und Abstand; die Fortsetzungen beginnen oben auf einem
    // frischen Blatt und brauchen beides nicht.
    const chunks = [];
    parts.forEach((part) => {
      const last = chunks[chunks.length - 1];
      if (last && last.page === part.page) {
        last.content += part.html;
      } else {
        chunks.push({ page: part.page, content: part.html, withBanner: Boolean(part.banner) });
      }
    });
    return chunks.map(({ page: chunkPage, content, withBanner }) => ({
      page: chunkPage,
      html: `
      <section class="worksheet-solutions${withBanner ? "" : " worksheet-solutions--continued"}">
        ${content}
      </section>`
    }));
  }

  // Baut den ganzen Aufgabenteil als Kette von {page, html}-Chunks in
  // Lesereihenfolge, statt eines einzigen Strings mit Umbruch-Markierungen
  // darin — jeder Chunk weiß, auf welche geschätzte Seite er gehört, damit
  // renderPreview ihn dem passenden .worksheet-paper zuordnen kann.
  buildTaskChunks(worksheet, pageBreaks) {
    const chunks = [];
    let sectionNumber = 0;
    let currentPage = 1;
    worksheet.sections.forEach((section, sectionIndex) => {
      sectionNumber += 1;
      const sectionBreaks = pageBreaks.filter((b) => b.sectionIndex === sectionIndex);
      const sectionChunks = this.buildSectionChunks(section, sectionNumber, sectionBreaks, currentPage);
      chunks.push(...sectionChunks);
      currentPage = sectionChunks[sectionChunks.length - 1].page;
    });
    return chunks;
  }

  renderPreview(worksheet) {
    const worksheetTitle = worksheet.title || "Arbeitsblatt Brüche";
    const { breaks, solutionBreaks, bannerPage } = paginateWorksheet(worksheetUnits(worksheet));
    const chunks = this.buildTaskChunks(worksheet, breaks);
    chunks.push(...this.buildSolutionsChunks(worksheet, solutionBreaks, bannerPage));

    // Chunks sind bereits nach aufsteigender Seite sortiert (paginateWorksheet
    // zählt nur vorwärts) — benachbarte Chunks mit derselben Seite landen
    // deshalb in genau einem Array-Eintrag, nie verstreut über mehrere.
    const pages = [];
    chunks.forEach((chunk) => {
      const last = pages[pages.length - 1];
      if (last && last.page === chunk.page) {
        last.html += chunk.html;
      } else {
        pages.push({ page: chunk.page, html: chunk.html });
      }
    });
    // Ist nichts ausgewählt, bleibt trotzdem ein leeres Blatt mit der
    // Titelzeile stehen statt einer leeren Vorschaufläche.
    if (!pages.length) pages.push({ page: 1, html: "" });

    const pagesHtml = pages.map(({ html }, index) => `
      <article class="worksheet-paper" lang="de">
        ${index === 0 ? `<h3 class="worksheet-title-line">${escapeHtml(worksheetTitle)}</h3>` : ""}
        ${html}
      </article>`).join("");

    this.previewTitle.textContent = worksheetTitle;
    this.previewCanvas.dataset.ready = "true";
    this.previewCanvas.innerHTML = `
      <div class="preview-stage">
        <div class="preview-scaler">
          <div class="worksheet-pages">${pagesHtml}</div>
        </div>
      </div>`;
    this.fitPreview();
    this.printButtons.forEach((button) => { button.hidden = false; });
  }

  // Jedes Blatt hat A4-Maße (siehe .worksheet-paper); .worksheet-pages ist der
  // ganze Stapel inklusive der Lücken dazwischen. Passt der Stapel nicht in
  // die Vorschauspalte, wird er als Ganzes verkleinert statt in der Breite
  // gestaucht — eine Stauchung würde einen anderen Zeilen- und Spaltenumbruch
  // zeigen als der Ausdruck. Vergrößert wird nie: 100% ist Originalgröße.
  fitPreview() {
    const stage = this.previewCanvas.querySelector(".preview-stage");
    const pages = this.previewCanvas.querySelector(".worksheet-pages");
    if (!stage || !pages) return;
    const canvasStyles = window.getComputedStyle(this.previewCanvas);
    const available = this.previewCanvas.clientWidth
      - parseFloat(canvasStyles.paddingLeft)
      - parseFloat(canvasStyles.paddingRight);
    // offsetWidth/offsetHeight ignorieren das transform und liefern damit die
    // ungeskalierte Größe — genau die Bezugsgröße für den Faktor.
    const pagesWidth = pages.offsetWidth;
    const pagesHeight = pages.offsetHeight;
    if (!pagesWidth || !pagesHeight || !(available > 0)) return;
    const scale = Math.min(1, available / pagesWidth);
    stage.style.setProperty("--preview-scale", scale);
    stage.style.width = `${Math.round(pagesWidth * scale)}px`;
    stage.style.height = `${Math.round(pagesHeight * scale)}px`;
  }

  // Der Maßstab hängt an der Breite der Vorschauspalte. Beobachtet wird nur
  // diese Breite: fitPreview() setzt selbst die Höhe der Bühne, eine Reaktion
  // auf Höhenänderungen würde sich im Kreis drehen.
  watchPreviewWidth() {
    let lastWidth = 0;
    const check = () => {
      const width = this.previewCanvas.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      this.fitPreview();
    };
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(check).observe(this.previewCanvas);
    } else {
      window.addEventListener("resize", check);
    }
  }
}

class WorksheetController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.view.bindSubmit(() => this.handleSubmit());
    this.view.bindPrint(() => window.print());
    this.view.bindTaskClick((sectionKey, taskIndex) => this.handleTaskClick(sectionKey, taskIndex));
    this.view.bindSettingsChange(() => this.updateHint());
    this.view.bindAddBlock(() => this.handleAddBlock());
    this.view.bindFillPages(() => this.handleFillPages());
    this.view.bindQuickPick(() => this.updateHint());
    this.view.bindRemoveBlock(() => this.updateHint());
    this.view.syncRangeOutputs();
    // Startbelegung: nur Kürzen und Erweitern sind an, kein Block. Startet
    // trotzdem bereits auf einer geraden Seitenzahl, statt die Lehrkraft dafür
    // manuell auf "Seiten füllen" klicken zu lassen — growToEvenPages skaliert
    // die beiden aktiven Typen dafür proportional hoch. Mit
    // allowNewBlocks: false legt es dabei keinen Block an; das bleibt dem
    // expliziten Klick auf "+ Block gemischte Aufgaben" vorbehalten.
    this.growToEvenPages({ allowNewBlocks: false });
    // Zeigt sofort ein fertiges Arbeitsblatt statt einer leeren Vorschau, auf
    // die die Lehrkraft erst per Klick auf "Arbeitsblatt erstellen" käme.
    this.handleSubmit();
  }

  updateHint() {
    const settings = this.view.readSettings();
    this.view.renderFillHint(this.model.estimateLayout(settings));
    this.view.renderBlockExamples(this.model.createBlockExamples(settings));
  }

  handleAddBlock() {
    this.view.addBlock(DEFAULT_BLOCK_COUNT);
    this.updateHint();
  }

  handleFillPages() {
    this.growToEvenPages({ allowNewBlocks: true });
    this.handleSubmit();
  }

  // Bringt das Blatt auf eine gerade Seitenzahl: zuerst die gewählten
  // Aufgabentypen proportional, dann die Blöcke in den verbleibenden Platz.
  // Mit allowNewBlocks: false wachsen nur bereits vorhandene Blöcke — es wird
  // kein neuer, unkonfigurierter Block angelegt.
  growToEvenPages({ allowNewBlocks }) {
    const start = this.view.readSettings();
    if (Object.values(start.sectionCounts).some((count) => count > 0)) {
      this.view.setSectionCounts(this.model.fillCounts(start));
    }

    const pages = this.model.estimateLayout(this.view.readSettings()).pages;
    const targetPages = Math.max(2, pages + (pages % 2));
    const fits = (blocks, current) => this.model.estimateLayout({ ...current, blocks }).pages <= targetPages;

    for (let guard = 0; guard < 80; guard++) {
      const current = this.view.readSettings();
      const index = current.blocks.findIndex((block, i) => {
        const next = nextBlockOption(block.count);
        // Blöcke ohne Rechenart zählen nicht zur Last — sie würden sonst
        // endlos wachsen, ohne je die Zielgröße zu erreichen.
        if (next === undefined || block.operations.length === 0) return false;
        return fits(current.blocks.map((other, j) => (j === i ? { ...other, count: next } : other)), current);
      });
      if (index !== -1) {
        this.view.setBlockCount(index, nextBlockOption(current.blocks[index].count));
        continue;
      }
      if (!allowNewBlocks) break;
      // Alle Blöcke am Maximum: ein weiterer Block schafft Platz. Er übernimmt
      // die Rechenarten des letzten konfigurierten Blocks, damit die Auswahl
      // der Lehrkraft nicht stillschweigend durch einen leeren Block ersetzt wird.
      const source = [...current.blocks].reverse().find((block) => block.operations.length > 0);
      const smallest = BLOCK_COUNT_OPTIONS[0];
      if (!source || !fits([...current.blocks, { ...source, count: smallest }], current)) break;
      this.view.addBlock(smallest, source.operations);
    }
  }

  handleTaskClick(sectionKey, taskIndex) {
    const worksheet = this.model.regenerateTask(sectionKey, taskIndex);
    if (worksheet) this.view.renderPreview(worksheet);
  }

  handleSubmit() {
    this.model.update(this.view.readSettings());
    this.view.renderPreview(this.model.createWorksheet());
    this.updateHint();
  }
}

class WorksheetApp {
  constructor(root) {
    this.model = new WorksheetModel();
    this.view = new WorksheetView(root);
    this.controller = new WorksheetController(this.model, this.view);
  }

  static start() {
    const root = document;
    new WorksheetApp(root);
  }
}

document.addEventListener("DOMContentLoaded", () => WorksheetApp.start());
