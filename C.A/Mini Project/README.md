# HDD Failure Prediction

A machine learning project for analyzing hard disk drive (HDD) health data and predicting potential drive failures using SMART (Self-Monitoring, Analysis and Reporting Technology) attributes.

The project explores HDD failure patterns, prepares model-specific datasets, trains and evaluates classification models, and investigates unsupervised learning techniques for anomaly detection and drive identification.

## Project Structure

- `source/` – Reference implementation and original project materials.
- `data/raw/` – Input datasets and SMART attribute dictionary.
- `data/processed/` – Cleaned, model-specific datasets containing SMART attributes.
- `data/train_test/` – Chronologically partitioned training, validation, and test datasets.
- `notebooks/` – Four notebooks covering the complete machine learning workflow.
- `models/` – Saved and verified machine learning models.
- `results/metrics/` – Evaluation metrics and threshold analysis.
- `results/plots/` – Visualizations generated during exploration and evaluation.
- `results/reports/` – Generated reports and supporting outputs.

## Machine Learning Workflow

The project is organized into four sequential notebooks:

1. **`01_data_exploration.ipynb`** – Explores the HDD datasets, examines SMART attributes, studies failure distributions, and performs correlation analysis.
2. **`02_data_cleaning_feature_engineering.ipynb`** – Handles missing values, validates failure labels, prepares model-specific features, and generates chronological data splits.
3. **`03_model_training.ipynb`** – Trains and saves the machine learning models. It can also load and verify existing model artifacts.
4. **`04_model_evaluation.ipynb`** – Evaluates the saved models using classification metrics, confusion matrices, ROC curves, precision-recall curves, and threshold analysis.

Run the notebooks in the order listed above.

### Model Training

Notebook 03 defaults to `TRAIN = False`. In this mode, it loads and verifies the existing 12 model artifacts without retraining or overwriting them.

Set `TRAIN = True` only when you intentionally want to train models again.

Notebook 04 uses the saved artifacts for evaluation.

## Dataset

The project uses six HDD model datasets containing observations from the Backblaze drive statistics:

- HGST HMS5C4040BLE640
- ST12000NM0007
- ST4000DM000
- ST8000DM002
- ST8000NM0055
- TOSHIBA MQ01ABF050

The datasets contain SMART attributes and drive failure labels. Five drive models are used for supervised failure classification. The HGST dataset is included in exploratory and correlation analysis.

The available data consists of pre-extracted last-ten-observation datasets. The complete daily archive required to regenerate these extracts is not included.

## Features and Data Preparation

The analysis examines selected SMART attributes associated with potential drive health issues:

| SMART ID | Attribute |
|---|---|
| 5 | Reallocated Sector Count |
| 187 | Reported Uncorrectable Errors |
| 188 | Command Timeout |
| 197 | Current Pending Sector Count |
| 198 | Offline Uncorrectable Sector Count |

These attributes are used for correlation analysis and KMeans clustering. The supervised classifiers use the retained SMART features available in each drive model's dataset.

Failure labels are validated using the supplied last-day label files and reconstructed across the available ten-observation windows. Missing values, empty columns, and constant features are handled during preprocessing.

Data is split chronologically to preserve observation order.

## Algorithms

The project explores supervised and unsupervised machine learning:

### Supervised Learning

- **Random Forest** – An ensemble of decision trees that combines predictions to perform binary failure classification.
- **XGBoost** – A gradient-boosting algorithm that builds trees sequentially to improve classification performance.

### Unsupervised Learning

- **Isolation Forest** – Identifies anomalous drive observations by measuring how easily they can be isolated.
- **KMeans** – Groups observations into clusters for drive-model identification and pattern analysis.

Random Forest and XGBoost are evaluated on five drive models. Isolation Forest is evaluated on ST12000NM0007. KMeans is used as a separate model-identification experiment with four clusters.

## Saved Models

The `models/` directory contains 12 verified Joblib artifacts:

- 5 Random Forest models
- 5 XGBoost models
- 1 Isolation Forest model
- 1 KMeans model

DBSCAN was also explored as a clustering technique but was not included in the final saved models because its fitting operation exceeded the available memory.

## Evaluation

Classification performance is assessed using:

- Accuracy
- Precision
- Recall
- F1-score
- ROC-AUC
- Average Precision
- Confusion matrices
- Precision-recall and ROC curves

XGBoost validation scores are also examined across different classification thresholds. This analysis is diagnostic and does not change the default threshold used for the reported test metrics.

## Reproducibility and Limitations

- The available datasets contain pre-extracted observations rather than the complete daily Backblaze archive.
- The saved model artifacts use configurations that may differ from the configurations described in the reference project's training materials.
- The current training workflow performs positive-class resampling after splitting the data. This can introduce overlap between training and held-out positive observations and may inflate evaluation scores.
- Consequently, the reported results should be treated as experimental rather than leakage-free estimates of real-world performance.
- A more rigorous evaluation should perform resampling only on training data and use an untouched chronological test set. Grouping observations by drive serial number would further reduce the risk of drive-level leakage.

## Technologies Used

- Python
- Jupyter Notebook
- Pandas and NumPy
- Matplotlib and Seaborn
- Scikit-learn
- XGBoost
- Joblib