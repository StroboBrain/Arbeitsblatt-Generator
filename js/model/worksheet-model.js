import { createRandom } from "../domain/random.js";
import { createUniqueTasks, taskSignature } from "../domain/task-generation.js";
import { defaultSettings, normalizeSettings } from "./settings.js";
import { sectionHint } from "./scaffolding.js";

/** Owns settings and generated data. No DOM, HTML, page geometry, or printing. */
export class WorksheetModel {
  #state;
  #worksheet = null;
  #definitions = new Map();

  constructor(topic, seedSource = () => Math.floor(Math.random() * 0x100000000)) {
    this.topic = topic;
    this.seedSource = seedSource;
    this.#state = defaultSettings(topic);
  }

  update(patch) {
    this.#state = normalizeSettings({ ...this.#state, ...patch }, this.topic);
    return this.getState();
  }

  getState() { return structuredClone(this.#state); }
  getWorksheet() { return structuredClone(this.#worksheet); }

  createBlockExamples(settings) {
    return settings.blocks.map((block, index) => block.operations.length === 0 ? null
      : this.topic.createBlockDefinition(block).createTask(createRandom(0x5eed + index),
        Math.floor((block.count - 1) / 2), block.count, settings));
  }

  /** Same normalized state + seed gives the same worksheet; mutates only owned state. */
  createWorksheet(seed = this.seedSource()) {
    const random = createRandom(seed);
    const definitions = [
      ...this.topic.sections.map(definition => ({ ...definition, count: this.#state.sectionCounts[definition.key] }))
        .filter(definition => definition.count > 0),
      ...this.#state.blocks.filter(block => block.operations.length > 0).map(this.topic.createBlockDefinition)
    ];
    this.#definitions = new Map(definitions.map(definition => [definition.key, definition]));
    const sections = definitions.map(definition => ({
      key: definition.key, heading: definition.heading, type: definition.type,
      hint: sectionHint(this.#state.scaffolding, definition, this.topic),
      tasks: createUniqueTasks(definition, definition.count, random, this.#state)
    }));
    this.#worksheet = { ...this.getState(), seed: seed >>> 0, sections };
    return this.getWorksheet();
  }

  /** Reroll using the displayed worksheet's settings, even if form drafts have changed. */
  regenerateTask(sectionKey, taskIndex) {
    const definition = this.#definitions.get(sectionKey);
    const section = this.#worksheet?.sections.find(section => section.key === sectionKey);
    if (!definition || !Number.isInteger(taskIndex) || !section?.tasks[taskIndex]) return this.getWorksheet();
    const random = createRandom(this.seedSource());
    const seen = new Set(section.tasks.map(task => taskSignature(definition.type, task)));
    let task;
    for (let attempt = 0; attempt < 30; attempt++) {
      task = definition.createTask(random, taskIndex, section.tasks.length, this.#worksheet);
      if (!seen.has(taskSignature(definition.type, task))) break;
    }
    section.tasks[taskIndex] = task;
    return this.getWorksheet();
  }
}
