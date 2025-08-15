# Contributing to Firefighter Adventures

We're excited to have you contribute to Firefighter Adventures! This document outlines our development workflow.

## Branching Strategy

-   **`main` branch:** This is our stable branch. It will always hold the latest "released" version of the game. Direct commits to `main` are not allowed.
-   **Feature branches:** All new work (features, fixes, etc.) must happen in separate branches.
    -   Branch names should be descriptive, like `feat/background-music` or `fix/truck-animation`.
    -   Always create new branches from the `main` branch.

## Development Process

1.  Create a new feature branch from `main`.
2.  Develop the feature on this branch, making small, atomic commits.
3.  Write simple tests for the new feature if applicable.
4.  Once the feature is complete, create a Pull Request (PR) to merge the feature branch into `main`.

## Pull Requests (PRs)

-   The PR description should clearly explain the changes made.
-   I (Jules) will be responsible for creating PRs. The user will be responsible for reviewing and merging them.

## Versioning

-   We use [Semantic Versioning (SemVer)](https://semver.org/) (`MAJOR.MINOR.PATCH`).
-   We will track the current version in the `README.md` file.

## Testing

-   For now, we will use Playwright visual verification for frontend changes to ensure nothing is broken.
-   As the game logic gets more complex, we can explore adding a simple JavaScript testing framework.

## Release Management

-   Every time a PR is merged into `main`, it can be considered a new release.
-   We will use Git tags to mark release points (e.g., `v0.1.0`).
