import { WORKSHEET_PRESETS } from "./domain/topics.js";
import { renderPresetLinks } from "./views/landing-view.js";

// Each entry owns its destination; future sections can use separate generators.
renderPresetLinks(document.querySelector("#fraction-presets"), WORKSHEET_PRESETS.map(preset => ({
  title: preset.title,
  href: `fractions.html?preset=${encodeURIComponent(preset.id)}`
})));
