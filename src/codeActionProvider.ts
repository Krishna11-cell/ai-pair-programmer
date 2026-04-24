import * as vscode from "vscode";
import type { Issue } from "./core/reviewer";

export class AIQuickFixProvider implements vscode.CodeActionProvider {

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext
    ) {
        const actions: vscode.CodeAction[] = [];

        context.diagnostics.forEach(diag => {

            const issue = (diag as any).data as Issue;

            if (!issue || !issue.fixedCode) {
    return;
}

            const fix = new vscode.CodeAction(
                `Fix: ${issue.title || "Apply suggestion"}`,
                vscode.CodeActionKind.QuickFix
            );

            fix.edit = new vscode.WorkspaceEdit();

            const line = issue.line - 1;

            if (line >= 0 && line < document.lineCount) {
                const lineRange = document.lineAt(line).range;

                fix.edit.replace(
                    document.uri,
                    lineRange,
                    issue.fixedCode
                );
            }

            fix.diagnostics = [diag];
            actions.push(fix);
        });

        return actions;
    }
}