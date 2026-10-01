/**
 * A4 document geometry in CSS pixels (96 px/in), shared by planning and styling.
 * Pages are explicitly broken at the planned boundaries in css/print.css.
 * Fixed line boxes make screen and print use the same geometry.
 */
export const PAGE_CONTENT_PX = 265 * 96 / 25.4;
export const TASK_GRID_COLUMNS = 4;
export const MIXED_GRID_COLUMNS = 3;
export const TASK_ROW_BOX_PX = 42;
export const TASK_ROW_GAP_PX = 6;
export const SECTION_HEAD_PX = 54;
export const SECTION_HEAD_TOP_PX = 32;
export const MIXED_HEAD_EXTRA_PX = 0;
export const TITLE_PX = 44;
export const SOLUTIONS_COLUMNS = 8;
export const SOLUTIONS_ROW_PX = 23;
export const SOLUTIONS_BANNER_PX = 63.5;
export const SOLUTIONS_BANNER_TOP_PX = 41.5;
export const SOLUTIONS_FIRST_HEAD_PX = 14.5;
export const SOLUTIONS_GROUP_HEAD_PX = 24.5;
export const SOLUTIONS_GROUP_HEAD_TOP_PX = 14.5;
export const SCAFFOLD_PX = 64;

/** Set document CSS variables once at the composition root; no stylesheet parsing. */
export function applyPrintMetrics(element) {
  const metrics = {
    "task-columns": TASK_GRID_COLUMNS,
    "mixed-columns": MIXED_GRID_COLUMNS,
    "solution-columns": SOLUTIONS_COLUMNS,
    "task-row": `${TASK_ROW_BOX_PX}px`,
    "task-gap": `${TASK_ROW_GAP_PX}px`,
    "section-head": `${SECTION_HEAD_TOP_PX}px`,
    "section-gap": `${SECTION_HEAD_PX - SECTION_HEAD_TOP_PX}px`,
    "title-height": `${TITLE_PX}px`,
    "solution-row": `${SOLUTIONS_ROW_PX}px`,
    "solution-head": `${SOLUTIONS_FIRST_HEAD_PX}px`,
    "solution-gap": `${SOLUTIONS_GROUP_HEAD_PX - SOLUTIONS_FIRST_HEAD_PX}px`,
    "solution-banner": `${SOLUTIONS_BANNER_TOP_PX}px`,
    "scaffold-height": `${SCAFFOLD_PX}px`
  };
  Object.entries(metrics).forEach(([name, value]) => element.style.setProperty(`--${name}`, value));
}
