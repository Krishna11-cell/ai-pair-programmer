import * as vscode from "vscode";
import { getAIReview, Issue } from "../core/reviewer";

export function activateHover(context: vscode.ExtensionContext) {

    context.subscriptions.push(
        vscode.languages.registerHoverProvider("*", {

            async provideHover(document, position) {

                const language = document.languageId;
                const fullCode = document.getText();

                const issues: Issue[] = await getAIReview(fullCode, language);

                const line = position.line + 1;
                const issue = issues.find(i => i.line === line);

                if (!issue) {
                    return;
                }

                const md = new vscode.MarkdownString();
                md.isTrusted = true;

                // 🔥 Title
                md.appendMarkdown(`### ⚠ ${issue.title || "Issue"}\n\n`);

                // 🔹 Explanation
                md.appendMarkdown(`**Explanation:**\n${issue.message}\n\n`);

                // 🔹 Why
                if (issue.why) {
                    md.appendMarkdown(`**Why this matters:**\n${issue.why}\n\n`);
                }

                // 🔹 Fix steps
                if (issue.fix) {
                    md.appendMarkdown(`**How to fix:**\n${issue.fix}\n\n`);
                }

                // 🔹 Code Fix
                if (issue.fixedCode) {
                    md.appendMarkdown(
                        `**✔ Suggested Fix:**\n\`\`\`${language}\n${issue.fixedCode}\n\`\`\`\n`
                    );
                }

                return new vscode.Hover(md);
            }
        })
    );
}