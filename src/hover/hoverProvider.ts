import * as vscode from 'vscode';

export function createHoverProvider(): vscode.Disposable {
    return vscode.languages.registerHoverProvider(
        ['javascript', 'typescript', 'python', 'java', 'cpp', 'c'],
        {
            provideHover(document, position) {

                // Get all diagnostics for this file
                const diagnostics = vscode.languages
                    .getDiagnostics(document.uri)
                    .filter(d => d.source === 'AI Pair Programmer');

                // Find diagnostic at current cursor position
                const diagnostic = diagnostics.find(d =>
                    d.range.contains(position)
                );

                if (!diagnostic) {
                    return null;
                }

                // Parse the message — format is:
                // "[TYPE] message — Fix: suggestion"
                const fullMessage = diagnostic.message;

                // Build a rich markdown tooltip
                const markdown = new vscode.MarkdownString();
                markdown.isTrusted = true;
                markdown.supportHtml = true;

                // Severity icon
                const icon = diagnostic.severity === vscode.DiagnosticSeverity.Error
                    ? '$(error)'
                    : diagnostic.severity === vscode.DiagnosticSeverity.Warning
                    ? '$(warning)'
                    : '$(info)';

                // Split message and fix suggestion
                const parts = fullMessage.split(' — Fix: ');
                const message = parts[0] || fullMessage;
                const fix = parts[1] || null;

                // Build tooltip content
                markdown.appendMarkdown(`**${icon} AI Pair Programmer**\n\n`);
                markdown.appendMarkdown(`---\n\n`);
                markdown.appendMarkdown(`${message}\n\n`);

                if (fix) {
                    markdown.appendMarkdown(`**Suggested fix:**\n\n`);
                    markdown.appendMarkdown(`\`\`\`\n${fix}\n\`\`\`\n\n`);
                }

                // Add severity badge
                const severityLabel =
                    diagnostic.severity === vscode.DiagnosticSeverity.Error ? '🔴 High severity' :
                    diagnostic.severity === vscode.DiagnosticSeverity.Warning ? '🟡 Medium severity' :
                    '🔵 Low severity';

                markdown.appendMarkdown(`*${severityLabel}*`);

                return new vscode.Hover(markdown, diagnostic.range);
            }
        }
    );
}