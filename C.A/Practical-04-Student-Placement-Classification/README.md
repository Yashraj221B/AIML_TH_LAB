# Practical 4 — Student Placement Classification

This notebook prepares the supplied student dataset, trains four classifiers, and compares their performance.

## Data and notebook

- `Assignment_04_Student_Placement_Classification.ipynb`
- `data/student_placement_dataset.csv` — 1,200 student records with `Placed` as the target column.

## Workflow

- Remove `Student_ID` from the predictors.
- Impute numerical values with the median and categorical values with the most frequent value.
- Standardize numerical features and one-hot encode categorical features.
- Use a stratified 80:20 train-test split.
- Train an SVM, CART decision tree, KNN classifier, and Gaussian Naive Bayes classifier.
- Compare accuracy, precision, recall, F1-score, log loss, confusion matrices, and classification reports.

## Running

Install the shared dependencies from the repository root:

```bash
pip install -r requirements.txt
```

Open the notebook in Jupyter and run the cells in order.
