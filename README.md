# Secure One-Time Secret Sharing

A minimalist, secure web application for sharing secrets that can only be retrieved **once**. Built with a Golang backend and a clean, dark-mode Mithril.js frontend.

## WARNING

This project is an experiment in using AI to create a simple application. Although it uses the word `secure` in its name, it has not been vetted for security and should not be used for storing sensitive information. There are still many security considerations to address before it can be considered production-ready.

## Features

- **One-Time Retrieval**: Secrets are instantly and permanently deleted from the server the moment they are successfully viewed.
- **AES-GCM Encryption**: Payloads are End-to-End (E2E) encrypted. They are encrypted and safely decrypted directly in the browser via the Web Crypto API. The server operates as a completely zero-knowledge store and never sees the decrypted secret or the encryption key.
- **In-Memory Storage**: Data is never written to disk. All encrypted secrets live ephemerally in server memory (`sync.Map`).
- **Zero Frontend Build Steps**: Uses pure CSS and Mithril.js (loaded via CDN) for an elegant Single Page Application without any heavy `node_modules` or bundlers.
- **Client-Side Routing Privacy**: Access keys are placed in the URL hash fragment (`/#!/secret/{token}/{key}`), which means the sensitive `key` is not sent to the server in standard HTTP GET requests when sharing links.

## How It Works

1. **Creation**: The user types a secret in the web interface and submits it.
2. **Encryption**: The Mithril.js frontend generates a cryptographically secure 256-bit AES key and encrypts the payload natively in the browser using the Web Crypto API. It only sends the resulting ciphertext to the server.
3. **Sharing**: The Go backend stores the encrypted payload, generates a 16-byte `token` for retrieval, and returns it. The frontend pairs this `token` with its local `key` to produce a shareable URL. 
4. **Retrieval**: When a receiver navigates to the URL, the client reads the `token` and `key` from the URL. It calls the backend retrieval hook via `POST` with the token. The backend fetches the payload, **deletes it immediately**, and returns the base64 encrypted text to the client. The Mithril.js frontend then decrypts the payload natively using the Web Crypto API and the original key. Any subsequent requests will result in an error.

## Requirements

- [Go](https://go.dev/doc/install) (to build and run the server)

## Getting Started

### 1. Build and Run the Server

Open your terminal in the project directory and run:

```bash
# Build the binary
go build -o server.exe

# Run the executable
./server.exe
```

*Alternatively, you can skip the build step and run the code directly:*
```bash
go run main.go crypto.go
```

The server will initialize and begin listening on `http://localhost:8080`.

### 2. Access the Web App

Open your browser and navigate to [http://localhost:8080](http://localhost:8080) to start creating and sharing secure one-time links!
