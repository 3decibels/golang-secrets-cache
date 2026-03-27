# AGENTS.md

This file provides essential context, architectural rules, and technical boundaries for AI coding agents and assistants working on the `secrets-cache` project.

## Project Overview

`secrets-cache` is a secure, single-use secret sharing application. 
- **Backend**: Golang (Standard Library)
- **Frontend**: Mithril.js + Vanilla CSS (No build step)
- **Primary Flow**: A user submits a plaintext secret. The backend automatically generates a 16-byte `token` and a 256-bit AES `key`, encrypts the payload using `crypto/aes` (AES-GCM), and caches it ephemerally in a `sync.Map`. The client receives a URL containing the `token` and `key` inside the hash fragment. When the receiver clicks the link, the backend retrieves the cipher and **permanently deletes it from memory**. It returns the raw encrypted payload, which the Mithril.js frontend then decrypts locally using the Web Crypto API.

## Strict Guidelines & Conventions

### Backend (Golang)
- **Zero Dependencies**: Stick precisely to the Go standard library (`net/http`, `crypto/cipher`, `crypto/aes`, `crypto/rand`, etc.). Do not run `go get` or introduce new dependencies to `go.mod` unless explicitly permitted.
- **In-Memory Storage**: The system is designed to be ephemeral. Stick to thread-safe structs like `sync.Map` for storing the encrypted payloads. No persistent databases (SQL/NoSQL) should be introduced.
- **Security Protocols**: 
  - Never log plaintext secrets or AES encryption keys in the server console or files.
  - The API methods that submit or retrieve secrets should operate strictly over POST requests. The decryption `key` must never be sent to the backend during retrieval.

### Frontend (Mithril.js & HTML/CSS)
- **No Node.js Build Steps**: The frontend heavily avoids modern Javascript bundlers (Webpack, Vite) or package managers (NPM). Mithril.js is imported directly via CDN in `index.html`. 
- **Maintain Current Tech Choices**: Do NOT introduce React, Vue, Svelte, or Tailwind CSS. Write pure vanilla Javascript in `app.js` and vanilla CSS in `style.css`.
- **Routing Rules**: Keep the sensitive decryption `key` within the URL hash fragment (i.e., `/#!/secret/:token/:key`). This ensures the exact key string doesn't get swept into standard access logs when clients click the link.
- **Aesthetic**: The application targets a premium, dark-mode aesthetic with smooth animations. Maintain uncluttered and clean UI updates when modifying styles.

## Directory Structure

- `/` : Core Go server files including the entry point (`main.go`) and the cryptography helpers (`crypto.go`).
- `/public/` : The directory served by the `net/http` FileServer. Contains the frontend SPA (`index.html`, `app.js`, `style.css`).

## Running and Testing

- The application can be started directly without compiling by running: `go run main.go crypto.go`
- The server will be accessible at `http://localhost:8080`.
