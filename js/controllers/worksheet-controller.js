import { DEFAULT_BLOCK_COUNT, normalizeSettings } from "../model/settings.js";

/** Coordinates user actions; generation, presentation, layout, and export are injected. */
export class WorksheetController {
  constructor({ model, settingsView, previewView, planner, pdfExporter }) {
    Object.assign(this, { model, settingsView, previewView, planner, pdfExporter });
  }

  start(initialSettings = {}) {
    const view = this.settingsView;
    view.bindSubmit(() => this.generate());
    view.bindSettingsChange(() => this.updateDraft());
    view.bindQuickPick(() => this.updateDraft());
    view.bindRemoveBlock(() => this.updateDraft());
    view.bindAddBlock(() => { view.addBlock(DEFAULT_BLOCK_COUNT); this.updateDraft(); });
    view.bindFillPages(() => {
      const fitted = this.planner.fillPages(this.readDraft());
      view.renderSettings(this.model.update(fitted));
      this.generate();
    });
    this.previewView.bindTaskClick((key, index) => this.render(this.model.regenerateTask(key, index)));
    this.previewView.bindPrint(() => this.pdfExporter.export(this.model.getWorksheet()));
    const state = this.model.update(initialSettings);
    view.renderSettings(this.planner.fillPages(state, { allowNewBlocks: false }));
    this.generate();
  }

  readDraft() { return normalizeSettings(this.settingsView.readSettings(), this.model.topic); }

  updateDraft() {
    const settings = this.model.update(this.readDraft());
    this.settingsView.renderFillHint(this.planner.estimateLayout(settings));
    this.settingsView.renderBlockExamples(this.model.createBlockExamples(settings));
  }

  generate() {
    this.updateDraft();
    this.render(this.model.createWorksheet());
  }

  render(worksheet) {
    if (worksheet) this.previewView.render(worksheet, this.planner.layout(worksheet));
  }
}
