import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

export type ASTIssue = {
    line: number;
    severity: "low" | "medium" | "high";
    type: string;
    message: string;
    suggestion: string;
};

export function analyzeAST(code: string): ASTIssue[] {
    const issues: ASTIssue[] = [];

    try {
        const ast = parse(code, {
            sourceType: "module",
            plugins: ["typescript", "jsx"],
            errorRecovery: true
        });

        traverse(ast, {

            // Rule 1 — Function too long OR empty (merged into one visitor)
            Function(path) {
                const body = path.node.body;
                if (body && body.loc) {
                    const length = body.loc.end.line - body.loc.start.line;

                    // Too long
                    if (length > 30) {
                        issues.push({
                            line: body.loc.start.line,
                            severity: "medium",
                            type: "architecture",
                            message: `Function is too long (${length} lines). Hard to read and test.`,
                            suggestion: "Break it into smaller functions, each doing one thing."
                        });
                    }

                    // Empty body
                    if (body.type === "BlockStatement" && body.body.length === 0) {
                        issues.push({
                            line: path.node.loc?.start.line || 1,
                            severity: "low",
                            type: "readability",
                            message: "Empty function body found.",
                            suggestion: "Add implementation or remove the function if unused."
                        });
                    }
                }
            },

            // Rule 2 — console.log
            CallExpression(path) {
                const callee = path.node.callee;
                if (
                    callee.type === "MemberExpression" &&
                    callee.object.type === "Identifier" &&
                    callee.object.name === "console"
                ) {
                    issues.push({
                        line: path.node.loc?.start.line || 1,
                        severity: "low",
                        type: "readability",
                        message: "console.log found — remove before production.",
                        suggestion: "Use a proper logger like Winston or remove entirely."
                    });
                }
            },

            // Rule 3 — TypeScript any type
            TSAnyKeyword(path) {
                issues.push({
                    line: path.node.loc?.start.line || 1,
                    severity: "medium",
                    type: "bug",
                    message: "Avoid using 'any' type — defeats TypeScript's purpose.",
                    suggestion: "Replace with a specific type or define an interface."
                });
            },

            // Rule 4 — Deep nesting
            IfStatement(path) {
                let depth = 0;
                let current: any = path;
                while (current.parentPath) {
                    if (
                        current.parentPath.isIfStatement() ||
                        current.parentPath.isForStatement() ||
                        current.parentPath.isWhileStatement()
                    ) {
                        depth++;
                    }
                    current = current.parentPath;
                }
                if (depth >= 3) {
                    issues.push({
                        line: path.node.loc?.start.line || 1,
                        severity: "medium",
                        type: "readability",
                        message: `Deep nesting detected (${depth + 1} levels). Hard to follow.`,
                        suggestion: "Use early returns or extract logic into separate functions."
                    });
                }
            },

            // Rule 5 — == instead of ===
            BinaryExpression(path) {
                if (path.node.operator === "==" || path.node.operator === "!=") {
                    issues.push({
                        line: path.node.loc?.start.line || 1,
                        severity: "medium",
                        type: "bug",
                        message: `Loose equality '${path.node.operator}' can cause unexpected bugs.`,
                        suggestion: `Use '${path.node.operator}=' for strict equality instead.`
                    });
                }
            },

            // Rule 6 — var declaration
            VariableDeclaration(path) {
                if (path.node.kind === "var") {
                    issues.push({
                        line: path.node.loc?.start.line || 1,
                        severity: "low",
                        type: "readability",
                        message: "'var' is function-scoped and causes bugs.",
                        suggestion: "Use 'const' for fixed values, 'let' for changing ones."
                    });
                }
            }

        });

    } catch (error) {
        console.error("AST parsing failed:", error);
    }

    return issues;
}