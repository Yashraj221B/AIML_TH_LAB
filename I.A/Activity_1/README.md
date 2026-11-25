# Activity 1 — Machine Learning Classification and Regression

This notebook uses Backblaze Q1 2016 daily hard-drive telemetry for two supervised learning tasks:

1. Classify whether a drive has a recorded failure within the next seven calendar days.
2. Estimate the number of days until a recorded failure for drives that fail during the quarter.

## Notebook

- `Model_evaluation.ipynb`

## Data

Place the original Q1 2019 daily CSV files in `data_Q1_2019/`. The files must provide `date`, `serial_number`, `failure`, `model`, and `capacity_bytes`; SMART fields are used when available.

The data is not included in this repository. Download it from the [Backblaze Hard Drive Test Data](https://www.backblaze.com/cloud-storage/resources/hard-drive-test-data) page.

## Workflow

- Combine and inspect the daily files with DuckDB.
- Create time-aware classification and regression targets.
- Engineer SMART, missingness, lag, change, and rolling features.
- Train Random Forest classification and regression pipelines.
- Use chronological splits for classification and drive-level group splits for regression.
- Save metrics, feature importance, predictions, and trained pipelines as notebook outputs.

The classification task treats records without enough follow-up as unknown rather than assuming they are non-failures. The regression task covers only drives with a recorded failure in Q1 2016, so it is not a general remaining-useful-life model.

## Running

Install the shared dependencies from the repository root:

```bash
pip install -r requirements.txt
```

Open the notebook in Jupyter and update `ROOT` in the configuration section to the directory containing `data_Q1_2016/`. Then run the cells in order.
