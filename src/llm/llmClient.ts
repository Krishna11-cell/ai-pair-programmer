import * as dotenv from 'dotenv';
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });
console.log("ENV KEY:", process.env.GROQ_API_KEY);

import Groq from "groq-sdk";

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});
export async function analyzeCode(
    code: string,
    language: string,
    pastMistakes: string[]
): Promise<string> {

    const memorySection = pastMistakes.length > 0
        ? `Past mistakes this developer makes (pay extra attention to these):
${pastMistakes.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
        : `No past mistakes recorded yet.`;

    const prompt = `You are a strict but beginner-friendly senior software engineer.

${memorySection}

Your job is to review the code and give actionable feedback.

IMPORTANT:
- Explain everything in SIMPLE English
- Assume the developer is a beginner
- Avoid complex technical jargon
- Be clear, short, and practical

Return ONLY valid JSON:

{
  "issues": [
    {
      "line": <number>,
      "severity": "low" | "medium" | "high",
      "type": "bug" | "performance" | "security" | "readability" | "architecture",
      "title": "<short issue name>",
      "message": "<simple explanation>",
      "why": "<why this is a problem in simple terms>",
      "fix": "<step-by-step instructions>",
      "fixedCode": "<correct improved code>"
    }
  ]
}

Rules:
- No technical jargon
- Use simple words
- Explain like teaching a beginner
- Keep sentences short
- Suggest clean and modern practices

Language: ${language}
Environment: Node.js

Code:
${code}`;

    const response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0
    });

    return response.choices[0].message.content || '{"issues": []}';
}