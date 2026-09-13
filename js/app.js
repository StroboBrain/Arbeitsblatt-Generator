const KUERZEN_COUNT = 32;
const ERWEITERN_COUNT = 12;
const OPERATION_SECTION_COUNT = 8;

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI"];

const LEVEL_KUERZEN_RANGE = {
  basic: { baseStart: 6, baseEnd: 14, factorStart: 2, factorEnd: 4 },
  intermediate: { baseStart: 8, baseEnd: 24, factorStart: 3, factorEnd: 9 },
  advanced: { baseStart: 10, baseEnd: 32, factorStart: 4, factorEnd: 12 }
};

const LEVEL_ERWEITERN_RANGE = {
  basic: { baseStart: 4, baseEnd: 10, factorStart: 2, factorEnd: 4 },
  intermediate: { baseStart: 6, baseEnd: 16, factorStart: 2, factorEnd: 8 },
  advanced: { baseStart: 8, baseEnd: 20, factorStart: 3, factorEnd: 10 }
};

const LEVEL_OPERATION_RANGE = {
  basic: { addSubStart: 3, addSubEnd: 9, mulDivStart: 2, mulDivEnd: 6 },
  intermediate: { addSubStart: 4, addSubEnd: 14, mulDivStart: 3, mulDivEnd: 10 },
  advanced: { addSubStart: 6, addSubEnd: 20, mulDivStart: 4, mulDivEnd: 14 }
};

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
  return Math.floor(random() * (max - min + 1)) + min;
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

function randomFraction(random, maxDenominator) {
  const denominator = randomInt(random, 2, maxDenominator);
  const numerator = randomInt(random, 1, denominator - 1);
  return { numerator, denominator };
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

function createKuerzenTask(random, index, count, level) {
  const r = LEVEL_KUERZEN_RANGE[level] || LEVEL_KUERZEN_RANGE.basic;
  const baseMax = rampValue(index, count, r.baseStart, r.baseEnd);
  const factorMax = rampValue(index, count, r.factorStart, r.factorEnd);
  let a;
  let b;
  do {
    a = randomInt(random, 2, baseMax);
    b = randomInt(random, 2, baseMax);
  } while (a === b);
  const scale = randomInt(random, 2, factorMax);
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

function createErweiternTask(random, index, count, level) {
  const r = LEVEL_ERWEITERN_RANGE[level] || LEVEL_ERWEITERN_RANGE.basic;
  const baseMax = rampValue(index, count, r.baseStart, r.baseEnd);
  const factorMax = rampValue(index, count, r.factorStart, r.factorEnd);
  let a;
  let b;
  do {
    a = randomInt(random, 1, baseMax - 1);
    b = randomInt(random, 2, baseMax);
  } while (a >= b || gcd(a, b) !== 1);
  const scale = randomInt(random, 2, factorMax);
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

function createAdditionFractionTask(random, index, count, level) {
  const r = LEVEL_OPERATION_RANGE[level] || LEVEL_OPERATION_RANGE.basic;
  const maxDen = rampValue(index, count, r.addSubStart, r.addSubEnd);
  const a = randomFraction(random, maxDen);
  const b = randomFraction(random, maxDen);
  const numerator = a.numerator * b.denominator + b.numerator * a.denominator;
  const denominator = a.denominator * b.denominator;
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

function createSubtractionFractionTask(random, index, count, level) {
  const r = LEVEL_OPERATION_RANGE[level] || LEVEL_OPERATION_RANGE.basic;
  const maxDen = rampValue(index, count, r.addSubStart, r.addSubEnd);
  let a;
  let b;
  let numerator;
  const denominator = () => a.denominator * b.denominator;
  do {
    a = randomFraction(random, maxDen);
    b = randomFraction(random, maxDen);
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

function createMultiplicationFractionTask(random, index, count, level) {
  const r = LEVEL_OPERATION_RANGE[level] || LEVEL_OPERATION_RANGE.basic;
  const maxDen = rampValue(index, count, r.mulDivStart, r.mulDivEnd);
  const a = randomFraction(random, maxDen);
  const b = randomFraction(random, maxDen);
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

function createDivisionFractionTask(random, index, count, level) {
  const r = LEVEL_OPERATION_RANGE[level] || LEVEL_OPERATION_RANGE.basic;
  const maxDen = rampValue(index, count, r.mulDivStart, r.mulDivEnd);
  const a = randomFraction(random, maxDen);
  const b = randomFraction(random, maxDen);
  const numerator = a.numerator * b.denominator;
  const denominator = a.denominator * b.numerator;
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

function taskSignature(type, task) {
  if (type === "erweitern") {
    return `${task.numerator}/${task.denominator}->${task.targetNumerator ?? "_"}/${task.targetDenominator ?? "_"}`;
  }
  if (type === "operation") {
    return `${task.aNum}/${task.aDen}${task.operatorSymbol}${task.bNum}/${task.bDen}`;
  }
  return `${task.numerator}/${task.denominator}`;
}

function createUniqueTasks(definition, count, random, level) {
  const seen = new Set();
  return Array.from({ length: count }, (_, index) => {
    let task;
    let attempts = 0;
    do {
      task = definition.createTask(random, index, count, level);
      attempts++;
    } while (seen.has(taskSignature(definition.type, task)) && attempts < 30);
    seen.add(taskSignature(definition.type, task));
    return task;
  });
}

const TARGET_TOTAL_QUESTIONS = 76;

// Redistributes the fixed "fills two pages" question budget across only the
// selected sections, weighted by each section's normal (all-selected) count,
// so a smaller selection still fills the two pages instead of sitting sparse.
function computeScaledCounts(activeDefinitions) {
  const totalWeight = activeDefinitions.reduce((sum, definition) => sum + definition.count, 0);
  return activeDefinitions.map((definition) => {
    const raw = (definition.count / totalWeight) * TARGET_TOTAL_QUESTIONS;
    return Math.max(4, Math.round(raw / 4) * 4);
  });
}

const SECTION_DEFINITIONS = [
  { key: "kuerzen", heading: "Brüche kürzen", count: KUERZEN_COUNT, createTask: createKuerzenTask, type: "kuerzen" },
  { key: "erweitern", heading: "Brüche erweitern", count: ERWEITERN_COUNT, createTask: createErweiternTask, type: "erweitern" },
  { key: "addition", heading: "Addition", count: OPERATION_SECTION_COUNT, createTask: createAdditionFractionTask, type: "operation" },
  { key: "subtraktion", heading: "Subtraktion", count: OPERATION_SECTION_COUNT, createTask: createSubtractionFractionTask, type: "operation" },
  { key: "multiplikation", heading: "Multiplikation", count: OPERATION_SECTION_COUNT, createTask: createMultiplicationFractionTask, type: "operation" },
  { key: "division", heading: "Division", count: OPERATION_SECTION_COUNT, createTask: createDivisionFractionTask, type: "operation" }
];

const ALL_SECTION_KEYS = SECTION_DEFINITIONS.map((definition) => definition.key);

class WorksheetModel {
  constructor() {
    this.state = {
      title: "Arbeitsblatt Brüche",
      level: "basic",
      sections: ALL_SECTION_KEYS.slice()
    };
  }

  update(patch) {
    this.state = { ...this.state, ...patch };
  }

  getState() {
    return { ...this.state };
  }

  createWorksheet() {
    const seed = Math.floor(Math.random() * 0xffffffff);
    const random = createRandom(seed);
    const activeKeys = this.state.sections.length > 0 ? this.state.sections : ALL_SECTION_KEYS;
    const activeDefinitions = SECTION_DEFINITIONS.filter((definition) => activeKeys.includes(definition.key));
    const scaledCounts = computeScaledCounts(activeDefinitions);

    const sections = activeDefinitions.map((definition, i) => {
      const tasks = createUniqueTasks(definition, scaledCounts[i], random, this.state.level);
      return { key: definition.key, heading: definition.heading, type: definition.type, tasks };
    });

    this.lastWorksheet = { ...this.getState(), seed, sections };
    return this.lastWorksheet;
  }

  regenerateTask(sectionKey, taskIndex) {
    if (!this.lastWorksheet) return this.lastWorksheet;
    const definition = SECTION_DEFINITIONS.find((d) => d.key === sectionKey);
    const section = this.lastWorksheet.sections.find((s) => s.key === sectionKey);
    if (!definition || !section || !section.tasks[taskIndex]) return this.lastWorksheet;

    const random = createRandom(Math.floor(Math.random() * 0xffffffff));
    const seen = new Set(
      section.tasks.filter((_, i) => i !== taskIndex).map((task) => taskSignature(definition.type, task))
    );
    let task;
    let attempts = 0;
    do {
      task = definition.createTask(random, taskIndex, section.tasks.length, this.state.level);
      attempts++;
    } while (seen.has(taskSignature(definition.type, task)) && attempts < 30);
    section.tasks[taskIndex] = task;

    return this.lastWorksheet;
  }
}

class WorksheetView {
  constructor(root) {
    this.root = root;
    this.form = root.querySelector("#worksheet-form");
    this.previewTitle = root.querySelector("#preview-title");
    this.previewCanvas = root.querySelector("#preview-canvas");
    this.printButton = root.querySelector("#print-worksheet");
    this.printHint = root.querySelector("#print-hint");
  }

  bindSubmit(handler) {
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      handler(new FormData(this.form));
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
    } else if (type === "operation") {
      row = `${this.fractionHtml(task.aNum, task.aDen)} <span class="operator">${task.operatorSymbol}</span> ${this.fractionHtml(task.bNum, task.bDen)} <span class="equals">=</span> ${this.fractionHtml(null, null)}`;
    } else {
      row = `${this.fractionHtml(task.numerator, task.denominator)} <span class="equals">=</span> ${this.fractionHtml(null, null)}`;
    }
    return `<li><button type="button" class="task-row">${row}<span class="visually-hidden"> — anklicken zum Neuwürfeln</span></button></li>`;
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
    const numeral = ROMAN_NUMERALS[sectionNumber - 1] || String(sectionNumber);
    return `
      <div class="worksheet-section" data-section-key="${section.key}">
        <h4 class="section-heading">${numeral}. ${escapeHtml(section.heading)}</h4>
        <ol class="task-list" start="1">${items}</ol>
      </div>`;
  }

  buildSolutionsGroupHtml(section, sectionNumber) {
    const numeral = ROMAN_NUMERALS[sectionNumber - 1] || String(sectionNumber);
    const items = section.tasks.map((task) => `<li>${this.buildAnswerHtml(section.type, task)}</li>`).join("");
    return `
      <div class="solutions-group">
        <p class="solutions-group-label">${numeral}. ${escapeHtml(section.heading)}</p>
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
    this.view.bindSubmit((formData) => this.handleSubmit(formData));
    this.view.bindPrint(() => window.print());
    this.view.bindTaskClick((sectionKey, taskIndex) => this.handleTaskClick(sectionKey, taskIndex));
  }

  handleTaskClick(sectionKey, taskIndex) {
    const worksheet = this.model.regenerateTask(sectionKey, taskIndex);
    if (worksheet) this.view.renderPreview(worksheet);
  }

  handleSubmit(formData) {
    const selectedSections = formData.getAll("sections").map(String);
    this.model.update({
      title: String(formData.get("title") || ""),
      level: String(formData.get("level") || "basic"),
      sections: selectedSections.length > 0 ? selectedSections : ALL_SECTION_KEYS
    });
    this.view.renderPreview(this.model.createWorksheet());
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
