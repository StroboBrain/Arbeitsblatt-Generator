import { PAGE_CONTENT_PX, TITLE_PX, TASK_GRID_COLUMNS, MIXED_GRID_COLUMNS,
  MIXED_HEAD_EXTRA_PX, SECTION_HEAD_PX, SECTION_HEAD_TOP_PX,
  TASK_ROW_BOX_PX, TASK_ROW_GAP_PX, SOLUTIONS_BANNER_PX,
  SOLUTIONS_BANNER_TOP_PX, SOLUTIONS_COLUMNS, SOLUTIONS_ROW_PX,
  SOLUTIONS_FIRST_HEAD_PX, SOLUTIONS_GROUP_HEAD_PX,
  SOLUTIONS_GROUP_HEAD_TOP_PX, SCAFFOLD_PX } from "./print-metrics.js";

export function worksheetUnits(worksheet) {
  return worksheet.sections.map((section) => ({ mixed: section.type === "mixed", count: section.tasks.length, scaffold: Boolean(section.hint) }));
}

/**
 * Authoritative A4 page plan, shared by preview, count estimates, and print.
 * Input units follow document order and contain only count/geometry metadata.
 * @param {import('../model/contracts.js').LayoutUnit[]} units
 * @returns {import('../model/contracts.js').PagePlan}
 */
export function paginateWorksheet(units) {
  const breaks = [];
  const solutionBreaks = [];
  let page = 1;
  let used = TITLE_PX;
  const nextPage = () => { page += 1; used = 0; };

  units.forEach((unit, sectionIndex) => {
    const columns = unit.mixed ? MIXED_GRID_COLUMNS : TASK_GRID_COLUMNS;
    const rows = Math.ceil(unit.count / columns);
    const extra = unit.mixed ? MIXED_HEAD_EXTRA_PX : 0;
    // Keep each section heading and optional support with its first task row.
    const supportPx = unit.scaffold ? SCAFFOLD_PX : 0;
    let headPx = (sectionIndex === 0 ? SECTION_HEAD_TOP_PX : SECTION_HEAD_PX) + extra + supportPx;
    if (used + headPx + TASK_ROW_BOX_PX > PAGE_CONTENT_PX) {
      nextPage();
      breaks.push({ sectionIndex, taskIndex: 0, page });
      // Document CSS removes section spacing at the top of a planned page.
      headPx = SECTION_HEAD_TOP_PX + extra + supportPx;
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
    const firstGroupPx = Math.ceil(units[0].count / SOLUTIONS_COLUMNS) * SOLUTIONS_ROW_PX + SOLUTIONS_FIRST_HEAD_PX;
    // Keep the solutions banner with its first group rather than orphaning it.
    if (used + SOLUTIONS_BANNER_PX + firstGroupPx > PAGE_CONTENT_PX) {
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
