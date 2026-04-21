import { analyzeCode } from "../llm/llmClient";
import { analyzeAST } from "../analysis/astAnalyzer";
import { storeIssue, getRelevantMemory } from "../memory/memoryManager";

export interface Issue {
    line: number;
    severity: string;
    type: string;
    message: string;
    suggestion: string;
}

function extractJSON(text: string): { issues: Issue[] } {
    try {
        return JSON.parse(text);
    } catch {
        try {
            const match = text.match(/\{[\s\S]*\}/);
            return match ? JSON.parse(match[0]) : { issues: [] };
        } catch {
            return { issues: [] };
        }
    }
}

export async function getAIReview(
    code: string,
    language: string
): Promise<Issue[]> {
    try {
        if (code.trim().length < 20) return [];

        console.log("--- Starting full review pipeline ---");

        // Layer 1: AST (instant, structural)
        const astIssues = analyzeAST(code);
        console.log(`AST found: ${astIssues.length} issues`);

        // Layer 2: Memory retrieval
        const pastMistakes = getRelevantMemory(code);
        console.log(`Memory injecting: ${pastMistakes.length} past issues`);

        // Layer 3: AI review (intelligent)
        const raw = await analyzeCode(code, language, pastMistakes);
        const parsed = extractJSON(raw);
        const aiIssues = parsed.issues || [];
        console.log(`AI found: ${aiIssues.length} issues`);

        // Layer 4: Merge all results
        const allIssues: Issue[] = [
            ...astIssues,
            ...aiIssues
        ];

        // Layer 5: Store everything to memory
        allIssues.forEach(issue => storeIssue(issue));
        console.log(`Total issues: ${allIssues.length} | Stored to memory`);

        return allIssues;

    } catch (error) {
        console.error("Review pipeline failed:", error);
        return [];
    }
}