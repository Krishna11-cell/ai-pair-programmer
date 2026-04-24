import * as vscode from "vscode";
import type { Issue } from "./core/reviewer";

export const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("ai-review");

export function updateDiagnostics(
    document: vscode.TextDocument,
    issues: Issue[]
) {
    const diagnostics: vscode.Diagnostic[] = [];

    issues.forEach(issue => {
        const line = issue.line - 1;

        if (line < 0 || line >= document.lineCount) return;

        const range = document.lineAt(line).range;

        const severity =
            issue.severity === "high"
                ? vscode.DiagnosticSeverity.Error
                : issue.severity === "medium"
                ? vscode.DiagnosticSeverity.Warning
                : vscode.DiagnosticSeverity.Information;

        const diagnostic = new vscode.Diagnostic(
            range,
            issue.message,
            severity
        );

        // 🔥 attach full issue data
        (diagnostic as any).data = issue;

        diagnostics.push(diagnostic);
    });

    diagnosticCollection.set(document.uri, diagnostics);
}