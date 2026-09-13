const KUERZEN_COUNT = 32;
const ERWEITERN_COUNT = 12;
const OPERATION_SECTION_COUNT = 8;

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI"];

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

function createKuerzenTask(random, index, count) {
  const baseMax = rampValue(index, count, 8, 24);
  const factorMax = rampValue(index, count, 3, 9);
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

function createErweiternTask(random, index, count) {
  const baseMax = rampValue(index, count, 6, 16);
  const factorMax = rampValue(index, count, 2, 8);
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

// -- Back page: fraction arithmetic sections ------------------------------

function createAdditionFractionTask(random, index, count) {
  const maxDen = rampValue(index, count, 4, 14);
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

function createSubtractionFractionTask(random, index, count) {
  const maxDen = rampValue(index, count, 4, 14);
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

function createMultiplicationFractionTask(random, index, count) {
  const maxDen = rampValue(index, count, 3, 10);
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

function createDivisionFractionTask(random, index, count) {
  const maxDen = rampValue(index, count, 3, 10);
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

const SECTION_DEFINITIONS = [
  { heading: "Brüche kürzen", count: KUERZEN_COUNT, createTask: createKuerzenTask, type: "kuerzen", page: 1, columns: 4 },
  { heading: "Brüche erweitern", count: ERWEITERN_COUNT, createTask: createErweiternTask, type: "erweitern", page: 1, columns: 4 },
  { heading: "Addition", count: OPERATION_SECTION_COUNT, createTask: createAdditionFractionTask, type: "operation", page: 2, columns: 4 },
  { heading: "Subtraktion", count: OPERATION_SECTION_COUNT, createTask: createSubtractionFractionTask, type: "operation", page: 2, columns: 4 },
  { heading: "Multiplikation", count: OPERATION_SECTION_COUNT, createTask: createMultiplicationFractionTask, type: "operation", page: 2, columns: 4 },
  { heading: "Division", count: OPERATION_SECTION_COUNT, createTask: createDivisionFractionTask, type: "operation", page: 2, columns: 4 }
];

class WorksheetModel {
  constructor() {
    this.state = {
      title: "Arbeitsblatt Brüche"
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
    const sections = SECTION_DEFINITIONS.map((definition) => ({
      heading: definition.heading,
      type: definition.type,
      page: definition.page,
      columns: definition.columns,
      tasks: Array.from({ length: definition.count }, (_, index) => definition.createTask(random, index, definition.count))
    }));
    return { ...this.getState(), seed, sections };
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
    if (type === "erweitern") {
      return `<li>${this.fractionHtml(task.numerator, task.denominator)} <span class="equals" aria-hidden="true">=</span> ${this.fractionHtml(task.targetNumerator, task.targetDenominator)}</li>`;
    }
    if (type === "operation") {
      return `<li>${this.fractionHtml(task.aNum, task.aDen)} <span class="operator" aria-hidden="true">${task.operatorSymbol}</span> ${this.fractionHtml(task.bNum, task.bDen)} <span class="equals" aria-hidden="true">=</span> ${this.fractionHtml(null, null)}</li>`;
    }
    return `<li>${this.fractionHtml(task.numerator, task.denominator)} <span class="equals" aria-hidden="true">=</span> ${this.fractionHtml(null, null)}</li>`;
  }

  buildAnswerHtml(type, task) {
    if (type === "erweitern") return String(task.answerValue);
    return this.fractionHtml(task.answerNumerator, task.answerDenominator);
  }

  buildSectionHtml(section, sectionNumber) {
    const items = section.tasks.map((task) => this.buildItemHtml(section.type, task)).join("");
    const numeral = ROMAN_NUMERALS[sectionNumber - 1] || String(sectionNumber);
    return `
      <div class="worksheet-section">
        <h4 class="section-heading">${numeral}. ${escapeHtml(section.heading)}</h4>
        <ol class="task-list task-list--${section.columns}col">${items}</ol>
      </div>`;
  }

  buildSolutionsHtml(worksheet) {
    const items = worksheet.sections
      .flatMap((section) => section.tasks.map((task) => `<li>${this.buildAnswerHtml(section.type, task)}</li>`))
      .join("");
    return `
      <section class="worksheet-solutions">
        <p class="worksheet-label">Lösungen</p>
        <ol class="solutions-list">${items}</ol>
      </section>`;
  }

  renderPreview(worksheet) {
    const worksheetTitle = worksheet.title || "Arbeitsblatt Brüche";
    const frontSections = worksheet.sections.filter((section) => section.page === 1);
    const backSections = worksheet.sections.filter((section) => section.page === 2);
    let sectionNumber = 0;
    const frontHtml = frontSections.map((section) => this.buildSectionHtml(section, ++sectionNumber)).join("");
    const backHtml = backSections.map((section) => this.buildSectionHtml(section, ++sectionNumber)).join("");

    this.previewTitle.textContent = worksheetTitle;
    this.previewCanvas.dataset.ready = "true";
    this.previewCanvas.innerHTML = `
      <article class="worksheet-paper" lang="de">
        <section class="worksheet-page">
          <h3 class="worksheet-title-line">${escapeHtml(worksheetTitle)}</h3>
          ${frontHtml}
        </section>
        <section class="worksheet-page">
          <p class="worksheet-page-label">Seite 2 · ${escapeHtml(worksheetTitle)}</p>
          ${backHtml}
        </section>
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
  }

  handleSubmit(formData) {
    this.model.update({
      title: String(formData.get("title") || "")
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
