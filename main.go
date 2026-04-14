package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// GenerateRandomBytes returns securely generated random bytes.
func GenerateRandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

// In-memory store for our secrets
// Map key string -> struct { encryptedData []byte; createdAt time.Time }
var store sync.Map

// SecretItem represents a stored secret
type SecretItem struct {
	EncryptedData []byte
	CreatedAt     time.Time
}

type CreateRequest struct {
	EncryptedData string `json:"encrypted_data"`
}

type CreateResponse struct {
	Token string `json:"token"`
}

type RetrieveRequest struct {
	Token string `json:"token"`
}

type RetrieveResponse struct {
	EncryptedData string `json:"encrypted_data"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func sendError(w http.ResponseWriter, message string, status int) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

// handleCreateSecret securely generates a token and saves the provided encrypted payload.
func handleCreateSecret(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.EncryptedData == "" {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Decode the base64 encrypted data from the client
	encryptedData, err := base64.StdEncoding.DecodeString(req.EncryptedData)
	if err != nil {
		sendError(w, "Invalid base64 payload", http.StatusBadRequest)
		return
	}

	// Generate 16-byte token for identification
	tokenBytes, err := GenerateRandomBytes(16)
	if err != nil {
		sendError(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	tokenHex := hex.EncodeToString(tokenBytes)

	// Store in memory
	store.Store(tokenHex, SecretItem{
		EncryptedData: encryptedData,
		CreatedAt:     time.Now(),
	})

	// Return token
	resp := CreateResponse{
		Token: tokenHex,
	}
	json.NewEncoder(w).Encode(resp)
}

// handleRetrieveSecret fetches the secret, decrypts it, and deletes it from storage.
func handleRetrieveSecret(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RetrieveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Attempt to load from store
	item, ok := store.Load(req.Token)
	if !ok {
		sendError(w, "Secret not found or already viewed", http.StatusNotFound)
		return
	}

	// Immediately delete to ensure one-time retrieval
	store.Delete(req.Token)

	// Send back the base64 encrypted data
	secretItem := item.(SecretItem)
	b64Data := base64.StdEncoding.EncodeToString(secretItem.EncryptedData)

	resp := RetrieveResponse{
		EncryptedData: b64Data,
	}
	json.NewEncoder(w).Encode(resp)
}

func main() {
	port := flag.Int("port", 8080, "TCP port the server will bind to")
	flag.Parse()

	// API routes
	http.HandleFunc("/api/secret", handleCreateSecret)
	http.HandleFunc("/api/retrieve", handleRetrieveSecret)

	// Serve frontend from public directory
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	addr := fmt.Sprintf(":%d", *port)
	log.Printf("Server starting on http://localhost%s\n", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
