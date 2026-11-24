# Security policy

Magistro stores API keys, sign-in tokens, chats, and learning records locally on your machine, and its agent reads files and fetches web content on your behalf. If you discover a security vulnerability, please report it privately before public disclosure.

## Reporting a vulnerability

**Do not open a public issue or pull request for a security vulnerability.**

Report security issues privately via GitHub's private vulnerability reporting on `https://github.com/FreshMedlar/Magistro/security/advisories/new` (or contact the repository maintainer directly).

Please include:

- the Magistro version and your OS;
- what an attacker can do and what preconditions are required;
- steps to reproduce or a minimal proof of concept;
- any suggested mitigation.

## Supported versions

Only the latest release receives security fixes.

## Scope

In scope:

- the desktop app (Electron shell, window, and IPC);
- the local Next.js API server;
- the agent and its tools (prompt injection leading to unauthorized reads/writes/requests);
- rendered demos, figures, and markdown;
- the release/update configuration.

Out of scope:

- attacks that already require running arbitrary code as your OS user;
- vulnerabilities in third-party model providers or upstream APIs.
