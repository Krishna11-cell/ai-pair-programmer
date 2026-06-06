# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-06-06

### Changed
- Updated README installation section to show direct marketplace install as primary method

## [1.0.1] - 2026-06-05

### Changed
- Renamed extension display name to **CodeCritiq** for unique marketplace identity

## [1.0.0] - 2026-04-24

### Added
- **AST Static Analysis** — 7 Babel-based rules detecting long functions, empty functions, console.log, `any` type, deep nesting, loose equality, and `var` declarations
- **AI-Powered Code Review** — Integration with Groq's `llama-3.3-70b-versatile` model for intelligent code analysis
- **Inline Diagnostics** — Color-coded underlines (Error/Warning/Information) for all detected issues
- **Hover Explanations** — Rich tooltips with issue descriptions, why-it-matters, fix instructions, and AI-suggested fixed code
- **Quick Fix (Ctrl+.)** — One-click application of AI-generated code fixes via VS Code's lightbulb menu
- **Persistent Memory** — Vector similarity store using cosine similarity to remember past mistakes and flag repeat offenses
- **Static Regex Checks** — Detection of `var`, `console.log`, `TODO`, empty `catch` blocks, `eval()`, and hardcoded secrets
- **Multi-Language Support** — Activates for JavaScript, TypeScript, Python, Java, C++, and C
- **Per-File Debouncing** — 1.5-second debounce per file to prevent spurious reviews on rapid saves
- **Pipeline Architecture** — Multi-layer review (AST → Memory → AI → Merge → Display) with graceful degradation when AI is unavailable

### Changed
- Full review pipeline now prioritizes AST analysis (more reliable) over AI suggestions
- JSON extraction from LLM responses with regex fallback for robustness

### Fixed
- Graceful error handling when Groq API is unavailable (falls back to AST-only analysis)

## [0.0.1] - 2026-04-21

### Added
- Initial project scaffold
- Basic VS Code extension structure
- Extension activation and save event listener
