package middleware

import (
	"net/http"
	"strings"
)

// CORS adds Cross-Origin Resource Sharing headers to responses.
// Origins should be provided at startup (from config), not read from env here.
// This keeps env reads centralized in the config package.
//
// Self-hosted mode: Set CORS_ORIGINS=* to allow any origin (recommended for
// single-user self-hosted deployments). Authentication is the real security boundary.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Self-hosted mode: allow any origin if CORS_ORIGINS=* or empty
			allowAll := len(allowedOrigins) == 0 || 
				(len(allowedOrigins) == 1 && strings.TrimSpace(allowedOrigins[0]) == "*")

			if allowAll {
				// Allow the requesting origin (required for credentials)
				if origin != "" {
					w.Header().Set("Access-Control-Allow-Origin", origin)
				} else {
					w.Header().Set("Access-Control-Allow-Origin", "*")
				}
			} else {
				// Check if the request origin is in our allowed list
				allowed := false
				for _, o := range allowedOrigins {
					if strings.TrimSpace(o) == origin {
						allowed = true
						break
					}
				}

				if allowed {
					w.Header().Set("Access-Control-Allow-Origin", origin)
				}
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, HX-Request")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			// Handle preflight requests
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
