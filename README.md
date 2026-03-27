# Secure One-Time Secret Sharing

A minimalist, secure web application for sharing secrets that can only be retrieved **once**. Built with a Golang backend and a clean, dark-mode Mithril.js frontend.

## Features

- **One-Time Retrieval**: Secrets are instantly and permanently deleted from the server the moment they are successfully viewed.
- **AES-GCM Encryption**: Payloads are encrypted and decrypted in the Go backend using cryptographically secure 256-bit AES-GCM keys.
- **In-Memory Storage**: Data is never written to disk. All encrypted secrets live ephemerally in server memory (`sync.Map`).
- **Zero Frontend Build Steps**: Uses pure CSS and Mithril.js (loaded via CDN) for an elegant Single Page Application without any heavy `node_modules` or bundlers.
- **Client-Side Routing Privacy**: Access keys are placed in the URL hash fragment (`/#!/secret/{token}/{key}`), which means the sensitive `key` is not sent to the server in standard HTTP GET requests when sharing links.

## How It Works

1. **Creation**: The user types a secret in the web interface and submits it.
2. **Encryption**: The Golang backend generates a random 16-byte identification `token` and a 256-bit AES encryption `key`. It encrypts the plaintext payload and caches it in memory keyed by the `token`.
3. **Sharing**: The backend returns the `token` and `key` back to the frontend, producing a shareable URL containing both. 
4. **Retrieval**: When a receiver navigates to the URL, the client reads the `token` and `key` from the URL. It calls the backend retrieval hook via `POST` with these variables. The backend fetches the payload, **deletes it immediately**, and decrypts it with the `key` to return the plaintext. Any subsequent requests will result in an error.

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
