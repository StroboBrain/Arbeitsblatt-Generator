/**
 * Shared domain contracts. No browser APIs or executable state live here.
 * All returned model snapshots are owned copies, safe for callers to read/change.
 *
 * @typedef {Object} GeneratorSettings
 * @property {number} maxNumerator Integer in [10, 99]; bounds displayed input numerators.
 * @property {number} maxDenominator Integer in [10, 99]; bounds displayed input denominators.
 * @property {boolean} properOnly Require proper fractions, including arithmetic results.
 *
 * @typedef {Object} MixedBlock
 * @property {string} id Stable ID, unique within the settings.
 * @property {number} count One of BLOCK_COUNT_OPTIONS.
 * @property {string[]} operations Known operation IDs; an empty list means a draft block.
 *
 * @typedef {GeneratorSettings & {
 *   topicId: string, title: string, sectionCounts: Object<string, number>,
 *   scaffolding: 'none'|'hints', blocks: MixedBlock[]
 * }} WorksheetSettings
 *
 * @typedef {{numerator:number, denominator:number, answerNumerator:number,
 *   answerDenominator:number}} ReductionTask
 * @typedef {{numerator:number, denominator:number, targetNumerator:number|null,
 *   targetDenominator:number|null, answerValue:number}} ExpansionTask
 * @typedef {{aNum:number, aDen:number, bNum:number, bDen:number,
 *   operatorSymbol:string, answerNumerator:number, answerDenominator:number}} OperationTask
 * @typedef {{aNum:number, aDen:number, bNum:number, bDen:number, cNum:number,
 *   cDen:number, firstSymbol:string, secondSymbol:string,
 *   answerNumerator:number, answerDenominator:number}} MixedTask
 * @typedef {ReductionTask|ExpansionTask|OperationTask|MixedTask} Task
 *
 * Task fractions have positive integer numerators/denominators. Reduction inputs
 * are intentionally unreduced. Expansion has exactly one null target field.
 * Arithmetic/reduction answers are reduced; expansion answers preserve the scale.
 * Generation is deterministic for the same settings and seed. Duplicate avoidance
 * is best effort in a small number range; retries must always be bounded.
 *
 * @typedef {Object} SectionDefinition
 * @property {string} key Stable identifier.
 * @property {string} heading German display label.
 * @property {number} count Default task count.
 * @property {'kuerzen'|'erweitern'|'operation'|'mixed'} type Task renderer discriminator.
 * @property {(random:()=>number,index:number,count:number,settings:GeneratorSettings)=>Task} createTask
 *
 * @typedef {Object} Topic
 * @property {string} id URL-safe ID.
 * @property {string} defaultTitle
 * @property {SectionDefinition[]} sections
 * @property {{value:string,label:string,symbol:string}[]} operations
 * @property {(block:MixedBlock)=>SectionDefinition} createBlockDefinition
 * @property {Object<string,string>} hints Plain text, at most two lines in the document hint box.
 *
 * @typedef {{key:string,heading:string,type:SectionDefinition['type'],tasks:Task[],hint:string|null}} WorksheetSection
 * @typedef {WorksheetSettings & {seed:number,sections:WorksheetSection[]}} Worksheet
 *
 * @typedef {{mixed:boolean,count:number,scaffold:boolean}} LayoutUnit
 * @typedef {Object} PagePlan
 * @property {number} pages At least one A4 page, including solutions.
 * @property {{sectionIndex:number,taskIndex:number,page:number}[]} breaks Ordered task boundaries.
 * @property {{groupIndex:number,rowIndex:number,page:number}[]} solutionBreaks Ordered solution boundaries.
 * @property {number} bannerPage Page containing the solutions heading.
 * @property {number} freePx Remaining last-page height in CSS pixels, using print-metrics.js.
 */
export {};
