import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const demoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(demoRoot, '..');

async function csv(path) {
  const text = await readFile(resolve(repoRoot, path), 'utf8');
  const lines = text.trim().split(/\r?\n/);
  const parseLine = (line) => {
    const values = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && line[index + 1] === '"' && quoted) {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === ',' && !quoted) {
        values.push(value);
        value = '';
      } else {
        value += character;
      }
    }
    values.push(value);
    return values;
  };
  const headers = parseLine(lines.shift());
  return lines.filter(Boolean).map((line) => Object.fromEntries(parseLine(line).map((value, index) => [headers[index], value])));
}

const numeric = (value) => Number(value);
const cleaning = await csv('results/reports/cleaning_summary.csv');
const audit = await csv('results/reports/label_generation_audit.csv');
const manifest = JSON.parse(await readFile(resolve(repoRoot, 'results/reports/feature_manifest.json'), 'utf8'));
const testMetrics = await csv('results/metrics/test_metrics.csv');
const validationMetrics = await csv('results/metrics/validation_metrics.csv');
const thresholds = await csv('results/metrics/xgboost_validation_threshold_metrics.csv');
const featureImportance = await csv('results/metrics/feature_importance.csv');
const clusterRows = await csv('results/metrics/model_identification_cluster_metrics.csv');
const classifierModels = [...new Set(testMetrics.filter((row) => row.algorithm !== 'isolation_forest').map((row) => row.model))];
const modelNames = cleaning.map((row) => row.model);
const models = cleaning.map((row) => {
  const label = audit.find((item) => item.model === row.model);
  const features = manifest[row.model]?.features ?? [];
  return {
    name: row.model,
    rows: numeric(row.rows_after_dropna),
    devices: numeric(label?.unique_drives ?? 0),
    terminalFailures: numeric(label?.terminal_failure_drives ?? 0),
    missingRowsRemoved: numeric(row.rows_with_missing_removed),
    labelMismatchesAfterGeneration: numeric(label?.label_mismatches_after_generation ?? 0),
    features,
    classifierCount: classifierModels.includes(row.model) ? 2 : 0,
  };
});

async function confusionFor(row) {
  const safeModel = row.model.replaceAll('/', '_');
  const file = row.algorithm === 'isolation_forest'
    ? `results/metrics/${safeModel}_isolation_forest_test_predictions.csv`
    : `results/metrics/${safeModel}_${row.algorithm}_test_predictions.csv`;
  const predictions = await csv(file);
  return predictions.reduce((counts, prediction) => {
    const actual = numeric(prediction.actual);
    const predicted = numeric(prediction.predicted);
    if (actual === 1 && predicted === 1) counts.tp += 1;
    else if (actual === 0 && predicted === 0) counts.tn += 1;
    else if (actual === 0) counts.fp += 1;
    else counts.fn += 1;
    return counts;
  }, { tp: 0, tn: 0, fp: 0, fn: 0 });
}

const metricRows = await Promise.all(testMetrics.map(async (row) => ({
  model: row.model,
  algorithm: row.algorithm,
  dataset: row.dataset,
  accuracy: numeric(row.accuracy),
  precision: numeric(row.precision),
  recall: numeric(row.recall),
  f1: numeric(row.f1),
  roc_auc: numeric(row.roc_auc),
  average_precision: numeric(row.average_precision),
  support: numeric(row.support),
  score_type: row.score_type,
  confusion: await confusionFor(row),
})));

const output = {
  models,
  classifierModels,
  testMetrics: metricRows,
  validationMetrics: validationMetrics.map((row) => ({
    model: row.model,
    algorithm: row.algorithm,
    precision: numeric(row.precision),
    recall: numeric(row.recall),
    f1: numeric(row.f1),
    support: numeric(row.support),
  })),
  thresholdMetrics: thresholds.map((row) => ({
    model: row.model,
    threshold: numeric(row.threshold),
    precision: numeric(row.precision),
    recall: numeric(row.recall),
    f1: numeric(row.f1),
  })),
  featureImportance: featureImportance.map((row) => {
    const id = row.feature.match(/\d+/)?.[0] ?? '';
    const names = {
      '5': 'Reallocated sector count',
      '9': 'Power-on hours',
      '187': 'Reported uncorrectable errors',
      '188': 'Command timeout',
      '194': 'Temperature',
      '197': 'Current pending sector count',
      '198': 'Offline uncorrectable sector count',
    };
    return {
      model: row.model,
      algorithm: row.algorithm,
      feature: row.feature,
      id,
      label: id && names[id] ? `SMART ${id} · ${names[id]}` : row.feature.replaceAll('_raw', ''),
      importance: numeric(row.importance),
    };
  }).sort((a, b) => b.importance - a.importance),
  clustering: {
    algorithm: clusterRows[0].algorithm,
    adjustedRandIndex: numeric(clusterRows[0].adjusted_rand_index),
    normalizedMutualInfo: numeric(clusterRows[0].normalized_mutual_info),
    clustersIncludingNoise: numeric(clusterRows[0].clusters_including_noise),
  },
  source: {
    dataset: 'Backblaze HDD 2019',
    rows: models.reduce((sum, item) => sum + item.rows, 0),
    metricSource: 'Saved Notebook 04 evaluation outputs',
  },
};

await writeFile(resolve(demoRoot, 'src/data/projectData.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote notebook-derived data for ${modelNames.length} drive models and ${metricRows.length} evaluated models.`);
