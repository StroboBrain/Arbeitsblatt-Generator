import { escapeHtml } from "./html.js";

/**
 * Render navigation entries without assuming a shared generator route.
 * @param {HTMLElement} container
 * @param {{title: string, href: string}[]} entries Trusted app-local destinations.
 */
export function renderPresetLinks(container, entries) {
  container.innerHTML = entries.map(entry =>
    `<a class="preset-link" href="${escapeHtml(entry.href)}">${escapeHtml(entry.title)}</a>`
  ).join("");
}
