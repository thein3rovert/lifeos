// Package httpjson contains tiny helpers for JSON HTTP handlers plus
// shared response shapes. Keep it free of business logic so any handler
// package (api, api/skills, api/agents, ...) can depend on it without
// creating an import cycle.
package httpjson

import (
	"encoding/json"
	"errors"
	"net/http"
)

// RespondJSON writes a JSON response with the given status code.
func RespondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		if err := json.NewEncoder(w).Encode(data); err != nil {
			http.Error(w, `{"error":"failed to encode JSON"}`, http.StatusInternalServerError)
		}
	}
}

// RespondError writes a JSON error response.
func RespondError(w http.ResponseWriter, status int, message string) {
	RespondJSON(w, status, map[string]string{"error": message})
}

// ErrBodyRequired is returned by DecodeJSON when the request body is nil.
var ErrBodyRequired = errors.New("request body is required")

// DecodeJSON decodes a JSON request body into dst.
func DecodeJSON(r *http.Request, dst interface{}) error {
	if r.Body == nil {
		return ErrBodyRequired
	}
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dst)
}
