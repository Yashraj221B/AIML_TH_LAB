import project from './projectData.json';

export const SMART_COUNTER_IDS = new Set([5, 187, 188, 197, 198]);

export interface SmartReading {
  id: number;
  name: string;
  raw: number;
  history: number[];
}

export interface Drive {
  id: string;
  model: string;
  capacityGb: number;
  bay: string;
  classifierEvaluationAvailable: boolean;
  updatedMinutes: number;
  hours: number | null;
  smart: SmartReading[];
}

const capacityByModel: Record<string, number> = {
  'HGST HMS5C4040BLE640': 4000,
  ST12000NM0007: 12000,
  ST4000DM000: 4000,
  ST8000DM002: 8000,
  ST8000NM0055: 8000,
  'TOSHIBA MQ01ABF050': 500,
};

const attributeNames: Record<number, string> = {
  5: 'Reallocated sector count',
  9: 'Power-on hours',
  12: 'Power cycle count',
  187: 'Reported uncorrectable errors',
  188: 'Command timeout',
  194: 'Temperature',
  197: 'Current pending sector count',
  198: 'Offline uncorrectable sector count',
};

const counterScenarios = [
  { reallocated: 0, uncorrectable: 0, timeout: 0, pending: 0, offline: 0 },
  { reallocated: 1, uncorrectable: 0, timeout: 0, pending: 0, offline: 0 },
  { reallocated: 1, uncorrectable: 0, timeout: 0, pending: 1, offline: 0 },
  { reallocated: 4, uncorrectable: 1, timeout: 1, pending: 3, offline: 1 },
];

const fleetSize = 300;
const counterScenarioByDrive = new Map<string, number>([
  ['ST12000NM0007:90', 3],
  ['ST12000NM0007:43', 2],
  ['ST4000DM000:26', 1],
  ['ST8000DM002:14', 1],
  ['ST8000NM0055:31', 1],
]);

const modelDriveCounts = (() => {
  const totalDevices = project.models.reduce((total, model) => total + model.devices, 0);
  const allocations = project.models.map((model) => {
    const exactCount = (model.devices / totalDevices) * fleetSize;
    return { count: Math.floor(exactCount), remainder: exactCount % 1 };
  });
  const remaining = fleetSize - allocations.reduce((total, allocation) => total + allocation.count, 0);
  const byRemainder = [...allocations.keys()].sort((a, b) => allocations[b].remainder - allocations[a].remainder);
  for (const index of byRemainder.slice(0, remaining)) allocations[index].count += 1;
  return allocations.map((allocation) => allocation.count);
})();

function history(raw: number, changing: boolean) {
  return Array.from({ length: 8 }, (_, index) => Math.max(0, raw - (changing ? 7 - index : 0)));
}

function makeDrive(modelIndex: number, driveIndex: number): Drive {
  const model = project.models[modelIndex];
  const scenario = counterScenarioByDrive.get(`${model.name}:${driveIndex}`) ?? 0;
  const values = counterScenarios[scenario];
  const availableIds = new Set(model.features.map((feature) => Number(feature.match(/\d+/)?.[0])));
  const commonRaw: Record<number, number> = {
    5: values.reallocated,
    9: 14000 + modelIndex * 2147 + ((driveIndex * 1861) % 40000),
    12: 80 + modelIndex * 37 + driveIndex * 52,
    187: values.uncorrectable,
    188: values.timeout,
    194: 28 + scenario * 3 + (driveIndex % 3),
    197: values.pending,
    198: values.offline,
  };
  const smart = Object.keys(commonRaw).map(Number)
    .filter((id) => availableIds.has(id) && attributeNames[id])
    .map((id) => ({
      id,
      name: attributeNames[id],
      raw: commonRaw[id],
      history: history(commonRaw[id], SMART_COUNTER_IDS.has(id) && scenario >= 2),
    }));

  return {
    id: `DD-${String(modelIndex + 1).padStart(2, '0')}-${String(driveIndex + 1).padStart(3, '0')}`,
    model: model.name,
    capacityGb: capacityByModel[model.name],
    bay: `Bay ${String.fromCharCode(65 + (modelIndex % 4))}-${String(driveIndex + 1).padStart(2, '0')}`,
    classifierEvaluationAvailable: project.classifierModels.includes(model.name),
    updatedMinutes: 2 + ((driveIndex * 7 + modelIndex * 11) % 48),
    hours: smart.find((reading) => reading.id === 9)?.raw ?? null,
    smart,
  };
}

export const drives: Drive[] = project.models.flatMap((_, modelIndex) =>
  Array.from({ length: modelDriveCounts[modelIndex] }, (_, driveIndex) => makeDrive(modelIndex, driveIndex)),
);

export function getNonZeroSmartCounters(drive: Drive): SmartReading[] {
  return drive.smart.filter((reading) => SMART_COUNTER_IDS.has(reading.id) && reading.raw > 0);
}

export function getChangedSmartCounters(drive: Drive): SmartReading[] {
  return drive.smart.filter((reading) => {
    if (!SMART_COUNTER_IDS.has(reading.id) || reading.history.length < 2) return false;
    return reading.history[reading.history.length - 1] > reading.history[reading.history.length - 2];
  });
}

export interface AlertItem {
  id: string;
  driveId: string;
  model: string;
  severity: 'Warning' | 'Info';
  title: string;
  detail: string;
  action: string;
  minutesAgo: number | null;
  acknowledged: boolean;
}

const signalAlerts: AlertItem[] = drives.flatMap((drive, index) => {
  const changedCounters = getChangedSmartCounters(drive);
  if (!changedCounters.length) return [];
  const changedNames = changedCounters.map((reading) => `SMART ${reading.id}`).join(', ');
  return [{
    id: `EVT-${index + 200}`,
    driveId: drive.id,
    model: drive.model,
    severity: 'Info',
    title: 'SMART counter increased',
    detail: `${changedNames} increased since the previous sample. Review raw history and vendor-specific thresholds; this is not a failure prediction.`,
    action: 'Inspect the readings and confirm the attribute semantics for this drive model.',
    minutesAgo: drive.updatedMinutes,
    acknowledged: false,
  }];
});

const coverageAlerts: AlertItem[] = project.models.flatMap((model, index) => {
  if (project.classifierModels.includes(model.name)) return [];
  const drive = drives.find((item) => item.model === model.name);
  if (!drive) return [];
  const uncoveredCount = drives.filter((item) => item.model === model.name).length;
  return [{
    id: `EVT-COVERAGE-${index}`,
    driveId: drive.id,
    model: model.name,
    severity: 'Warning',
    title: 'No supervised classifier evaluated',
    detail: `${model.name} has no supervised failure classifier in the project; ${uncoveredCount} fleet drives have no model-based output.`,
    action: 'Keep model output unavailable; continue collecting SMART telemetry.',
    minutesAgo: null,
    acknowledged: false,
  }];
});

export const alerts: AlertItem[] = [...coverageAlerts, ...signalAlerts];

export const serviceComponents = [
  { name: 'SMART collectors', state: 'Operational', detail: '18 / 18 connected', metric: 'Last-seen < 2 min', scale: 'Distributed agents' },
  { name: 'Ingestion queue', state: 'Operational', detail: '2,460 readings / min', metric: 'Queue depth 14', scale: 'Partitioned by drive family' },
  { name: 'Schema validation', state: 'Operational', detail: '99.8% accepted', metric: '0.2% quarantined', scale: 'Reject invalid / unknown features' },
  { name: 'Model inference', state: 'Operational', detail: 'p95 84 ms', metric: '3 workers · 41% CPU', scale: 'Stateless horizontal workers' },
  { name: 'Time-series storage', state: 'Operational', detail: 'Write lag 1.4 sec', metric: 'Retention policy active', scale: 'Partitioned by date and model' },
  { name: 'Alert delivery', state: 'Degraded', detail: '2 retries pending', metric: 'No events dropped', scale: 'Backoff + retry queue' },
];
