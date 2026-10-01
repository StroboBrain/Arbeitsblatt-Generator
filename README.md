# Arbeitsblattgenerator

Browser-based German mathematics worksheets, with fraction reduction/expansion,
four arithmetic operations, mixed exercises, optional learning hints, and solutions.
The existing green interface and monochrome A4 worksheet design are retained.

## Run locally

```sh
npm start
```

Open <http://127.0.0.1:8000>. This command uses Python 3's static HTTP server.
Alternatively, serve this directory with your IDE's local server. Serve over HTTP:
browser ES modules cannot reliably be loaded by opening the HTML as a `file://` URL.
There is no build step, application dependency, backend, or installation step.

- `index.html`: compact topic selection with the three fraction presets and a separate operations section.
- `operations.html`: static placeholder for a future operations generator; no generator functionality yet.
- `fractions.html`: fraction worksheet editor (Bruchgenerator); usable directly without visiting the landing page.
- `fractions.html?preset=operations`: arithmetic preset.
- `fractions.html?preset=scaffolding`: fraction exercises with learning hints enabled.

## Model–view–controller structure

| Area | Responsibility |
| --- | --- |
| `js/app.js` | Composition root: creates and connects dependencies for the generator. |
| `js/landing.js` | Maps fraction presets to explicit navigation destinations; other sections can link to separate generators. |
| `js/controllers/worksheet-controller.js` | Handles user actions and coordinates model, views, planning, and export. |
| `js/model/worksheet-model.js` | Owns normalized settings and the generated worksheet; generates and replaces tasks. |
| `js/model/contracts.js` | JSDoc contracts for settings, task variants, topics, worksheets, and page plans. |
| `js/model/settings.js` | Defaults, count choices, and normalization of form input. |
| `js/model/scaffolding.js` | Learning-support strategies: currently no support or section-level hints. |
| `js/domain/fractions/` | Fraction generators, arithmetic, exercise definitions, and learning-hint content. |
| `js/domain/topics.js` | Topic registry and the landing page's starting presets. |
| `js/domain/task-generation.js` | Task signatures and bounded duplicate-avoidance retries. |
| `js/views/settings-view.js` | Form controls and form events; no worksheet generation or pagination. |
| `js/views/preview-view.js` | Mounts document markup, scales the A4 preview, emits task and export events. |
| `js/views/worksheet-renderer.js` | Pure rendering of a worksheet and its page plan into shared document HTML. |
| `js/views/task-renderers.js` | Task and answer markup, also used for mixed-block examples. |
| `js/services/worksheet-planner.js` | Plans sections, estimates pages, and fits task counts without touching the DOM. |
| `js/layout/` | Print geometry and the pure pagination algorithm. |
| `js/printing/pdf-exporter.js` | Waits for fonts and opens the browser print/PDF dialog. |

The model has no dependency on views, DOM APIs, or printing. Views receive data;
the controller decides when to generate, plan, render, or export. Draft changes
update settings and the page-count hint. The displayed worksheet remains a separate
snapshot until generation; replacing one task uses that snapshot's number range.
Public model snapshots are copies, so callers cannot mutate internal state.

## How PDF rendering works

```text
Form -> normalize settings -> WorksheetModel -> Worksheet snapshot
                                            -> WorksheetPlanner
                                               -> paginateWorksheet -> PagePlan
Worksheet + PagePlan -> WorksheetRenderer -> shared A4 document markup
                                           |-> PreviewView scales it on screen
                                           |-> PdfExporter opens print dialog
                                               css/print.css enforces page breaks
```

1. Generators produce data, including answer keys and optional hint text.
2. `print-metrics.js` defines document geometry in CSS pixels at 96 px/in. A4 is
   210 × 297 mm with 16 mm margins; the usable height is 265 mm. The composition
   root applies row/header dimensions as CSS variables to keep layout and styling
   synchronized. Physical paper dimensions also appear in the document/print CSS.
3. `paginate-worksheet.js` places headings, hints, task rows, and solution groups.
   A section heading stays with its first task row. Solutions stay in whole groups;
   the solutions banner stays with the first group. Continuations preserve task
   numbering and section identity. The count hint uses the same pagination code.
4. `WorksheetRenderer` creates one `.worksheet-paper` per planned page. There is
   no separate PDF template and no second independent page estimator.
5. `worksheet.css` defines the shared document appearance. `print.css` removes the
   application chrome, scaling, and paper decoration, then forces page breaks
   between the planned pages. Export never regenerates tasks.
6. The browser handles saving. Choose **Als PDF speichern**, A4, 100% scale, and
   disable browser headers/footers. The app does not download a PDF directly.

The preview scales complete pages on narrow screens instead of changing their
columns. Fixed row/header heights are part of the rendering contract. When changing
fonts, spacing, task shapes, or hints, update the geometry and inspect a generated
PDF. Longer support content needs a corresponding layout contract, not an arbitrary
HTML insertion into the existing two-line hint box.

## Extending the generator

### Add an exercise within fractions

1. Implement a generator in `js/domain/fractions/tasks.js`. It receives a seeded
   random source, task index/count, and normalized settings, and returns task data.
2. Register its stable key, heading, default count, task type, and generator in the
   fraction topic. The settings view derives its rows from these definitions.
3. Reuse an existing task shape/renderer where possible. A new shape needs updates
   to `contracts.js`, `task-renderers.js`, and task signatures, plus an appropriate
   layout unit if its height or column count differs.
4. Add an optional hint in the topic's hint map and tests of mathematical behavior.

### Add another topic

Implement the `Topic` contract and register it in `js/domain/topics.js`. The generator
resolves `?topic=<id>` through that registry. Topic definitions supply the exercise
catalog, operations, mixed-block factory, and hints. Add a landing entry or preset
when the topic is ready. The current form, task variants, and grid sizes are tailored
to fractions: a domain with different inputs or task geometry must provide those
additional contracts/views rather than assuming every topic fits the existing form.

### Add more scaffolding

`sectionHint` is the current support extension point; task generators remain
independent of learning-support presentation. To add worked examples or intermediate
steps, first define structured support data, then add a strategy, form choice,
renderer, and matching layout dimensions. Do not embed HTML in the domain model.

## Verification

```sh
npm test
```

Uses Node.js 20+ and its built-in test runner; no test dependencies are required.
Tests cover deterministic generation, arithmetic and range invariants, bounded
fallbacks, model ownership, draft/display isolation, page planning, hint rendering,
HTML escaping, page fitting, empty selections, and the print adapter.

For changes to the document layout, also check the browser at desktop/mobile widths
and export an A4 PDF with all sections, mixed tasks, hints, and solutions. Compare
actual PDF page counts and boundaries to the preview; inspect pages for clipping and
orphaned headings. Browser-specific print settings can override the intended size.
