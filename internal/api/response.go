package api

import (
	"encoding/json"
	"net/http"
)

// respondJSON writes a JSON response with the given status code
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		if err := json.NewEncoder(w).Encode(data); err != nil {
			http.Error(w, `{"error":"failed to encode JSON"}`, http.StatusInternalServerError)
		}
	}
}

// respondError writes a JSON error response
func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// decodeJSON decodes a JSON request body into dst
func decodeJSON(r *http.Request, dst interface{}) error {
	if r.Body == nil {
		return errBodyRequired
	}
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dst)
}

var errBodyRequired = &jsonError{"request body is required"}

type jsonError struct {
	msg string
}

func (e *jsonError) Error() string {
	return e.msg
}
