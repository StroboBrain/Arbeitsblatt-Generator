import { getTopic, WORKSHEET_PRESETS } from "./domain/topics.js";
import { WorksheetModel } from "./model/worksheet-model.js";
import { WorksheetPlanner } from "./services/worksheet-planner.js";
import { SettingsView } from "./views/settings-view.js";
import { PreviewView } from "./views/preview-view.js";
import { WorksheetRenderer } from "./views/worksheet-renderer.js";
import { WorksheetController } from "./controllers/worksheet-controller.js";
import { PdfExporter } from "./printing/pdf-exporter.js";
import { applyPrintMetrics } from "./layout/print-metrics.js";

// Composition root: browser dependencies are created only here.
const params = new URLSearchParams(window.location.search);
const topic = getTopic(params.get("topic"));
const preset = WORKSHEET_PRESETS.find(preset => preset.id === params.get("preset"));
applyPrintMetrics(document.documentElement);
new WorksheetController({
  model: new WorksheetModel(topic),
  settingsView: new SettingsView(document, topic),
  previewView: new PreviewView(document, new WorksheetRenderer()),
  planner: new WorksheetPlanner(topic),
  pdfExporter: new PdfExporter()
}).start(preset?.settings);
