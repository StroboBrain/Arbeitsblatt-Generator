const KUERZEN_COUNT = 32;
const ERWEITERN_COUNT = 12;
const OPERATION_SECTION_COUNT = 8;

const TASK_GRID_COLUMNS = 4;
const MIXED_GRID_COLUMNS = 3;
// Gemischte Aufgaben stehen zu dritt statt zu viert in einer Zeile. Der Wert
// ist gemessen, nicht aus dem Spaltenverhältnis (4/3) abgeleitet.
const MIXED_LOAD_FACTOR = 1.3;

// Empirisch angepasst an 58 gemessene Kombinationen (page.pdf()): die erste
// Seite fasst wegen der Titelzeile rund 55 Aufgaben, jede weitere 59; eine
// Abschnittsüberschrift kostet etwa 4 Aufgaben Platz. Das Modell ist bewusst
// leicht pessimistisch — es schätzt nie zu wenige Seiten.
const FIRST_PAGE_LOAD = 55;
const PAGE_LOAD_CAPACITY = 59;
const SECTION_LOAD = 4;

const PROPER_FRACTION_SHARE = 0.8;
const DEFAULT_MAX_NUMERATOR = 12;
const DEFAULT_MAX_DENOMINATOR = 16;
const DEFAULT_BLOCK_COUNT = 12;
const BLOCK_COUNT_OPTIONS = [6, 9, 12, 15, 18, 24, 30];

// Aufgabenzahl je Typ: Schnellwahl für die üblichen Größen, Auswahlliste für
// alles dazwischen. Alle Werte sind Vielfache der Spaltenzahl, damit die
// letzte Zeile eines Abschnitts immer voll ist.
const TYPE_COUNT_OPTIONS = Array.from({ length: 17 }, (_, index) => index * TASK_GRID_COLUMNS);
const TYPE_QUICK_PICKS = [0, 8, 16, 32];
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
    operatorSymbol: "·",
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

const HIGH_PRECEDENCE = new Set(["·", ":"]);

function applyOperation(symbol, a, b) {
  if (symbol === "+") return { n: a.n * b.d + b.n * a.d, d: a.d * b.d };
  if (symbol === "−") return { n: a.n * b.d - b.n * a.d, d: a.d * b.d };
  if (symbol === "·") return { n: a.n * b.n, d: a.d * b.d };
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
  { value: "multiplikation", label: "Multiplikation", symbol: "·", createTask: createMultiplicationFractionTask },
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

function sectionsLoad(standardTotal, mixedTotal, sectionCount) {
  return standardTotal + mixedTotal * MIXED_LOAD_FACTOR + sectionCount * SECTION_LOAD;
}

const SECTION_DEFINITIONS = [
  { key: "kuerzen", heading: "Brüche kürzen", count: KUERZEN_COUNT, createTask: createKuerzenTask, type: "kuerzen" },
  { key: "erweitern", heading: "Brüche erweitern", count: ERWEITERN_COUNT, createTask: createErweiternTask, type: "erweitern" },
  { key: "addition", heading: "Addition", count: OPERATION_SECTION_COUNT, createTask: createAdditionFractionTask, type: "operation" },
  { key: "subtraktion", heading: "Subtraktion", count: OPERATION_SECTION_COUNT, createTask: createSubtractionFractionTask, type: "operation" },
  { key: "multiplikation", heading: "Multiplikation", count: OPERATION_SECTION_COUNT, createTask: createMultiplicationFractionTask, type: "operation" },
  { key: "division", heading: "Division", count: OPERATION_SECTION_COUNT, createTask: createDivisionFractionTask, type: "operation" }
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
      properOnly: false,
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
    const load = standardTotal + blockTotal * MIXED_LOAD_FACTOR + sectionCount * SECTION_LOAD;
    const pages = estimatePages(load);
    const canGrow = plan.baseSections.some((entry) => entry.count < MAX_TYPE_COUNT)
      || plan.blocks.some((block) => nextBlockOption(block.count) !== undefined);
    return {
      total: standardTotal + blockTotal,
      pages,
      load,
      missing: Math.floor(Math.max(0, loadCapacity(pages) - load) / TASK_GRID_COLUMNS) * TASK_GRID_COLUMNS,
      canGrow,
      incompleteBlocks: (settings.blocks || []).filter((block) => block.operations.length === 0).length,
      empty: sectionCount === 0
    };
  }

  // Zielgröße für "Seiten füllen": auf die nächste gerade Seitenzahl aufrunden,
  // damit beim beidseitigen Druck keine halb genutzte Seite übrig bleibt. Nach
  // oben ist die Seitenzahl nicht begrenzt.
  fillTargetLoad(settings) {
    const { pages } = this.estimateLayout(settings);
    return loadCapacity(Math.max(2, pages + (pages % 2)));
  }

  // Skaliert die gewählten Aufgabenzahlen proportional auf die Zielgröße —
  // nach oben wie nach unten, damit das von der Lehrkraft eingestellte
  // Verhältnis erhalten bleibt. Ein gewählter Typ fällt dabei nie ganz weg.
  scaleSectionCounts(settings, targetLoad) {
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
      // Die Last wächst monoton mit dem Faktor: die erste Überschreitung endet die Suche.
      if (this.estimateLayout({ ...settings, sectionCounts: scaled }).load > targetLoad) break;
      best = scaled;
    }
    return best || smallest;
  }

  // Bringt die Aufgabenzahlen auf eine gerade Seitenzahl. Zuerst wird nach oben
  // aufgefüllt; wenn das die nächste gerade Seitenzahl nicht erreicht (etwa
  // weil alle Typen am Maximum stehen), wird stattdessen auf die nächstkleinere
  // gerade Seitenzahl verkleinert — sonst bliebe das Blatt dauerhaft ungerade.
  fillCounts(settings) {
    const grown = this.scaleSectionCounts(settings, this.fillTargetLoad(settings));
    const grownPages = this.estimateLayout({ ...settings, sectionCounts: grown }).pages;
    if (grownPages % 2 === 0) return grown;
    return this.scaleSectionCounts(settings, loadCapacity(Math.max(2, grownPages - 1)));
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

function estimatePages(load) {
  if (load <= FIRST_PAGE_LOAD) return 1;
  return 1 + Math.ceil((load - FIRST_PAGE_LOAD) / PAGE_LOAD_CAPACITY);
}

function loadCapacity(pages) {
  return FIRST_PAGE_LOAD + (pages - 1) * PAGE_LOAD_CAPACITY;
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
    this.fillHint = root.querySelector("#fill-hint");
    this.previewTitle = root.querySelector("#preview-title");
    this.previewCanvas = root.querySelector("#preview-canvas");
    this.printButton = root.querySelector("#print-worksheet");
    this.printHint = root.querySelector("#print-hint");
    this.typeList = root.querySelector("#type-list");
    this.submitButton = root.querySelector("#create-worksheet");
    this.blockCounter = 0;
    this.renderTypeRows();
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
  }

  syncBlockWarnings() {
    this.blockList.querySelectorAll(".block-card").forEach((card) => {
      const chosen = card.querySelectorAll(".block-op:checked").length > 0;
      card.dataset.incomplete = String(!chosen);
      card.querySelector(".block-warning").hidden = chosen;
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
      this.syncBlockWarnings();
      handler();
    };
    this.form.addEventListener("input", sync);
    this.form.addEventListener("change", sync);
  }

  bindQuickPick(handler) {
    this.typeList.addEventListener("click", (event) => {
      const button = event.target.closest(".quick-pick");
      if (!button) return;
      this.typeList.querySelector(`#count-${button.dataset.key}`).value = button.dataset.count;
      this.syncQuickPicks();
      handler();
    });
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
    this.printButton.addEventListener("click", handler);
  }

  bindTaskClick(handler) {
    this.previewCanvas.addEventListener("click", (event) => {
      const button = event.target.closest(".task-row");
      if (!button) return;
      const li = button.closest("li");
      const ol = li.closest(".task-list");
      const sectionEl = ol.closest(".worksheet-section");
      const sectionKey = sectionEl.dataset.sectionKey;
      const taskIndex = Array.from(ol.children).indexOf(li);
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
      <div class="block-count-row">
        <label for="block-${blockId}-count">Aufgaben</label>
        <select class="block-count" id="block-${blockId}-count">${countOptions}</select>
      </div>`;

    this.blockList.appendChild(card);
    this.refreshBlockLabels();
    this.syncBlockWarnings();
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
    // Bei ungerader Seitenzahl bleibt der Knopf aktiv, auch wenn nichts mehr
    // wachsen kann: dann wird auf die nächstkleinere gerade Seitenzahl gekürzt.
    this.fillButton.disabled = layout.empty
      || !(odd || (layout.canGrow && layout.missing >= TASK_GRID_COLUMNS));
    this.submitButton.disabled = layout.empty;
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

  buildItemHtml(type, task) {
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

  buildSectionHtml(section, sectionNumber) {
    const items = section.tasks.map((task) => this.buildItemHtml(section.type, task)).join("");
    const listClass = section.type === "mixed" ? "task-list task-list--mixed" : "task-list";
    return `
      <div class="worksheet-section" data-section-key="${section.key}">
        <h4 class="section-heading">${toRoman(sectionNumber)}. ${escapeHtml(section.heading)}</h4>
        <ol class="${listClass}" start="1">${items}</ol>
      </div>`;
  }

  buildSolutionsGroupHtml(section, sectionNumber) {
    const items = section.tasks.map((task) => `<li>${this.buildAnswerHtml(section.type, task)}</li>`).join("");
    return `
      <div class="solutions-group">
        <p class="solutions-group-label">${toRoman(sectionNumber)}. ${escapeHtml(section.heading)}</p>
        <ol class="solutions-list" start="1">${items}</ol>
      </div>`;
  }

  buildSolutionsHtml(worksheet) {
    let sectionNumber = 0;
    const groups = worksheet.sections.map((section) => this.buildSolutionsGroupHtml(section, ++sectionNumber)).join("");
    return `
      <section class="worksheet-solutions">
        <p class="worksheet-label">Lösungen</p>
        ${groups}
      </section>`;
  }

  renderPreview(worksheet) {
    const worksheetTitle = worksheet.title || "Arbeitsblatt Brüche";
    let sectionNumber = 0;
    const sectionsHtml = worksheet.sections.map((section) => this.buildSectionHtml(section, ++sectionNumber)).join("");

    this.previewTitle.textContent = worksheetTitle;
    this.previewCanvas.dataset.ready = "true";
    this.previewCanvas.innerHTML = `
      <article class="worksheet-paper" lang="de">
        <h3 class="worksheet-title-line">${escapeHtml(worksheetTitle)}</h3>
        ${sectionsHtml}
        ${this.buildSolutionsHtml(worksheet)}
      </article>`;
    this.printButton.hidden = false;
    this.printHint.hidden = false;
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
    this.updateHint();
  }

  updateHint() {
    this.view.renderFillHint(this.model.estimateLayout(this.view.readSettings()));
  }

  handleAddBlock() {
    this.view.addBlock(DEFAULT_BLOCK_COUNT);
    this.updateHint();
  }

  // Bringt das Blatt auf eine gerade Seitenzahl: zuerst die gewählten
  // Aufgabentypen proportional, dann die Blöcke in den verbleibenden Platz.
  handleFillPages() {
    const start = this.view.readSettings();
    if (Object.values(start.sectionCounts).some((count) => count > 0)) {
      this.view.setSectionCounts(this.model.fillCounts(start));
    }

    const pages = this.model.estimateLayout(this.view.readSettings()).pages;
    const targetLoad = loadCapacity(Math.max(2, pages + (pages % 2)));
    const fits = (blocks, current) => this.model.estimateLayout({ ...current, blocks }).load <= targetLoad;

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
      // Alle Blöcke am Maximum: ein weiterer Block schafft Platz. Er übernimmt
      // die Rechenarten des letzten konfigurierten Blocks, damit die Auswahl
      // der Lehrkraft nicht stillschweigend durch einen leeren Block ersetzt wird.
      const source = [...current.blocks].reverse().find((block) => block.operations.length > 0);
      const smallest = BLOCK_COUNT_OPTIONS[0];
      if (!source || !fits([...current.blocks, { ...source, count: smallest }], current)) break;
      this.view.addBlock(smallest, source.operations);
    }
    this.handleSubmit();
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
