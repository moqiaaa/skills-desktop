# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React + TypeScript UI (pages, layout components, Zustand store, i18n, shared types).
- `src-tauri/`: Rust backend commands, security scan logic, Tauri config, and platform packaging assets.
- `public/data/`: runtime marketplace data (`marketplace.json`).
- `release-data/`: release-time seed data and sample skills.
- `scripts/`: maintenance utilities (`update-version.js`, icon generation, skill download helpers).
- `docs/`: installation, upgrade, and release notes. CI/CD lives in `.github/workflows/`.

## Build, Test, and Development Commands
- `npm install`: install Node dependencies.
- `npm run dev`: start Vite frontend only.
- `npm run tauri:dev`: run desktop app in local development (frontend + Tauri).
- `npm run lint`: run ESLint across the repo.
- `npm run build`: type-check and build frontend assets.
- `npm run tauri:build`: produce production desktop bundles.
- `npm run tauri:build:windows` / `npm run tauri:build:mac`: platform-targeted bundles.
- `npm run version:update`: sync version metadata before release.

## Coding Style & Naming Conventions
- Frontend uses TypeScript, React function components, and Tailwind/DaisyUI.
- Follow existing formatting: 2-space indentation in TS/TSX, semicolons enabled, ES module imports.
- Component/page files use `PascalCase` (`Marketplace.tsx`); hooks use `useXxx` (`useSkillStore.ts`); helpers/types use `camelCase` exports.
- Rust follows standard conventions: `snake_case` functions, `PascalCase` structs/enums.
- Linting is authoritative; run `npm run lint` before opening a PR.

## Testing Guidelines
- There is no dedicated automated test suite yet.
- Minimum pre-PR checks: `npm run lint`, `npm run build`, and a manual `npm run tauri:dev` smoke test.
- Validate key flows manually: skill scan, marketplace install/import, settings path persistence, and security scan results.
- If you add tests, use `*.test.ts(x)` (frontend) and `*_test.rs` (Rust) naming.

## Commit & Pull Request Guidelines
- Current history favors short, imperative messages (for example: `fix install bug`, `update icon`, `ci: ...`).
- Prefer `<type>: <brief summary>` when possible (`fix: handle missing SKILL.md metadata`).
- PRs should include: purpose, scope, related issue(s), tested OS (Windows/macOS), and screenshots/GIFs for UI changes.
- Keep PRs focused; separate refactors, feature work, and release/version updates.

## Security & Configuration Tips
- Use `.env.example` as the template for local environment variables.
- Do not commit local logs (`.tauri-*.log`, `.vite*.log`) or generated build artifacts.
- For path-related features, verify behavior on both system-level and project-level `.claude/skills` directories.
