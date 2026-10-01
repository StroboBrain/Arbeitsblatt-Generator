import { clamp } from "../domain/math.js";

export const DEFAULT_BLOCK_COUNT = 12;
export const BLOCK_COUNT_OPTIONS = [6, 9, 12, 15, 18, 24, 30];
export const BLOCK_QUICK_PICKS = [6, 12, 18, 24, 30];
export const TYPE_COUNT_OPTIONS = Array.from({ length: 17 }, (_, i) => i * 4);
export const TYPE_QUICK_PICKS = [0, 8, 16, 24, 32];
export const MAX_TYPE_COUNT = 64;
export const nextBlockOption = count => BLOCK_COUNT_OPTIONS.find(option => option > count);

export function defaultSettings(topic) {
  return {
    topicId: topic.id,
    title: topic.defaultTitle,
    sectionCounts: Object.fromEntries(topic.sections.map(definition => [definition.key, definition.count])),
    maxNumerator: 26,
    maxDenominator: 36,
    properOnly: true,
    scaffolding: "none",
    blocks: []
  };
}

/**
 * Form boundary: returns owned, normalized settings, never mutates the input.
 * Counts are supported full-row sizes; invalid values fall back to defaults.
 * Blocks with no selected operations remain drafts and generate no tasks.
 * @returns {import('./contracts.js').WorksheetSettings}
 */
export function normalizeSettings(input, topic) {
  const defaults = defaultSettings(topic);
  const integer = (value, fallback) => Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback;
  const ids = new Set();
  const blocks = (Array.isArray(input.blocks) ? input.blocks : []).map((block, index) => {
    let id = String(block.id ?? index + 1).replace(/[^a-zA-Z0-9_-]/g, "") || String(index + 1);
    while (ids.has(id)) id += "-copy";
    ids.add(id);
    return {
      id,
      count: BLOCK_COUNT_OPTIONS.includes(Number(block.count)) ? Number(block.count) : DEFAULT_BLOCK_COUNT,
      operations: topic.operations.filter(choice => (block.operations ?? []).includes(choice.value)).map(choice => choice.value)
    };
  });
  return {
    topicId: topic.id,
    title: String(input.title ?? defaults.title).trim() || defaults.title,
    sectionCounts: Object.fromEntries(topic.sections.map(({ key, count }) => [key,
      TYPE_COUNT_OPTIONS.includes(Number(input.sectionCounts?.[key])) ? Number(input.sectionCounts[key]) : count])),
    maxNumerator: clamp(integer(input.maxNumerator, defaults.maxNumerator), 10, 99),
    maxDenominator: clamp(integer(input.maxDenominator, defaults.maxDenominator), 10, 99),
    properOnly: input.properOnly !== false,
    scaffolding: input.scaffolding === "hints" ? "hints" : "none",
    blocks
  };
}
