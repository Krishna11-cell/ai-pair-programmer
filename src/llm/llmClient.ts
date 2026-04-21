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

    const prompt = `You are a strict senior software engineer at a top tech company.

${memorySection}

Your job is to review the code below and provide precise, actionable feedback.

Return ONLY valid JSON — no text outside, no markdown, no backticks:

{
  "issues": [
    {
      "line": <integer line number>,
      "severity": "low" or "medium" or "high",
      "type": "bug" or "performance" or "security" or "readability" or "architecture",
      "message": "<clear explanation of the problem>",
      "suggestion": "<exact fix or improved code snippet>"
    }
  ]
}

Rules:
- Return ONLY the JSON object
- Be strict and critical
- Do not praise the code
- Focus on real issues only
- If you see a past mistake repeated, mark it as high severity
- Suggest better patterns where possible

Check for:
- Bugs and logical errors
- Performance issues (loops, memory, complexity)
- Bad naming conventions
- Code smells (long functions, deep nesting, dead code)
- Security issues (hardcoded secrets, eval, injection)
- Non-standard practices

Language: ${language}
Environment: Node.js

Code to review:
${code}`;

    const response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0
    });

    return response.choices[0].message.content || '{"issues": []}';
}