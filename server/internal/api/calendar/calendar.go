package calendar

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/api"
	service "github.com/thein3rovert/lifeos/server/internal/services"
)

// CalendarHandler handles Google Calendar OAuth + event endpoints.
type CalendarHandler struct {
	service     *service.CalendarService
	frontendURL string // where to send the user after OAuth callback
}

// NewCalendarHandler creates a new calendar handler.
func NewCalendarHandler(svc *service.CalendarService, frontendURL string) *CalendarHandler {
	return &CalendarHandler{service: svc, frontendURL: frontendURL}
}

// StartAuth redirects the user to Google's OAuth consent screen.
// GET /api/calendar/oauth/start
func (h *CalendarHandler) StartAuth(w http.ResponseWriter, r *http.Request) {
	authURL := h.service.AuthURL("lifeos")
	log.Println("Starting Google OAuth flow")
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

// Callback exchanges the auth code for tokens, persists them, redirects to frontend.
// GET /api/calendar/oauth/callback
func (h *CalendarHandler) Callback(w http.ResponseWriter, r *http.Request) {
	if errParam := r.URL.Query().Get("error"); errParam != "" {
		api.RespondError(w, http.StatusBadRequest, "OAuth error: "+errParam)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		api.RespondError(w, http.StatusBadRequest, "missing code parameter")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := h.service.ExchangeCode(ctx, code); err != nil {
		log.Printf("OAuth callback failed: %v", err)
		api.RespondError(w, http.StatusBadGateway, "failed to exchange auth code")
		return
	}

	log.Println("OAuth tokens saved successfully")
	http.Redirect(w, r, h.frontendURL, http.StatusSeeOther)
}

// Disconnect revokes Google access by clearing stored tokens.
// POST /api/calendar/oauth/disconnect
func (h *CalendarHandler) Disconnect(w http.ResponseWriter, r *http.Request) {
	if err := h.service.Disconnect(); err != nil {
		log.Printf("Failed to disconnect: %v", err)
		api.RespondError(w, http.StatusInternalServerError, "failed to disconnect")
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]string{"message": "disconnected"})
}

// HasConnection returns whether Google is connected.
// GET /api/calendar/oauth/status
func (h *CalendarHandler) HasConnection(w http.ResponseWriter, r *http.Request) {
	connected, err := h.service.IsConnected()
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to check connection")
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]bool{"connected": connected})
}