# Practical 2 — Problem Solving Through Search

This notebook implements and compares four families of search algorithms on benchmark problems.

## Notebook

- `Practical_02_Problem_Solving_Through_Search.ipynb`

## Algorithms and problems

| Area | Algorithms | Problem |
| --- | --- | --- |
| Uninformed search | BFS, DFS, Uniform Cost Search | Weighted grid maze |
| Informed search | Greedy Best-First Search, A* | The same maze with a Manhattan heuristic |
| Local search | Hill Climbing | 8-Queens |
| Constraint satisfaction | Backtracking, MRV with forward checking | Australia map colouring |

## Evaluation

Graph searches report path length, path cost, expanded nodes, and execution time. The 8-Queens experiment runs repeated trials and records success rate, remaining conflicts, steps, and execution time. Map colouring records validity, assignment attempts, backtracks, and execution time.

The notebook uses NumPy, Pandas, and Matplotlib. Install them with the repository-level [`requirements.txt`](../../requirements.txt), then open the notebook in Jupyter and run the cells in order.
