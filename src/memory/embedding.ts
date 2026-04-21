// Simple embedding — converts text to a number vector
// Not real AI embedding, but works for similarity matching
export function createEmbedding(text: string): number[] {
    const vector: number[] = new Array(50).fill(0);

    for (let i = 0; i < text.length; i++) {
        vector[i % 50] += text.charCodeAt(i);
    }

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => magnitude > 0 ? val / magnitude : 0);
}