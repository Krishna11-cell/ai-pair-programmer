type MemoryItem = {
    id: string;
    text: string;
    vector: number[];
    timestamp: Date;
    issueType: string;
};

// In-memory store (lives during session)
const store: MemoryItem[] = [];
const MAX_STORE_SIZE = 100; // prevent memory bloat

function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

export function addToStore(
    text: string,
    vector: number[],
    issueType: string
): void {
    // Avoid duplicate entries
    const duplicate = store.find(item => item.text === text);
    if (duplicate) return;

    store.push({
        id: Date.now().toString(),
        text,
        vector,
        timestamp: new Date(),
        issueType
    });

    // Keep store size under limit
    if (store.length > MAX_STORE_SIZE) {
        store.shift(); // remove oldest
    }

    console.log(`Memory store size: ${store.length} items`);
}

export function searchStore(queryVector: number[], topK = 3): string[] {
    if (store.length === 0) return [];

    return store
        .map(item => ({
            text: item.text,
            score: cosineSimilarity(queryVector, item.vector)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter(item => item.score > 0.5) // only relevant results
        .map(item => item.text);
}

export function getStoreSize(): number {
    return store.length;
}