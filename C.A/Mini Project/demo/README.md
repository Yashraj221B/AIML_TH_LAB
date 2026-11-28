# HDD Monitor

A standalone React prototype for presenting how a drive-health and failure-prediction service could be operated in production. It combines a deterministic fleet preview with real offline model-evaluation results from this repository's Backblaze 2019 notebooks. It does not collect SMART data or run the Python models.

## Run

```bash
cd demo
bun install
bun run dev
```

Build and preview:

```bash
bun run build
bun run preview
```

## Product views

- **Overview:** fleet composition, non-zero SMART counters, model-evaluation coverage and recent counter changes.
- **Drive inventory:** search, filter, sort, paginate and inspect raw per-model SMART attributes.
- **SMART signal review:** filter drives by model and inspect raw counters, power-on hours and counter changes.
- **Alerts:** review SMART counter changes and model-coverage gaps; acknowledge them for the current browser session.
- **Platform health:** collector, ingestion, validation, inference, time-series and delivery service health; scaling indicators and failure behavior.
- **Models & safeguards:** saved offline metrics by HDD family, operator oversight, data-quality/drift controls and model-evaluation limitations.

The original project evaluates Random Forest and XGBoost classifiers separately for five drive families. HGST appears in exploration but does not have a supervised failure classifier. Isolation Forest is an anomaly-detection experiment; KMeans is a model-identification experiment. Neither is represented as a failure classifier.

## Data and model boundary

`src/data/fleet.ts` contains a deterministic 300-drive fleet preview, apportioned by the per-model device counts in the source dataset. Drive-level values are raw illustrative SMART readings. The interface does not assign individual failure scores or risk bands. `src/data/projectData.json` contains notebook-derived dataset counts and offline evaluation metrics by model family. The values shown as service throughput, latency, queue depth and status demonstrate the operator interface; they are not telemetry from deployed services.

The UI does not invoke trained Python models or provide live predictions. Offline evaluation metrics describe a model family; they are not predictions for the individual drives in the fleet preview. A production integration would need authenticated SMART collectors, a validated model-specific feature contract, a backend inference service that loads the compatible Random Forest or XGBoost artifact, model/version metadata, persistent telemetry storage and a retryable alert-delivery path. Do not treat the interface's illustrative SMART readings or service counters as live production telemetry.

## Production and responsible-use considerations

- Scale collection and inference independently with distributed agents, queue-backed ingestion, partitioning and stateless workers.
- Validate model-specific schemas; quarantine invalid readings rather than filling absent SMART values with zero.
- Mark stale or unavailable telemetry and inference explicitly. Missing data must not be interpreted as a healthy drive.
- Track prediction coverage, latency, queue depth, feature drift, class prevalence and model performance by HDD family.
- Evaluate false negatives, precision/recall trade-offs and score calibration on leakage-free time-based data.
- The project training notebook documents post-split positive resampling that may expose held-out examples. Its saved scores are experiment results, not leakage-free production estimates.
- If live predictions are added, validate and calibrate them on leakage-free time-based data, define the prediction horizon, and show uncertainty and model context. Require human verification; never initiate destructive maintenance actions based only on a prediction.
- Production deployment should enforce authentication, role-based access, transport security, secrets management, audit logging and monitored alert retries.
