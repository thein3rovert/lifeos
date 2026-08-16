// Package api hosts the shared handler surface. Concrete endpoint groups
// live in subpackages (skills, agents, chats, smartboard). Shared HTTP+JSON
// helpers live in internal/httpjson so handler packages can share them
// without an import cycle.
package api

import (
	"net/http"

	"github.com/thein3rovert/lifeos/server/internal/httpjson"
)

// RespondJSON is a convenience re-export so callers already importing
// "api" don't have to also import httpjson for the common case.
func RespondJSON(w http.ResponseWriter, status int, data interface{}) {
	httpjson.RespondJSON(w, status, data)
}

// RespondError re-exports httpjson.RespondError.
func RespondError(w http.ResponseWriter, status int, message string) {
	httpjson.RespondError(w, status, message)
}

// DecodeJSON re-exports httpjson.DecodeJSON.
func DecodeJSON(r *http.Request, dst interface{}) error {
	return httpjson.DecodeJSON(r, dst)
}
