# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in AI Pair Programmer, please do NOT open a public issue. Instead, report it privately by contacting the repository owner through GitHub.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Scope

This extension analyzes code locally and sends code snippets to the Groq API for review. The following are in scope:
- API key handling and storage
- Code data transmission
- Memory store persistence
- Extension permissions

## API Key Safety

- The extension reads the Groq API key from a `.env` file in the project root
- Never commit your `.env` file — it is included in `.gitignore`
- The API key is only used to authenticate with Groq's API

## Best Practices

- Keep your Groq API key secret
- Rotate API keys periodically
- Use environment-specific API keys when possible

## Supported Versions

| Version | Supported |
|---|---|
| >= 1.0.0 | ✅ |
| < 1.0.0 (pre-release) | ❌ |
