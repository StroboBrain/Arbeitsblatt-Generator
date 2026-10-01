export function taskSignature(type, task) {
  if (type === "erweitern") {
    return `${task.numerator}/${task.denominator}->${task.targetNumerator ?? "_"}/${task.targetDenominator ?? "_"}`;
  }
  if (type === "mixed") {
    return `${task.aNum}/${task.aDen}${task.firstSymbol}${task.bNum}/${task.bDen}${task.secondSymbol}${task.cNum}/${task.cDen}`;
  }
  if (type === "operation") {
    return `${task.aNum}/${task.aDen}${task.operatorSymbol}${task.bNum}/${task.bDen}`;
  }
  return `${task.numerator}/${task.denominator}`;
}

export function createUniqueTasks(definition, count, random, settings) {
  const seen = new Set();
  return Array.from({ length: count }, (_, index) => {
    let task;
    let attempts = 0;
    do {
      task = definition.createTask(random, index, count, settings);
      attempts++;
    } while (seen.has(taskSignature(definition.type, task)) && attempts < 30);
    seen.add(taskSignature(definition.type, task));
    return task;
  });
}

