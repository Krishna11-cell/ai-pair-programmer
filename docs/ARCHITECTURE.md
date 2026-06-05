# Architecture

## System Overview

AI Pair Programmer follows a **multi-layer pipeline architecture** within the VS Code extension host. Each layer serves a distinct purpose and the pipeline degrades gracefully if any layer fails.

```
┌─────────────────────────────────────────────────────────────┐
│                  VS Code Extension Host                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              extension.ts (Entry Point)              │   │
│  │  ┌────────────────┐  ┌───────────────────────────┐   │   │
│  │  │  Save Listener  │  │  Debounce Map (1.5s/file) │   │   │
│  │  │ (onDidSaveText  │  │  Prevents rapid re-review │   │   │
│  │  │  Document)      │  │  on repeated saves        │   │   │
│  │  └───────┬─────────┘  └───────────────────────────┘   │   │
│  └──────────┼────────────────────────────────────────────┘   │
│             │                                                │
│  ┌──────────▼────────────────────────────────────────────┐   │
│  │              core/reviewer.ts (Pipeline)              │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │  Layer 1: AST Static Analysis (astAnalyzer.ts)  │  │   │
│  │  │  - Parses code with Babel                       │  │   │
│  │  │  - Traverses AST with 7 rule visitors           │  │   │
│  │  │  - Returns structured Issue objects             │  │   │
│  │  └─────────────────────┬───────────────────────────┘  │   │
│  │                        │                               │   │
│  │  ┌─────────────────────▼───────────────────────────┐  │   │
│  │  │  Layer 2: Memory Retrieval (memoryManager.ts)   │  │   │
│  │  │  - Creates embedding vector of current code     │  │   │
│  │  │  - Searches vector store via cosine similarity  │  │   │
│  │  │  - Returns top-3 relevant past issues (>.5)     │  │   │
│  │  └─────────────────────┬───────────────────────────┘  │   │
│  │                        │                               │   │
│  │  ┌─────────────────────▼───────────────────────────┐  │   │
│  │  │  Layer 3: AI LLM Review (llmClient.ts)          │  │   │
│  │  │  - Builds prompt with code + memory context     │  │   │
│  │  │  - Calls Groq llama-3.3-70b-versatile API       │  │   │
│  │  │  - Parses JSON response with regex fallback     │  │   │
│  │  └─────────────────────┬───────────────────────────┘  │   │
│  │                        │                               │   │
│  │  ┌─────────────────────▼───────────────────────────┐  │   │
│  │  │  Layer 4: Merge & Deduplicate (mergeIssues())   │  │   │
│  │  │  - AST issues take priority (more reliable)     │  │   │
│  │  │  - Deduplicates by line+message key             │  │   │
│  │  │  - AI supplements where AST has no findings     │  │   │
│  │  └─────────────────────┬───────────────────────────┘  │   │
│  │                        │                               │   │
│  │  ┌─────────────────────▼───────────────────────────┐  │   │
│  │  │  Layer 5: Store to Memory                       │  │   │
│  │  │  - Filters high/medium severity issues          │  │   │
│  │  │  - Persists to data/memory.json (FIFO, max 100) │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  └──────────────────────┬─────────────────────────────────┘   │
│                         │                                     │
│  ┌──────────────────────▼─────────────────────────────────┐   │
│  │              Display Layer                             │   │
│  │                                                         │   │
│  │  diagnostics.ts    hoverProvider.ts    codeAction       │   │
│  │  (Underlines)      (Hover tooltips)    Provider.ts      │   │
│  │                                        (Ctrl+.)         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User saves file
      │
      ▼
extension.ts intercepts onDidSaveTextDocument
      │
      ├── Checks language support (JS/TS/PY/JAVA/CPP/C)
      ├── Checks code length (> 20 chars)
      └── Invokes debounced review function
              │
              ▼
      core/reviewer.ts orchestrates pipeline
              │
              ├── 1. analyzeAST(code)
              │       └── Babel parse → traverse → ASTIssue[]
              │
              ├── 2. getRelevantMemory(code)
              │       └── createEmbedding → searchStore → string[]
              │
              ├── 3. analyzeCode(code, language, pastMistakes)
              │       └── Build prompt → Groq API → parse JSON → Issue[]
              │
              ├── 4. mergeIssues(astIssues, aiIssues)
              │       └── Dedup by line+message → Issue[]
              │
              ├── 5. storeIssue(high/medium severity issues)
              │       └── createEmbedding → addToStore → persist
              │
              └── Return finalIssues
                      │
                      ▼
              extension.ts receives issues
                      │
                      ├── updateDiagnostics(document, issues)
                      │       └── diagnosticCollection.set(uri, diagnostics)
                      │
                      └── Issues available for hover & quick fix
```

## Key Design Decisions

### Pipeline Pattern
Sequential processing ensures each layer can be developed, tested, and maintained independently.

### Debouncing
Each file URI gets its own debounced function (1500ms delay). This prevents:
- Multiple reviews when a file is saved rapidly
- Cross-file interference

### Degradation Strategy
If the AI/LLM call fails (network, API key, rate limit), the pipeline falls back to AST-only analysis. The user always gets some feedback.

### AST Priority
AST-based issues are inserted first in the merge step, making them take priority over AI issues. This ensures basic correctness checks are always surfaced.

### Vector Memory
Uses a simple character-code embedding (sum of char codes modulo 50, normalized to unit length) rather than real AI embeddings. This is:
- ✅ Self-contained (no external API calls)
- ✅ Fast (O(n) computation)
- ❌ Less accurate than real embeddings
- ✅ Sufficient for approximate similarity matching

### Diagnostic Data Passing
The full Issue object (including `fixedCode`) is attached to VS Code `Diagnostic` objects via `(diagnostic as any).data`. This enables the Quick Fix provider to access fix code without a separate storage mechanism.

## Component Details

### extension.ts — Entry Point
- Registers save listener, hover provider, and code action provider
- Manages debounce map per file URI
- Runs static regex checks (var, console.log, TODO, eval, empty catch, secrets)

### astAnalyzer.ts — Static Analysis
- Uses `@babel/parser` with `errorRecovery: true` (parses even with syntax errors)
- Plugins: TypeScript, JSX
- 7 rule visitors: Function, CallExpression, TSAnyKeyword, IfStatement, BinaryExpression, VariableDeclaration

### llmClient.ts — AI Interface
- Loads API key from `.env` via dotenv
- Builds comprehensive prompt with code context and memory recall
- Temperature: 0 (deterministic output)
- Model: `llama-3.3-70b-versatile`
- Falls back to `{"issues": []}` on parse failure

### vectorStore.ts — Memory Engine
- In-memory array backed by `data/memory.json` for persistence
- Maximum 100 items (FIFO eviction)
- Cosine similarity with 0.5 threshold for relevance filtering
- Top-3 results returned for prompt context
