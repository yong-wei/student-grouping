# Repository Guidelines

## Project Structure & Module Organization
`src/main.tsx` bootstraps the Vite + React app and renders `App`. Feature views live in `src/pages` (`DataUploadPage`, `GroupingConfigPage`, `ResultsPage`), components are reusable widgets under `src/components`, and Zustand slices are in `src/store`. Domain helpers (`excelParser`, `groupingAlgorithm`, `learningStyleUtils`, exports) sit in `src/utils`. Static assets ship from `public`, while long-form guidance and requirements sit in `docs/` for quick lookup.

## Build, Test, and Development Commands
Run `npm run dev` for hot reloads and `npm run build` for a type-checked production bundle; preview locally via `npm run preview`. Quality gates: `npm run lint` (or `npm run lint:fix`) and `npm run test`. Vitest is configured in `vite.config.ts` with jsdom, a shared setup file, and coverage thresholds of 45/40/45/45 across statements/branches/functions/lines for the core algorithms and store. Use `npm run logs:view` and `npm run logs:clear` to inspect the mirrored console output.

## Coding Style & Naming Conventions
TypeScript + functional React is standard. Prettier enforces two-space indentation, semicolons, single quotes, and a 100-character limit. Components and Zustand stores use PascalCase filenames (`LearningStyleRadar.tsx`, `useAppStore`), utilities use camelCase exports, and hooks must start with `use`. Co-locate styling in `App.css`/`index.css` and avoid checking in generated artifacts (`coverage/`, `logs/`, exported reports).

## Testing Guidelines
Add regression tests under `src/test` with the `.test.ts` suffix mirroring the module under test. Reuse `src/test/setup.ts` for Testing Library helpers when exercising React stores or DOM transforms. Focus on grouping heuristics, Excel parsing (including ILS1–ILS44 fields), and data integrity when matching photos. Run `npm run test` (or `npm run test:coverage`) before submitting work and expand coverage alongside new utilities instead of loosening thresholds.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`) with imperative mood. Summaries should call out the page or utility touched plus the user story or defect. Pull requests need a concise intent section, bullet-pointed changes, verification steps (lint, test, manual QA on exports), and any follow-up risks. Attach screenshots or sample exports whenever UI or report output changes.

## Logging & Data Handling
`vite-plugin-logger` duplicates runtime logs into `logs/console.log`; avoid leaving debug statements in production code and clear the log after verifying fixes. Protect student privacy by keeping sample spreadsheets/photos in `student-group-ref/` and `docs/`; never commit real data. When exporting reports for review, share redacted artifacts or regenerate from the published template.
