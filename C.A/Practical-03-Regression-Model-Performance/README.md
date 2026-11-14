# Practical 3 — Regression Model Performance

This notebook evaluates regression models and implements batch gradient descent for linear regression.

## Notebook and data

- `Practical_03_Performance_Evaluation_of_Regression_Models.ipynb`
- `data/Salary_Data.csv` — salary against years of experience for the gradient-descent experiment.

The notebook also uses scikit-learn’s built-in diabetes dataset, which is loaded at runtime and is not stored as a repository CSV.

## Work covered

- Linear, Ridge, Lasso, and polynomial regression on the diabetes dataset.
- Model comparison using MAE, MSE, RMSE, R², adjusted R², and cross-validation.
- Batch gradient descent from scratch on the salary and diabetes data.
- Learning-rate comparisons, loss curves, coefficient inspection, and residual plots.

The diabetes data is used for educational modelling only and is not a medical diagnostic tool.

## Running

Install the shared dependencies from the repository root:

```bash
pip install -r requirements.txt
```

Open the notebook in Jupyter and run its cells in order.
