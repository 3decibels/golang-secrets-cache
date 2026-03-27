package main

import (
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

// In-memory store for our secrets
// Map key string -> struct { encryptedData []byte; createdAt time.Time }
var store sync.Map

// SecretItem represents a stored secret
type SecretItem struct {
	EncryptedData []byte
	CreatedAt     time.Time
}

type CreateRequest struct {
	Secret string `json:"secret"`
}

type CreateResponse struct {
	Token string `json:"token"`
	Key   string `json:"key"`
}

type RetrieveRequest struct {
	Token string `json:"token"`
	Key   string `json:"key"`
}

type RetrieveResponse struct {
	Secret string `json:"secret"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func sendError(w http.ResponseWriter, message string, status int) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

// handleCreateSecret securely generates a key and token, encrypts the payload, and saves it.
func handleCreateSecret(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Secret == "" {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Generate 32-byte key for AES-256
	keyBytes, err := GenerateRandomBytes(32)
	if err != nil {
		sendError(w, "Failed to generate key", http.StatusInternalServerError)
		return
	}

	// Generate 16-byte token for identification
	tokenBytes, err := GenerateRandomBytes(16)
	if err != nil {
		sendError(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Encrypt the secret
	encryptedData, err := Encrypt([]byte(req.Secret), keyBytes)
	if err != nil {
		sendError(w, "Encryption failed", http.StatusInternalServerError)
		return
	}

	tokenHex := hex.EncodeToString(tokenBytes)
	keyHex := hex.EncodeToString(keyBytes)

	// Store in memory
	store.Store(tokenHex, SecretItem{
		EncryptedData: encryptedData,
		CreatedAt:     time.Now(),
	})

	// Return token and key
	resp := CreateResponse{
		Token: tokenHex,
		Key:   keyHex,
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

	// Decode key
	keyBytes, err := hex.DecodeString(req.Key)
	if err != nil || len(keyBytes) != 32 {
		sendError(w, "Invalid key", http.StatusBadRequest)
		return
	}

	// Decrypt data
	secretItem := item.(SecretItem)
	plaintextBytes, err := Decrypt(secretItem.EncryptedData, keyBytes)
	if err != nil {
		sendError(w, "Decryption failed or invalid key", http.StatusUnauthorized)
		return
	}

	// Send back the plaintext
	resp := RetrieveResponse{
		Secret: string(plaintextBytes),
	}
	json.NewEncoder(w).Encode(resp)
}

func main() {
	// API routes
	http.HandleFunc("/api/secret", handleCreateSecret)
	http.HandleFunc("/api/retrieve", handleRetrieveSecret)

	// Serve frontend from public directory
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	log.Println("Server starting on http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
