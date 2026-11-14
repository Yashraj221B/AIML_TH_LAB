# Feature Engineering on Backblaze Drive Statistics

This notebook prepares Backblaze Q3 2023 drive records and SMART readings for inspection and classification.

## Notebook

- `Feature_Engineering.ipynb`

## What it covers

- Schema and missing-value inspection for drive and SMART fields.
- Capacity conversion, log-transformed SMART values, availability indicators, and selected non-zero counters.
- Exploratory summaries and plots for dates, models, failures, and SMART readings.
- A Random Forest classifier with median imputation, missingness indicators, and one-hot encoding.
- Validation-selected thresholding, weighted classification metrics, and permutation feature importance.

The notebook treats the target as same-day recorded failure classification. It should not be described as a several-day-ahead failure predictor.

## Data

Place the Backblaze Q3 2023 daily CSV files in `data_Q3_2023/` near the notebook. If the full dataset is unavailable, the notebook can use `2023-07-05_sample.csv` when that sample is placed beside the notebook or in the expected data directory.

The raw Backblaze files are not included in this repository. Download them from the [Backblaze Hard Drive Test Data](https://www.backblaze.com/cloud-storage/resources/hard-drive-test-data) page.

## Running

From the repository root, install the shared dependencies:

```bash
pip install -r requirements.txt
```

Open the notebook with Jupyter and run the cells in order. The notebook writes its generated CSV outputs to the directory from which it is run.

SMART attribute meanings can vary by manufacturer and model; the notebook retains that limitation rather than treating every attribute as universally comparable.
