import { FRACTIONS_TOPIC } from "./fractions/topic.js";

/** Topic registration is the extension point for additional mathematical domains. */
export const TOPICS = new Map([[FRACTIONS_TOPIC.id, FRACTIONS_TOPIC]]);
export const getTopic = id => TOPICS.get(id) ?? FRACTIONS_TOPIC;

/** Curated entry points into the same configurable worksheet generator. */
export const WORKSHEET_PRESETS = [
  { id: "fractions", number: "01", title: "Brüche verstehen", description: "Kürzen und Erweitern üben. Zahlenbereich und Aufgabenzahl passend zur Lerngruppe wählen.", label: "Brüche üben", settings: {} },
  { id: "operations", number: "02", title: "Mit Brüchen rechnen", description: "Addieren, subtrahieren, multiplizieren und dividieren. Rechenarten einzeln oder in gemischten Aufgaben üben.", label: "Rechenarten üben", settings: { title: "Rechnen mit Brüchen", sectionCounts: { kuerzen: 0, erweitern: 0, addition: 12, subtraktion: 12, multiplikation: 12, division: 12 } } },
  { id: "scaffolding", number: "03", title: "Mit Lernhilfen üben", description: "Kurze Merksätze direkt bei den Aufgaben geben Orientierung. Lernhilfen lassen sich jederzeit ausschalten.", label: "Mit Lernhilfen starten", settings: { scaffolding: "hints" } }
];
