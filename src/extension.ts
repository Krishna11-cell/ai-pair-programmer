import * as vscode from 'vscode';
import { getAIReview } from './core/reviewer';
import { activateHover } from './hover/hoverProvider';
import { updateDiagnostics } from './diagnostics';
import { debounce } from 'lodash';
import { AIQuickFixProvider } from './codeActionProvider';

const SUPPORTED_LANGUAGES = [
    'javascript', 'typescript',
    'python', 'java', 'cpp', 'c'
];

// 🔹 Per-file debounce map
const debounceMap = new Map<string, any>();

function getDebouncedReview(document: vscode.TextDocument) {
    const key = document.uri.toString();

    if (!debounceMap.has(key)) {
        debounceMap.set(
            key,
            debounce(async () => {
                await reviewCode(document);
            }, 1500)
        );
    }

    return debounceMap.get(key);
}

export function activate(context: vscode.ExtensionContext) {

    console.log('✅ AI Pair Programmer Activated');

    // 🔹 Hover Provider
    activateHover(context);

    // 🔹 Save Listener (main trigger)
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {

        if (!SUPPORTED_LANGUAGES.includes(document.languageId)) {
            return;
        }

        const code = document.getText();
        if (code.trim().length < 20) {
            return;
        }

        console.log("🚀 Triggering review for:", document.fileName);

        getDebouncedReview(document)();
    });

    context.subscriptions.push(saveListener);

    // 🔹 Quick Fix Provider (Ctrl + .)
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            "*",
            new AIQuickFixProvider(),
            {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
            }
        )
    );
}

async function reviewCode(document: vscode.TextDocument) {

    const code = document.getText();
    const language = document.languageId;

    const diagnostics: vscode.Diagnostic[] = [];

    const statusBar = vscode.window.setStatusBarMessage(
        '$(sync~spin) AI reviewing code...'
    );

    try {
        // 🔹 1. Run Static Checks
        runStaticChecks(document, code, diagnostics);

        // 🔹 2. AI + AST Review
        const issues = await getAIReview(code, language);

        issues.forEach(issue => {

            const lineIndex = Math.max(0, (issue.line || 1) - 1);
            if (lineIndex >= document.lineCount) {
                return;
            }

            const line = document.lineAt(lineIndex);

            const range = new vscode.Range(
                new vscode.Position(lineIndex, 0),
                new vscode.Position(lineIndex, line.text.length)
            );

            let severity = vscode.DiagnosticSeverity.Warning;

            if (issue.severity === 'high') {
                severity = vscode.DiagnosticSeverity.Error;
            } else if (issue.severity === 'low') {
                severity = vscode.DiagnosticSeverity.Information;
            }

            const message =
                `[${(issue.type || 'review').toUpperCase()}] ${issue.message}`;

            const diagnostic = new vscode.Diagnostic(range, message, severity);

            diagnostic.source = 'AI Pair Programmer';

            // 🔥 IMPORTANT: attach full issue for Quick Fix
            
            (diagnostic as any).data = issue;
            diagnostics.push(diagnostic);
        });

        // 🔹 3. Update Diagnostics (underline in editor)
        updateDiagnostics(document, issues);

        vscode.window.setStatusBarMessage(
            `$(check) AI Review complete — ${issues.length} issue(s) found`,
            4000
        );

    } catch (error) {
        console.error('❌ Review failed:', error);
        vscode.window.showErrorMessage('AI Review failed. Check logs.');
    } finally {
        statusBar.dispose();
    }
}

function runStaticChecks(
    document: vscode.TextDocument,
    code: string,
    diagnostics: vscode.Diagnostic[]
) {

    const lines = code.split('\n');

    lines.forEach((lineText, lineIndex) => {

        if (/\bvar\s+/.test(lineText)) {
            addDiagnostic(document, diagnostics, lineIndex,
                lineText.indexOf('var'),
                "Avoid 'var'. Use 'let' or 'const'.",
                vscode.DiagnosticSeverity.Warning);
        }

        if (/console\.log\(/.test(lineText)) {
            addDiagnostic(document, diagnostics, lineIndex,
                lineText.indexOf('console.log'),
                "Remove console.log before production.",
                vscode.DiagnosticSeverity.Information);
        }

        if (/\/\/\s*TODO/i.test(lineText)) {
            addDiagnostic(document, diagnostics, lineIndex, 0,
                "TODO found — complete before release.",
                vscode.DiagnosticSeverity.Hint);
        }

        if (/catch\s*\(.*\)\s*\{\s*\}/.test(lineText)) {
            addDiagnostic(document, diagnostics, lineIndex,
                lineText.indexOf('catch'),
                "Empty catch block — handle the error.",
                vscode.DiagnosticSeverity.Warning);
        }

        if (/eval\s*\(/.test(lineText)) {
            addDiagnostic(document, diagnostics, lineIndex,
                lineText.indexOf('eval'),
                "Avoid eval() — security risk.",
                vscode.DiagnosticSeverity.Error);
        }
    });
}

function addDiagnostic(
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[],
    lineIndex: number,
    charIndex: number,
    message: string,
    severity: vscode.DiagnosticSeverity
) {

    const line = document.lineAt(lineIndex);

    const range = new vscode.Range(
        new vscode.Position(lineIndex, charIndex),
        new vscode.Position(lineIndex, line.text.length)
    );

    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = 'AI Pair Programmer';

    diagnostics.push(diagnostic);
}

export function deactivate() {}