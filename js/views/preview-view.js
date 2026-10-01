/** Owns preview DOM, scaling and task/print events; receives already planned pages. */
export class PreviewView {
  constructor(root, renderer) {
    this.renderer = renderer;
    this.previewTitle = root.querySelector("#preview-title");
    this.previewCanvas = root.querySelector("#preview-canvas");
    this.printButtons = [...root.querySelectorAll("[data-action='print']")];
    this.watchPreviewWidth();
  }

  render(worksheet, layout) {
    this.previewTitle.textContent = worksheet.title;
    this.previewCanvas.dataset.ready = "true";
    this.previewCanvas.innerHTML = `<div class="preview-stage"><div class="preview-scaler">${this.renderer.render(worksheet, layout)}</div></div>`;
    this.fitPreview();
    this.printButtons.forEach(button => { button.hidden = worksheet.sections.length === 0; });
  }

  bindPrint(handler) {
    this.printButtons.forEach((button) => button.addEventListener("click", handler));
  }

  bindTaskClick(handler) {
    this.previewCanvas.addEventListener("click", (event) => {
      const button = event.target.closest(".task-row");
      if (!button) return;
      const li = button.closest("li");
      const ol = li.closest(".task-list");
      const sectionEl = ol.closest(".worksheet-section");
      const sectionKey = sectionEl.dataset.sectionKey;
      // Ein Abschnitt kann über mehrere Seiten (und damit mehrere <ol>, je
      // eines pro .worksheet-paper) verteilt sein; der Index innerhalb der
      // angeklickten Liste ist dann nicht der Index im Abschnitt. Das
      // start-Attribut der Liste liefert den Versatz (siehe WorksheetRenderer).
      const offset = Number(ol.getAttribute("start") || "1") - 1;
      const taskIndex = offset + Array.from(ol.children).indexOf(li);
      handler(sectionKey, taskIndex);
    });
  }

  // Jedes Blatt hat A4-Maße (siehe .worksheet-paper); .worksheet-pages ist der
  // ganze Stapel inklusive der Lücken dazwischen. Passt der Stapel nicht in
  // die Vorschauspalte, wird er als Ganzes verkleinert statt in der Breite
  // gestaucht — eine Stauchung würde einen anderen Zeilen- und Spaltenumbruch
  // zeigen als der Ausdruck. Vergrößert wird nie: 100% ist Originalgröße.
  fitPreview() {
    const stage = this.previewCanvas.querySelector(".preview-stage");
    const pages = this.previewCanvas.querySelector(".worksheet-pages");
    if (!stage || !pages) return;
    const canvasStyles = window.getComputedStyle(this.previewCanvas);
    const available = this.previewCanvas.clientWidth
      - parseFloat(canvasStyles.paddingLeft)
      - parseFloat(canvasStyles.paddingRight);
    // offsetWidth/offsetHeight ignorieren das transform und liefern damit die
    // ungeskalierte Größe — genau die Bezugsgröße für den Faktor.
    const pagesWidth = pages.offsetWidth;
    const pagesHeight = pages.offsetHeight;
    if (!pagesWidth || !pagesHeight || !(available > 0)) return;
    const scale = Math.min(1, available / pagesWidth);
    stage.style.setProperty("--preview-scale", scale);
    stage.style.width = `${Math.round(pagesWidth * scale)}px`;
    stage.style.height = `${Math.round(pagesHeight * scale)}px`;
  }

  // Der Maßstab hängt an der Breite der Vorschauspalte. Beobachtet wird nur
  // diese Breite: fitPreview() setzt selbst die Höhe der Bühne, eine Reaktion
  // auf Höhenänderungen würde sich im Kreis drehen.
  watchPreviewWidth() {
    let lastWidth = 0;
    const check = () => {
      const width = this.previewCanvas.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      this.fitPreview();
    };
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(check).observe(this.previewCanvas);
    } else {
      window.addEventListener("resize", check);
    }
  }
}

