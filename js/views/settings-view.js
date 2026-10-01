import { TYPE_QUICK_PICKS, TYPE_COUNT_OPTIONS, BLOCK_QUICK_PICKS,
  BLOCK_COUNT_OPTIONS, DEFAULT_BLOCK_COUNT } from "../model/settings.js";
import { TASK_GRID_COLUMNS } from "../layout/print-metrics.js";
import { buildTaskRowHtml } from "./task-renderers.js";
import { escapeHtml } from "./html.js";

export class SettingsView {
  constructor(root, topic) {
    this.root = root;
    this.topic = topic;
    this.definitions = topic.sections;
    this.operations = topic.operations;
    this.form = root.querySelector("#worksheet-form");
    this.titleInput = root.querySelector("#worksheet-title");
    this.maxNumeratorInput = root.querySelector("#max-numerator");
    this.maxDenominatorInput = root.querySelector("#max-denominator");
    this.maxNumeratorOutput = root.querySelector("#max-numerator-value");
    this.maxDenominatorOutput = root.querySelector("#max-denominator-value");
    this.properOnlyInput = root.querySelector("#proper-only");
    this.scaffoldingInput = root.querySelector("#learning-hints");
    this.blockList = root.querySelector("#block-list");
    this.addBlockButton = root.querySelector("#add-block");
    this.fillButton = root.querySelector("#fill-pages");
    this.fillNote = root.querySelector("#fill-pages-note");
    this.fillHint = root.querySelector("#fill-hint");
    this.typeList = root.querySelector("#type-list");
    // Dieselbe Aktion steht oben und unten; beide tragen data-action="create".
    this.submitButtons = Array.from(root.querySelectorAll("[data-action='create']"));
    this.blockCounter = 0;
    this.renderTypeRows();
  }

  renderTypeRows() {
    this.typeList.innerHTML = this.definitions.map((definition) => {
      const picks = TYPE_QUICK_PICKS.map((value) => `
        <button type="button" class="quick-pick" data-key="${definition.key}" data-count="${value}"
          aria-label="${escapeHtml(definition.heading)}: ${value === 0 ? "aus" : `${value} Aufgaben`}">${value === 0 ? "Aus" : value}</button>`).join("");
      const options = TYPE_COUNT_OPTIONS.map((value) =>
        `<option value="${value}"${value === definition.count ? " selected" : ""}>${value === 0 ? "Aus" : value}</option>`).join("");
      return `
        <div class="type-row" data-key="${definition.key}">
          <label class="type-name" for="count-${definition.key}">${escapeHtml(definition.heading)}</label>
          <div class="type-controls">
            <div class="quick-picks">${picks}</div>
            <select class="type-count" id="count-${definition.key}" aria-label="${escapeHtml(definition.heading)}: Anzahl Aufgaben">${options}</select>
          </div>
        </div>`;
    }).join("");
    this.syncQuickPicks();
  }

  readSettings() {
    const sectionCounts = {};
    this.definitions.forEach((definition) => {
      sectionCounts[definition.key] = Number(this.typeList.querySelector(`#count-${definition.key}`).value);
    });
    return {
      title: this.titleInput.value,
      sectionCounts,
      maxNumerator: Number(this.maxNumeratorInput.value),
      maxDenominator: Number(this.maxDenominatorInput.value),
      properOnly: this.properOnlyInput.checked,
      scaffolding: this.scaffoldingInput.checked ? "hints" : "none",
      blocks: this.readBlocks()
    };
  }

  setSectionCounts(counts) {
    Object.entries(counts).forEach(([key, value]) => {
      const select = this.typeList.querySelector(`#count-${key}`);
      if (select) select.value = String(value);
    });
    this.syncQuickPicks();
  }

  renderSettings(settings) {
    this.titleInput.value = settings.title;
    this.maxNumeratorInput.value = settings.maxNumerator;
    this.maxDenominatorInput.value = settings.maxDenominator;
    this.properOnlyInput.checked = settings.properOnly;
    this.scaffoldingInput.checked = settings.scaffolding === "hints";
    this.setSectionCounts(settings.sectionCounts);
    this.blockList.replaceChildren();
    settings.blocks.forEach(block => this.addBlock(block.count, block.operations, block.id));
    this.syncRangeOutputs();
  }

  // Die Auswahlliste führt den Wert, die Schnellwahl zeigt ihn nur an.
  syncQuickPicks() {
    this.typeList.querySelectorAll(".type-row").forEach((row) => {
      const value = row.querySelector(".type-count").value;
      row.dataset.off = String(Number(value) === 0);
      row.querySelectorAll(".quick-pick").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.count === value));
      });
    });
  }

  setBlockCount(index, count) {
    this.blockList.querySelectorAll(".block-count")[index].value = String(count);
    this.syncBlockQuickPicks();
  }

  // Dasselbe Prinzip wie syncQuickPicks, nur je Block statt je Typ-Zeile: die
  // Auswahlliste des Blocks führt den Wert, die Schnellwahl zeigt ihn nur an.
  syncBlockQuickPicks() {
    this.blockList.querySelectorAll(".block-card").forEach((card) => {
      const value = card.querySelector(".block-count").value;
      card.querySelectorAll(".quick-pick").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.count === value));
      });
    });
  }

  syncBlockWarnings() {
    this.blockList.querySelectorAll(".block-card").forEach((card) => {
      const chosen = card.querySelectorAll(".block-op:checked").length > 0;
      card.dataset.incomplete = String(!chosen);
      card.querySelector(".block-warning").hidden = chosen;
    });
  }

  // Zeigt je Block die Beispielaufgabe aus dem Model. Ohne gewählte Rechenart
  // bleibt die Zeile leer — dort steht bereits die Warnung.
  renderBlockExamples(examples) {
    this.blockList.querySelectorAll(".block-card").forEach((card, index) => {
      const slot = card.querySelector(".block-example");
      if (!slot) return;
      const task = examples[index];
      slot.hidden = !task;
      if (task) slot.querySelector(".block-example-task").innerHTML = buildTaskRowHtml("mixed", task);
    });
  }

  readBlocks() {
    return Array.from(this.blockList.querySelectorAll(".block-card")).map((card) => ({
      id: card.dataset.blockId,
      count: Number(card.querySelector(".block-count").value),
      operations: Array.from(card.querySelectorAll(".block-op:checked")).map((input) => input.value)
    }));
  }

  bindSubmit(handler) {
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      handler();
    });
  }

  bindSettingsChange(handler) {
    const sync = () => {
      this.syncRangeOutputs();
      this.syncQuickPicks();
      this.syncBlockQuickPicks();
      this.syncBlockWarnings();
      handler();
    };
    this.form.addEventListener("input", sync);
    this.form.addEventListener("change", sync);
  }

  // Dieselbe Schnellwahl-Logik bedient beide Listen: ein Typ-Knopf trägt
  // data-key (welche Zeile), ein Block-Knopf data-block-id (welcher Block) —
  // das eine oder das andere ist immer gesetzt, nie beides.
  bindQuickPick(handler) {
    const applyPick = (event) => {
      const button = event.target.closest(".quick-pick");
      if (!button) return;
      if (button.dataset.key) {
        this.typeList.querySelector(`#count-${button.dataset.key}`).value = button.dataset.count;
        this.syncQuickPicks();
      } else if (button.dataset.blockId) {
        this.blockList.querySelector(`#block-${button.dataset.blockId}-count`).value = button.dataset.count;
        this.syncBlockQuickPicks();
      } else {
        return;
      }
      handler();
    };
    this.typeList.addEventListener("click", applyPick);
    this.blockList.addEventListener("click", applyPick);
  }

  bindAddBlock(handler) {
    this.addBlockButton.addEventListener("click", handler);
  }

  bindFillPages(handler) {
    this.fillButton.addEventListener("click", handler);
  }

  bindRemoveBlock(handler) {
    this.blockList.addEventListener("click", (event) => {
      const button = event.target.closest(".block-remove");
      if (!button) return;
      button.closest(".block-card").remove();
      this.refreshBlockLabels();
      handler();
    });
  }

  addBlock(preferredCount, operations = [], id = null) {
    const blockId = id ?? String(++this.blockCounter);
    this.blockCounter = Math.max(this.blockCounter, Number(blockId) || 0);
    // Beim manuellen Anlegen bewusst nichts vorausgewählt: die Lehrkraft soll
    // die Rechenarten wählen.
    const options = this.operations.map((choice) => `
      <div class="choice-option">
        <input type="checkbox" class="block-op" id="block-${blockId}-${choice.value}" value="${choice.value}"${operations.includes(choice.value) ? " checked" : ""}>
        <label for="block-${blockId}-${choice.value}"><span aria-hidden="true">${choice.symbol}</span><span class="visually-hidden">${choice.label}</span></label>
      </div>`).join("");

    // Immer alle Größen anbieten: eine bei knappem Platz angelegte Auswahlliste
    // bliebe sonst dauerhaft kurz, auch wenn später wieder Platz frei wird.
    const selected = BLOCK_COUNT_OPTIONS.includes(preferredCount) ? preferredCount : DEFAULT_BLOCK_COUNT;
    const countOptions = BLOCK_COUNT_OPTIONS
      .map((value) => `<option value="${value}"${value === selected ? " selected" : ""}>${value}</option>`)
      .join("");
    // Dieselbe Schnellwahl-plus-Auswahlliste wie bei den Aufgabentypen: die
    // Auswahlliste führt den Wert, die Schnellwahl-Knöpfe (data-block-id statt
    // data-key, siehe bindQuickPick) setzen und spiegeln ihn nur.
    const picks = BLOCK_QUICK_PICKS.map((value) => `
        <button type="button" class="quick-pick" data-block-id="${blockId}" data-count="${value}"
          aria-label="Aufgaben: ${value}">${value}</button>`).join("");

    const card = document.createElement("div");
    card.className = "block-card";
    card.dataset.blockId = String(blockId);
    card.innerHTML = `
      <div class="block-card-head">
        <span class="block-card-title">Block</span>
        <button type="button" class="block-remove">Entfernen</button>
      </div>
      <p class="block-prompt">Rechenarten wählen</p>
      <div class="choice-group choice-group--grid4">${options}</div>
      <p class="block-warning">Ohne Rechenart wird dieser Block nicht erzeugt.</p>
      <p class="block-example" hidden>
        <span class="block-example-label">Beispiel</span>
        <span class="block-example-task"></span>
      </p>
      <div class="block-count-row">
        <label for="block-${blockId}-count">Aufgaben</label>
        <div class="type-controls">
          <div class="quick-picks">${picks}</div>
          <select class="block-count" id="block-${blockId}-count">${countOptions}</select>
        </div>
      </div>`;

    this.blockList.appendChild(card);
    this.refreshBlockLabels();
    this.syncBlockWarnings();
    this.syncBlockQuickPicks();
  }

  refreshBlockLabels() {
    Array.from(this.blockList.querySelectorAll(".block-card")).forEach((card, index) => {
      card.querySelector(".block-card-title").textContent = `Block ${index + 1}`;
    });
  }

  syncRangeOutputs() {
    this.maxNumeratorOutput.textContent = this.maxNumeratorInput.value;
    this.maxDenominatorOutput.textContent = this.maxDenominatorInput.value;
  }

  renderFillHint(layout) {
    const pageLabel = layout.pages === 1 ? "1 Seite" : `${layout.pages} Seiten`;
    const odd = layout.pages % 2 === 1;
    let text;
    let state;
    if (layout.empty) {
      text = "Nichts ausgewählt: Stellen Sie für mindestens einen Aufgabentyp eine Anzahl ein oder wählen Sie in einem Block die Rechenarten.";
      state = "warn";
    } else if (layout.incompleteBlocks > 0) {
      text = `${layout.incompleteBlocks === 1 ? "Ein Block hat" : `${layout.incompleteBlocks} Blöcke haben`} noch keine Rechenart — bitte auswählen, sonst ${layout.incompleteBlocks === 1 ? "wird er" : "werden sie"} nicht erzeugt.`;
      state = "warn";
    } else if (odd) {
      text = `${layout.total} Aufgaben auf ${pageLabel} — ungerade Seitenzahl. Beim beidseitigen Druck bleibt eine Rückseite leer. „Seiten füllen“ passt die Aufgabenzahl nach Möglichkeit an.`;
      state = "warn";
    } else if (layout.missing >= TASK_GRID_COLUMNS * 2) {
      text = `${layout.total} Aufgaben auf ${pageLabel}: Die letzte Seite bleibt teilweise leer. Ca. ${layout.missing} Aufgaben mehr füllen sie.`;
      state = "warn";
    } else {
      text = `${layout.total} Aufgaben auf ${pageLabel} — die Seiten sind gut gefüllt.`;
      state = "ok";
    }
    this.fillHint.textContent = text;
    this.fillHint.dataset.state = state;
    // Der Knopf erscheint nur, wenn er etwas verbessern könnte: bei ungerader
    // Seitenzahl hilft er immer (notfalls durch Verkleinern auf die
    // nächstkleinere gerade Seitenzahl), sonst nur, wenn noch genug wächst, um
    // die letzte Seite spürbar voller zu machen. Ist nichts ausgewählt, kann er
    // ohnehin nichts tun. Anders als ein bloßes disabled blendet das den Knopf
    // (und die erklärende Notiz darunter) ganz aus, statt ihn wirkungslos
    // stehen zu lassen — "nur anzeigen, wenn es hilft" statt "anzeigen, aber
    // manchmal nichts tun".
    const helpful = !layout.empty && (odd || (layout.canGrow && layout.missing >= TASK_GRID_COLUMNS));
    this.fillButton.hidden = !helpful;
    this.fillNote.hidden = !helpful;
    this.submitButtons.forEach((button) => { button.disabled = layout.empty; });
  }

}
