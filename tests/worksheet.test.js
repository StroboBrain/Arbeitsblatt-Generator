import test from 'node:test';
import assert from 'node:assert/strict';
import { WorksheetModel } from '../js/model/worksheet-model.js';
import { WorksheetPlanner } from '../js/services/worksheet-planner.js';
import { FRACTIONS_TOPIC } from '../js/domain/fractions/topic.js';
import { defaultSettings, normalizeSettings } from '../js/model/settings.js';
import { createMixedTask, evaluateMixed } from '../js/domain/fractions/tasks.js';
import { gcd } from '../js/domain/math.js';
import { WorksheetRenderer } from '../js/views/worksheet-renderer.js';
import { PdfExporter } from '../js/printing/pdf-exporter.js';

const topic = FRACTIONS_TOPIC;
const allCounts = count => Object.fromEntries(topic.sections.map(s => [s.key, count]));
const value = (n,d) => n/d;
const expected = task => {
  const a=value(task.aNum,task.aDen), b=value(task.bNum,task.bDen);
  return ({'+':()=>a+b, '−':()=>a-b, '⋅':()=>a*b, ':':()=>a/b})[task.operatorSymbol]();
};

test('generation is deterministic and snapshots cannot mutate model state', () => {
  const model = new WorksheetModel(topic);
  const settings = { sectionCounts: allCounts(12), scaffolding: 'hints', blocks: [{ id:'1', count:12, operations:['addition','division'] }] };
  model.update(settings);
  const first = model.createWorksheet(42);
  assert.deepEqual(first, model.createWorksheet(42));
  first.sections[0].tasks[0].numerator = -999;
  first.blocks[0].operations.length = 0;
  const state = model.getState(); state.sectionCounts.kuerzen = 0;
  assert.equal(model.getState().sectionCounts.kuerzen, 12);
  assert.notEqual(model.getWorksheet().sections[0].tasks[0].numerator, -999);
  assert.equal(model.getState().blocks[0].operations.length, 2);
});

test('normalization bounds inputs, removes unknown operations and owns nested data', () => {
  const input = { maxNumerator:999, maxDenominator:'invalid', sectionCounts:{kuerzen:7}, blocks:[{id:'1',count:11,operations:['addition','unknown']},{id:'1',count:12,operations:[]}] };
  const settings=normalizeSettings(input,topic);
  assert.equal(settings.maxNumerator,99); assert.equal(settings.maxDenominator,36);
  assert.equal(settings.sectionCounts.kuerzen,32);
  assert.deepEqual(settings.blocks[0].operations,['addition']);
  assert.notEqual(settings.blocks[0].id,settings.blocks[1].id);
  assert.equal(input.blocks[0].count,11);
});

test('all fraction tasks satisfy arithmetic, positivity, ranges, and proper-only across seeds', () => {
  const model = new WorksheetModel(topic);
  for (const limit of [10,26,99]) for (const properOnly of [true,false]) {
    model.update({ sectionCounts:allCounts(20), maxNumerator:limit, maxDenominator:limit, properOnly });
    for (let seed=0;seed<30;seed++) {
      const worksheet = model.createWorksheet(seed);
      for (const section of worksheet.sections) for (const task of section.tasks) {
        if (section.type==='erweitern') {
          const n=task.targetNumerator ?? task.answerValue, d=task.targetDenominator ?? task.answerValue;
          assert.equal(n*task.denominator,d*task.numerator);
          assert.ok(n<=limit && d<=limit);
        } else {
          assert.ok(task.answerNumerator>0 && task.answerDenominator>0);
          assert.equal(gcd(task.answerNumerator,task.answerDenominator),1);
          if (properOnly) assert.ok(task.answerNumerator<task.answerDenominator);
          if (section.type==='operation') {
            assert.ok(Math.abs(value(task.answerNumerator,task.answerDenominator)-expected(task))<1e-10);
            assert.ok(task.aNum<=limit && task.bNum<=limit && task.aDen<=limit && task.bDen<=limit);
          } else {
            assert.equal(task.numerator*task.answerDenominator,task.denominator*task.answerNumerator);
            assert.ok(gcd(task.numerator,task.denominator)>1);
            assert.ok(task.numerator<=limit && task.denominator<=limit);
          }
        }
      }
    }
  }
});

test('bounded fallbacks preserve chosen operations and proper fractions for a constant random source', () => {
  const settings = { ...defaultSettings(topic), maxNumerator:10, maxDenominator:10 };
  for (const definition of topic.sections) {
    const task = definition.createTask(()=>0,0,12,settings);
    if (definition.type==='operation') {
      assert.ok(Math.abs(value(task.answerNumerator,task.answerDenominator)-expected(task))<1e-10);
      assert.ok(task.answerNumerator<task.answerDenominator);
    }
  }
  for (const symbol of ['+','−','⋅',':']) {
    const task=createMixedTask([symbol])(()=>0,0,12,settings);
    assert.equal(task.firstSymbol,symbol); assert.equal(task.secondSymbol,symbol);
    assert.ok(task.answerNumerator>0 && task.answerNumerator<task.answerDenominator);
  }
  assert.throws(()=>createMixedTask([]),RangeError);
});

test('mixed evaluation uses precedence and left associativity', () => {
  const parts=[{n:1,d:2},{n:1,d:3},{n:1,d:4}];
  const high=evaluateMixed(parts,'+','⋅').result;
  assert.equal(high.n/high.d,7/12);
  const left=evaluateMixed(parts,':',':').result;
  assert.equal(left.n/left.d,6);
});

test('reroll preserves displayed settings and all other tasks after editing the draft', () => {
  let seed=10;
  const model=new WorksheetModel(topic,()=>seed++);
  model.update({maxNumerator:10,maxDenominator:10});
  const before=model.createWorksheet();
  model.update({maxNumerator:99,maxDenominator:99,scaffolding:'hints'});
  const after=model.regenerateTask('kuerzen',0);
  assert.equal(after.maxNumerator,10); assert.equal(after.scaffolding,'none');
  assert.deepEqual(after.sections[0].tasks.slice(1),before.sections[0].tasks.slice(1));
  assert.notDeepEqual(after.sections[0].tasks[0],before.sections[0].tasks[0]);
});

test('estimates, rendered page counts, task numbering and hints agree for large worksheets', () => {
  const model=new WorksheetModel(topic), planner=new WorksheetPlanner(topic), renderer=new WorksheetRenderer();
  for (const scaffolding of ['none','hints']) for (const count of [0,4,32,64]) {
    const settings=model.update({title:'<script>alert(1)</script>',sectionCounts:allCounts(count),scaffolding,blocks:[{id:'1',count:30,operations:['subtraktion']}]});
    const worksheet=model.createWorksheet(9), plan=planner.layout(worksheet), html=renderer.render(worksheet,plan);
    assert.equal(planner.estimateLayout(settings).pages,plan.pages);
    assert.equal((html.match(/class="worksheet-paper"/g)||[]).length,plan.pages);
    assert.equal((html.match(/class="task-row"/g)||[]).length,count*6+30);
    assert.equal((html.match(/class="learning-hint"/g)||[]).length,scaffolding==='hints' ? worksheet.sections.length : 0);
    assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
    if(plan.breaks.some(b=>b.taskIndex>0)) assert.match(html,/start="(?:[2-9]|[1-9][0-9]+)"/);
  }
});

test('page fitting retains selected sections and leaves input untouched', () => {
  const planner=new WorksheetPlanner(topic), settings=defaultSettings(topic), original=structuredClone(settings);
  const fitted=planner.fillPages(settings,{allowNewBlocks:false});
  assert.deepEqual(settings,original); assert.equal(fitted.blocks.length,0);
  assert.equal(planner.estimateLayout(fitted).pages%2,0);
  assert.equal(fitted.sectionCounts.addition,0);
  assert.ok(fitted.sectionCounts.kuerzen>0 && fitted.sectionCounts.erweitern>0);
});

test('empty settings and incomplete blocks generate no tasks', () => {
  const model=new WorksheetModel(topic);
  model.update({sectionCounts:allCounts(0),blocks:[{id:'1',count:12,operations:[]}]});
  const worksheet=model.createWorksheet(1);
  assert.equal(worksheet.sections.length,0);
  const estimate=new WorksheetPlanner(topic).estimateLayout(model.getState());
  assert.ok(estimate.empty); assert.equal(estimate.incompleteBlocks,1);
});

test('PDF adapter waits for fonts, uses worksheet title, and restores it after printing', async () => {
  const doc={title:'Generator',fonts:{ready:Promise.resolve()}};
  const seen=[];
  const browser={addEventListener(){},removeEventListener(){},print(){seen.push(doc.title);}};
  const exporter=new PdfExporter(browser,doc);
  await exporter.export({title:'Mein Blatt',sections:[{}]});
  assert.deepEqual(seen,['Mein Blatt']); assert.equal(doc.title,'Generator');
  await exporter.export({title:'Leer',sections:[]}); assert.equal(seen.length,1);
});
