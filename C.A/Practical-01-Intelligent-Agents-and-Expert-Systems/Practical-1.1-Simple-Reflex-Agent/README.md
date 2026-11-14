# Practical 1.1 — Simple Reflex Vacuum Agent

## Aim

Implement a simple reflex agent for a floor-cleaning task and describe its environment with PEAS.

## Program

[`simple_reflex_vacuum_agent.py`](simple_reflex_vacuum_agent.py) creates a random 3 × 3 floor (`0` means clean and `1` means dirty). The agent cleans dirty tiles and follows a zig-zag path across the floor.

The program reports cleaned tiles, movement steps, total actions, and whether the floor is clean when it finishes. It uses Python’s standard library only.
