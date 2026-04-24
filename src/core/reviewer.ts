import { analyzeCode } from "../llm/llmClient";
import { analyzeAST } from "../analysis/astAnalyzer";
import { storeIssue, getRelevantMemory } from "../memory/memoryManager";

export interface Issue {
    line: number;
    severity: "low" | "medium" | "high";
    type: "bug" | "performance" | "security" | "readability" | "architecture";

    // Beginner-friendly fields
    title?: string;
    message: string;
    why?: string;
    fix?: string;
    fixedCode?: string;

    // backward compatibility
    suggestion?: string;
}
function normalizeASTIssues(astIssues: any[]): Issue[] {
    return astIssues.map(issue => ({
        line: issue.line,
        severity: issue.severity || "medium",

        type: (["bug", "performance", "security", "readability", "architecture"]
            .includes(issue.type)
            ? issue.type
            : "readability") as Issue["type"],

        title: issue.title || "Code Issue",
        message: issue.message || "Issue detected",
        fix: issue.suggestion || "Review and fix manually",
        suggestion: issue.suggestion || "",
    }));
}
/**
 * Safely extract JSON from LLM response
 */
function extractJSON(text: string): { issues: Issue[] } {
    try {
        return JSON.parse(text);
    } catch (err) {
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]);
            }
        } catch {}
        console.warn("⚠️ Failed to parse AI JSON:", text);
        return { issues: [] };
    }
}

/**
 * Merge AST + AI issues
 * - Removes duplicates
 * - Gives priority to AST (more reliable)
 */
function mergeIssues(astIssues: Issue[], aiIssues: Issue[]): Issue[] {
    const map = new Map<string, Issue>();

    // First insert AST issues (higher priority)
    astIssues.forEach(issue => {
        const key = `${issue.line}-${issue.message}`;
        map.set(key, issue);
    });

    // Then insert AI issues only if not duplicate
    aiIssues.forEach(issue => {
        const key = `${issue.line}-${issue.message}`;
        if (!map.has(key)) {
            map.set(key, issue);
        }
    });

    return Array.from(map.values());
}


/**
 * Main review pipeline
 */
export async function getAIReview(
    code: string,
    language: string
): Promise<Issue[]> {

    try {
        if (!code || code.trim().length < 20) return [];

        console.log("🚀 Starting review pipeline...");

        // 🔹 Layer 1: AST Analysis
        const rawASTIssues = analyzeAST(code);
       const astIssues = normalizeASTIssues(rawASTIssues);
        console.log(`⚡ AST Issues: ${astIssues.length}`);

        // 🔹 Layer 2: Memory retrieval
        const pastMistakes = getRelevantMemory(code);
        console.log(`🧠 Memory retrieved: ${pastMistakes.length}`);

        // 🔹 Layer 3: AI Analysis
        let aiIssues: Issue[] = [];

        try {
            const raw = await analyzeCode(code, language, pastMistakes);
            const parsed = extractJSON(raw);
            aiIssues = parsed.issues || [];
            console.log(`🤖 AI Issues: ${aiIssues.length}`);
        } catch (err) {
            console.error("❌ AI failed, using AST only");
        }

        // 🔹 Layer 4: Merge + Deduplicate
        const finalIssues = mergeIssues(astIssues, aiIssues);
        console.log(`🧩 Total merged issues: ${finalIssues.length}`);

        // 🔹 Layer 5: Store only meaningful issues
        finalIssues
            .filter(issue => issue.severity === "high" || issue.severity === "medium")
            .forEach(issue => {
    storeIssue({
        line: issue.line,
        message: issue.message,
        suggestion: issue.suggestion || issue.fix || "",
        severity: issue.severity,
        type: issue.type
    });
});

        console.log("💾 Stored important issues to memory");

        return finalIssues;

    } catch (error) {
        console.error("❌ Review pipeline failed:", error);
        return [];
    }
}