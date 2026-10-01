import { createKuerzenTask, createErweiternTask, createAdditionFractionTask,
  createSubtractionFractionTask, createMultiplicationFractionTask,
  createDivisionFractionTask, createMixedTask } from "./tasks.js";

export const OPERATION_CHOICES = [
  { value: "addition", label: "Addition", symbol: "+", createTask: createAdditionFractionTask },
  { value: "subtraktion", label: "Subtraktion", symbol: "−", createTask: createSubtractionFractionTask },
  { value: "multiplikation", label: "Multiplikation", symbol: "⋅", createTask: createMultiplicationFractionTask },
  { value: "division", label: "Division", symbol: ":", createTask: createDivisionFractionTask }
];

export function createBlockDefinition(block) {
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

export const SECTION_DEFINITIONS = [
  { key: "kuerzen", heading: "Brüche kürzen", count: 32, createTask: createKuerzenTask, type: "kuerzen" },
  { key: "erweitern", heading: "Brüche erweitern", count: 12, createTask: createErweiternTask, type: "erweitern" },
  { key: "addition", heading: "Addition", count: 0, createTask: createAdditionFractionTask, type: "operation" },
  { key: "subtraktion", heading: "Subtraktion", count: 0, createTask: createSubtractionFractionTask, type: "operation" },
  { key: "multiplikation", heading: "Multiplikation", count: 0, createTask: createMultiplicationFractionTask, type: "operation" },
  { key: "division", heading: "Division", count: 0, createTask: createDivisionFractionTask, type: "operation" }
];

/** @type {import('../../model/contracts.js').Topic} */
export const FRACTIONS_TOPIC = {
  id: "fractions",
  defaultTitle: "Arbeitsblatt Brüche",
  sections: SECTION_DEFINITIONS,
  operations: OPERATION_CHOICES,
  createBlockDefinition,
  hints: {
    kuerzen: "Teile Zähler und Nenner durch dieselbe Zahl. Kürze so weit, bis beide keinen gemeinsamen Teiler mehr haben.",
    erweitern: "Multipliziere Zähler und Nenner mit derselben Zahl. Bestimme den Faktor zuerst an der ausgefüllten Stelle.",
    addition: "Bringe beide Brüche auf einen gemeinsamen Nenner. Addiere die Zähler, behalte den Nenner und kürze das Ergebnis.",
    subtraktion: "Bringe beide Brüche auf einen gemeinsamen Nenner. Subtrahiere die Zähler und kürze das Ergebnis.",
    multiplikation: "Multipliziere Zähler mit Zähler und Nenner mit Nenner. Du kannst auch schon vor dem Multiplizieren kürzen.",
    division: "Multipliziere den ersten Bruch mit dem Kehrwert des zweiten Bruchs. Kürze anschließend das Ergebnis.",
    mixed: "Beachte Punkt vor Strich. Bei gleicher Rechenart-Priorität rechnest du von links nach rechts. Kürze das Ergebnis."
  }
};
