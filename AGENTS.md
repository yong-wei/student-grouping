# Repository Guidelines

## Product Overview & Key Features
This project is a front-end-only student grouping assistant for importing questionnaire data, configuring grouping rules, previewing results, and exporting analysis artifacts without sending student data to a backend. The current feature set includes Excel questionnaire import, optional photo matching, fixed pre-group support via the `分组序号` column, intelligent grouping based on learning-style and balance weights, configurable face-chart analysis on the results page, class-level distribution analysis, Excel export, PDF class analysis export, and ZIP batch export of individual reports.

## Architecture Overview
The app follows a three-step workflow: data upload -> grouping configuration -> results preview/export. Routing and page orchestration live in `src/pages`, shared UI building blocks live in `src/components`, global session state is stored in Zustand via `src/store/index.ts`, and domain logic lives in `src/utils`. Core utility areas are: Excel parsing and validation (`excelParser`), grouping algorithms and fixed-group planning (`groupingAlgorithm`, `fixedGroupPlanning`), face-chart configuration and rendering math (`faceConfig`, `faceUtils`), statistics visibility/export helpers, and report/export generation (`excelExport`, `pdfExport`, `zipExport`).

## Project Structure & Module Organization
`src/main.tsx` bootstraps the Vite + React app and renders `App`. Feature views live in `src/pages` (`DataUploadPage`, `GroupingConfigPage`, `ResultsPage`), components are reusable widgets under `src/components`, and Zustand state is centralized in `src/store`. Domain helpers (`excelParser`, `groupingAlgorithm`, `fixedGroupPlanning`, `faceConfig`, `faceUtils`, `learningStyleUtils`, export helpers) sit in `src/utils`. Static assets ship from `public`, while long-form guidance, plans, and requirements sit in `docs/` for quick lookup. GitHub Actions workflows live in `.github/workflows`.

## Build, Test, and Development Commands
Run `npm run dev` for hot reloads and `npm run build` for a type-checked production bundle; preview locally via `npm run preview`. Quality gates: `npm run lint` (or `npm run lint:fix`) and `npm run test`. Vitest is configured in `vite.config.ts` with jsdom, a shared setup file, and coverage thresholds of 45/40/45/45 across statements/branches/functions/lines for the core algorithms and store. Use `npm run logs:view` and `npm run logs:clear` to inspect the mirrored console output. CI in `.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm run test`, and `npm run build` on pushes and pull requests.

## Coding Style & Naming Conventions
TypeScript + functional React is standard. Prettier enforces two-space indentation, semicolons, single quotes, and a 100-character limit. Components and Zustand stores use PascalCase filenames (`LearningStyleRadar.tsx`, `useAppStore`), utilities use camelCase exports, and hooks must start with `use`. Co-locate styling in `App.css`/`index.css` and avoid checking in generated artifacts (`coverage/`, `logs/`, exported reports).

## Testing Guidelines
Add regression tests under `src/test` with the `.test.ts` suffix mirroring the module under test. Reuse `src/test/setup.ts` for Testing Library helpers when exercising React stores or DOM transforms. Focus on grouping heuristics, Excel parsing (including ILS1–ILS44 fields), fixed pre-group behavior, face-chart mapping/configuration, and data integrity when matching photos. Run `npm run test` (or `npm run test:coverage`) before submitting work and expand coverage alongside new utilities instead of loosening thresholds.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`) with imperative mood. Summaries should call out the page or utility touched plus the user story or defect. Pull requests need a concise intent section, bullet-pointed changes, verification steps (lint, test, manual QA on exports), and any follow-up risks. Attach screenshots or sample exports whenever UI or report output changes. After pushing a feature branch, create a GitHub pull request and include `@codex` in the PR description or in an immediate follow-up comment so review is explicitly requested.

## Logging & Data Handling
`vite-plugin-logger` duplicates runtime logs into `logs/console.log`; avoid leaving debug statements in production code and clear the log after verifying fixes. Protect student privacy by keeping sample spreadsheets/photos in `student-group-ref/` and `docs/`; never commit real data. When exporting reports for review, share redacted artifacts or regenerate from the published template.
