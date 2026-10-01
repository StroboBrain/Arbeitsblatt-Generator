import { escapeHtml, toRoman } from "./html.js";
import { buildItemHtml, buildAnswerHtml } from "./task-renderers.js";

/**
 * Pure document view: Worksheet + PagePlan -> the HTML used by preview AND print.
 * No task generation, DOM access, or independent pagination takes place here.
 */
export class WorksheetRenderer {
  render(worksheet, layout) {
    const pages = Array.from({ length: layout.pages }, () => []);
    pages[0].push(`<h3 class="worksheet-title-line">${escapeHtml(worksheet.title)}</h3>`);
    let currentPage = 1;
    worksheet.sections.forEach((section, sectionIndex) => {
      const breaks = layout.breaks.filter(entry => entry.sectionIndex === sectionIndex);
      if (breaks[0]?.taskIndex === 0) currentPage = breaks.shift().page;
      let start = 0;
      const append = end => {
        const first = start === 0;
        const heading = first ? `<div class="section-heading-row">
          <h4 class="section-heading">${toRoman(sectionIndex + 1)}. ${escapeHtml(section.heading)}</h4>
          <span class="section-heading-line" aria-hidden="true"></span></div>` : "";
        const hint = first && section.hint ? `<p class="learning-hint">${escapeHtml(section.hint)}</p>` : "";
        const items = section.tasks.slice(start, end).map(task => buildItemHtml(section.type, task)).join("");
        pages[currentPage - 1].push(`<div class="worksheet-section${first ? "" : " worksheet-section--continued"}" data-section-key="${escapeHtml(section.key)}">
          ${heading}${hint}<ol class="task-list${section.type === "mixed" ? " task-list--mixed" : ""}" start="${start + 1}">${items}</ol></div>`);
        start = end;
      };
      breaks.forEach(boundary => { append(boundary.taskIndex); currentPage = boundary.page; });
      append(section.tasks.length);
    });

    const solutionPages = new Map();
    currentPage = layout.bannerPage;
    worksheet.sections.forEach((section, index) => {
      const boundary = layout.solutionBreaks.find(entry => entry.groupIndex === index);
      if (boundary) currentPage = boundary.page;
      if (!solutionPages.has(currentPage)) solutionPages.set(currentPage, []);
      const groups = solutionPages.get(currentPage);
      groups.push(`<div class="solutions-group${groups.length ? "" : " solutions-group--first"}">
        <p class="solutions-group-label">${toRoman(index + 1)}. ${escapeHtml(section.heading)}</p>
        <ol class="solutions-list">${section.tasks.map(task => `<li>${buildAnswerHtml(section.type, task)}</li>`).join("")}</ol></div>`);
    });
    for (const [page, groups] of solutionPages) {
      const withBanner = page === layout.bannerPage;
      pages[page - 1].push(`<section class="worksheet-solutions${withBanner ? "" : " worksheet-solutions--continued"}">
        ${withBanner ? '<div class="solutions-banner"><p class="worksheet-label">Lösungen</p></div>' : ""}${groups.join("")}</section>`);
    }
    return `<div class="worksheet-pages">${pages.map((content, index) =>
      `<article class="worksheet-paper" lang="de" aria-label="Seite ${index + 1} von ${pages.length}">${content.join("")}</article>`).join("")}</div>`;
  }
}
