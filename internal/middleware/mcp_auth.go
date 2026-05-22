package middleware

import (
	"net/http"
	"os"
	"strings"
)

func MCPAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// Get the expected key from env
		authenticationKey := os.Getenv("MCP_API_KEY")
		if authenticationKey == "" {
			// If no key is set, allow access (dev mode)
			next.ServeHTTP(w, r)
			return
		}

		// Extract Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Unauthorized: missing Authorization header", http.StatusUnauthorized)
			return
		}

		// Check for Bearer token format
		if !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "UnauthorizedL invalid token format", http.StatusUnauthorized)
			return
		}

		// Extract token
		token := strings.TrimPrefix(authHeader, "Bearer ")
			if token != authenticationKey {
				http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
				return
			}

			// Token is valid -> continue
			next.ServeHTTP(w, r)
	})
}
