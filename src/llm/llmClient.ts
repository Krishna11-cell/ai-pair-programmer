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

//     const prompt = `You are a strict but beginner-friendly senior software engineer.

// ${memorySection}

// Your job is to review the code and give actionable feedback.

// IMPORTANT:
// - Explain everything in SIMPLE English
// - Assume the developer is a beginner
// - Avoid complex technical jargon
// - Be clear, short, and practical

// Return ONLY valid JSON:

// {
//   "issues": [
//     {
//       "line": <number>,
//       "severity": "low" | "medium" | "high",
//       "type": "bug" | "performance" | "security" | "readability" | "architecture",
//       "title": "<short issue name>",
//       "message": "<simple explanation>",
//       "why": "<why this is a problem in simple terms>",
//       "fix": "<step-by-step instructions>",
//       "fixedCode": "<correct improved code>"
//     }
//   ]
// }

// Rules:
// - No technical jargon
// - Use simple words
// - Explain like teaching a beginner
// - Keep sentences short
// - Suggest clean and modern practices

// Language: ${language}
// Environment: Node.js

// Code:
// ${code}`;
const prompt = `You are a strict senior software engineer reviewing code written by a beginner developer.

Your job is to identify real problems and explain them clearly so that a beginner can understand and fix them easily.

${memorySection}

Return ONLY valid JSON (no explanation outside JSON):

{
  "issues": [
    {
      "line": <number>,
      "severity": "low" | "medium" | "high",
      "type": "bug" | "performance" | "security" | "readability" | "architecture",
      "title": "<short issue title>",
      "message": "<simple explanation in beginner-friendly language>",
      "why": "<why this is a problem in real-world terms>",
      "fix": "<step-by-step instructions to fix it>",
      "fixedCode": "<improved code snippet>"
    }
  ]
}

RULES:
- Be strict and realistic (like a senior engineer), but NOT rude
- Use simple, clear language (assume beginner level)
- Do NOT use complex jargon unless necessary
- Keep explanations short but helpful
- Always explain WHAT is wrong and HOW to fix it
- If possible, give a better version of the code
- If a mistake matches past mistakes, mark it as "high" severity

CHECK FOR:
- Bugs and logic errors
- Undefined variables
- Performance issues (nested loops, repeated work)
- Bad practices (console.log, var, deep nesting)
- Security issues (hardcoded passwords, API keys, eval)
- Code readability (naming, duplication, long functions)

Language: ${language}
Environment: Node.js / General programming

Code to review:
${code}
`;

    const response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0
    });

    return response.choices[0].message.content || '{"issues": []}';
}