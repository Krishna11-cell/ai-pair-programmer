import { createEmbedding } from "./embedding";
import { addToStore, searchStore, getStoreSize } from "./vectorStore";
export interface StoredIssue {
    message: string;
    suggestion: string;
    type: string;
    severity: string;
}

// Save an issue into memory
export function storeIssue(issue: StoredIssue): void {
    const text = `[${issue.type}] ${issue.message} | Fix: ${issue.suggestion}`;
    const vector = createEmbedding(text);
    addToStore(text, vector, issue.type);
}

// Get relevant past issues for current code
export function getRelevantMemory(code: string): string[] {
    const vector = createEmbedding(code);
    const results = searchStore(vector);

    console.log(`Found ${results.length} relevant memories (store size: ${getStoreSize()})`);
    return results;
}

// Format memory for prompt injection
export function formatMemoryForPrompt(memories: string[]): string {
    if (memories.length === 0) {
        return "No past mistakes recorded yet. Analyze code normally.";
    }

    return memories
        .map((m, i) => `${i + 1}. ${m}`)
        .join('\n');
}