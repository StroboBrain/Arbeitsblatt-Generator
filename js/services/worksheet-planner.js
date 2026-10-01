import { clamp } from "../domain/math.js";
import { BLOCK_COUNT_OPTIONS, MAX_TYPE_COUNT, nextBlockOption } from "../model/settings.js";
import { TASK_ROW_BOX_PX, TASK_ROW_GAP_PX, TASK_GRID_COLUMNS,
  SOLUTIONS_COLUMNS, SOLUTIONS_ROW_PX } from "../layout/print-metrics.js";
import { paginateWorksheet, worksheetUnits } from "../layout/paginate-worksheet.js";
import { sectionHint } from "../model/scaffolding.js";

/** Pure planning service: estimates pages and fits counts without DOM or randomness. */
export class WorksheetPlanner {
  constructor(topic) { this.topic = topic; }

  layout(worksheet) { return paginateWorksheet(worksheetUnits(worksheet)); }

  // Mirrors what createWorksheet would build, without generating any tasks.
  // Ein Block ohne gewählte Rechenarten zählt nicht mit — die Lehrkraft muss
  // sie erst auswählen.
  planSections(settings) {
    const baseSections = this.topic.sections
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
    const units = [
      ...plan.baseSections.map((entry) => ({ mixed: false, count: entry.count,
        scaffold: Boolean(sectionHint(settings.scaffolding, entry.definition, this.topic)) })),
      ...plan.blocks.map((block) => ({ mixed: true, count: block.count,
        scaffold: Boolean(sectionHint(settings.scaffolding, this.topic.createBlockDefinition(block), this.topic)) }))
    ];
    const { pages, freePx } = paginateWorksheet(units);
    const canGrow = plan.baseSections.some((entry) => entry.count < MAX_TYPE_COUNT)
      || plan.blocks.some((block) => nextBlockOption(block.count) !== undefined);
    // Eine zusätzliche Aufgabenzeile kostet die Zeile samt Abstand plus die
    // halbe Zeile, die ihre vier Antworten im 8-spaltigen Lösungsraster belegen.
    const rowCostPx = TASK_ROW_BOX_PX + TASK_ROW_GAP_PX
      + (TASK_GRID_COLUMNS / SOLUTIONS_COLUMNS) * SOLUTIONS_ROW_PX;
    return {
      total: standardTotal + blockTotal,
      pages,
      freePx,
      missing: Math.floor(freePx / rowCostPx) * TASK_GRID_COLUMNS,
      canGrow,
      incompleteBlocks: (settings.blocks || []).filter((block) => block.operations.length === 0).length,
      empty: sectionCount === 0
    };
  }

  // Skaliert die gewählten Aufgabenzahlen proportional auf die Zielseitenzahl —
  // nach oben wie nach unten, damit das von der Lehrkraft eingestellte
  // Verhältnis erhalten bleibt. Ein gewählter Typ fällt dabei nie ganz weg.
  // Geprüft wird direkt die Seitenzahl, nicht ein Ersatzmaß dafür: nur so kann
  // das Ergebnis nicht doch eine Seite zu lang werden.
  scaleSectionCounts(settings, targetPages) {
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
      // Die Seitenzahl wächst monoton mit dem Faktor: die erste Überschreitung
      // endet die Suche.
      if (this.estimateLayout({ ...settings, sectionCounts: scaled }).pages > targetPages) break;
      best = scaled;
    }
    return best || smallest;
  }

  // Bringt die Aufgabenzahlen auf eine gerade Seitenzahl. Zuerst wird nach oben
  // aufgefüllt; wenn das die nächste gerade Seitenzahl nicht erreicht (etwa
  // weil alle Typen am Maximum stehen), wird stattdessen auf die nächstkleinere
  // gerade Seitenzahl verkleinert — sonst bliebe das Blatt dauerhaft ungerade.
  fillCounts(settings) {
    const { pages } = this.estimateLayout(settings);
    const grown = this.scaleSectionCounts(settings, Math.max(2, pages + (pages % 2)));
    const grownPages = this.estimateLayout({ ...settings, sectionCounts: grown }).pages;
    if (grownPages % 2 === 0) return grown;
    return this.scaleSectionCounts(settings, Math.max(2, grownPages - 1));
  }

  /** Return new settings; fitting never changes the caller's draft or selected operations. */
  fillPages(settings, { allowNewBlocks = true } = {}) {
    const result = structuredClone(settings);
    if (Object.values(result.sectionCounts).some(count => count > 0)) {
      result.sectionCounts = this.fillCounts(result);
    }
    const pages = this.estimateLayout(result).pages;
    const target = Math.max(2, pages + pages % 2);
    const fits = blocks => this.estimateLayout({ ...result, blocks }).pages <= target;
    for (let guard = 0; guard < 80; guard++) {
      const index = result.blocks.findIndex((block, i) => {
        const next = nextBlockOption(block.count);
        return next !== undefined && block.operations.length > 0
          && fits(result.blocks.map((other, j) => j === i ? { ...other, count: next } : other));
      });
      if (index !== -1) {
        result.blocks[index].count = nextBlockOption(result.blocks[index].count);
        continue;
      }
      const source = [...result.blocks].reverse().find(block => block.operations.length > 0);
      if (!allowNewBlocks || !source) break;
      let id = 1;
      while (result.blocks.some(block => block.id === String(id))) id++;
      const added = { ...source, id: String(id), operations: [...source.operations], count: BLOCK_COUNT_OPTIONS[0] };
      if (!fits([...result.blocks, added])) break;
      result.blocks.push(added);
    }
    return result;
  }

}
