export function fractionHtml(numerator, denominator) {
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
export function buildTaskRowHtml(type, task) {
  let row;
  if (type === "erweitern") {
    row = `${fractionHtml(task.numerator, task.denominator)} <span class="equals">=</span> ${fractionHtml(task.targetNumerator, task.targetDenominator)}`;
  } else if (type === "mixed") {
    row = `${fractionHtml(task.aNum, task.aDen)} <span class="operator">${task.firstSymbol}</span> ${fractionHtml(task.bNum, task.bDen)} <span class="operator">${task.secondSymbol}</span> ${fractionHtml(task.cNum, task.cDen)} <span class="equals">=</span> ${fractionHtml(null, null)}`;
  } else if (type === "operation") {
    row = `${fractionHtml(task.aNum, task.aDen)} <span class="operator">${task.operatorSymbol}</span> ${fractionHtml(task.bNum, task.bDen)} <span class="equals">=</span> ${fractionHtml(null, null)}`;
  } else {
    row = `${fractionHtml(task.numerator, task.denominator)} <span class="equals">=</span> ${fractionHtml(null, null)}`;
  }
  return row;
}

export function buildItemHtml(type, task) {
  const row = buildTaskRowHtml(type, task);
  return `<li><button type="button" class="task-row">${row}<span class="task-hint" aria-hidden="true">Zum Ändern anklicken</span><span class="visually-hidden"> — anklicken zum Neuwürfeln</span></button></li>`;
}

export function buildAnswerHtml(type, task) {
  if (type === "erweitern") {
    const numerator = task.targetNumerator !== null ? task.targetNumerator : task.answerValue;
    const denominator = task.targetDenominator !== null ? task.targetDenominator : task.answerValue;
    return fractionHtml(numerator, denominator);
  }
  return fractionHtml(task.answerNumerator, task.answerDenominator);
}

