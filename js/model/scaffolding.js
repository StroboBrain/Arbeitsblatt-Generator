/** A learning-support strategy returns plain text, never HTML or layout dimensions. */
const strategies = {
  none: () => null,
  hints: (definition, topic) => topic.hints[definition.key] ?? topic.hints[definition.type] ?? null
};

export function sectionHint(mode, definition, topic) {
  return (strategies[mode] ?? strategies.none)(definition, topic);
}
