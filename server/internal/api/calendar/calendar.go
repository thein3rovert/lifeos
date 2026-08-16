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

// ── Events ──────────────────────────────────────────────────────

// GetEvents fetches Google Calendar events for a date range.
// GET /api/calendar/events?start=<RFC3339>&end=<RFC3339>
func (h *CalendarHandler) GetEvents(w http.ResponseWriter, r *http.Request) {
	start := r.URL.Query().Get("start")
	end := r.URL.Query().Get("end")
	if start == "" || end == "" {
		api.RespondError(w, http.StatusBadRequest, "start and end query params are required (RFC3339)")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	events, err := h.service.GetEvents(ctx, start, end)
	if err != nil {
		log.Printf("Failed to fetch events: %v", err)
		api.RespondError(w, http.StatusBadGateway, err.Error())
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]any{"events": events})
}

// CreateEvent creates a new event on the user's primary Google Calendar.
// POST /api/calendar/events
func (h *CalendarHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	var input service.CreateEventInput
	if err := api.DecodeJSON(r, &input); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if input.Title == "" || input.Start == "" || input.End == "" {
		api.RespondError(w, http.StatusBadRequest, "title, start, and end are required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	id, err := h.service.CreateEvent(ctx, input)
	if err != nil {
		log.Printf("Failed to create event: %v", err)
		api.RespondError(w, http.StatusBadGateway, err.Error())
		return
	}
	api.RespondJSON(w, http.StatusCreated, map[string]string{"id": id})
}

// UpdateEvent patches an existing event.
// PATCH /api/calendar/events/{eventId}
func (h *CalendarHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("eventId")
	if eventID == "" {
		api.RespondError(w, http.StatusBadRequest, "eventId is required")
		return
	}

	var input service.UpdateEventInput
	if err := api.DecodeJSON(r, &input); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := h.service.UpdateEvent(ctx, eventID, input); err != nil {
		log.Printf("Failed to update event %s: %v", eventID, err)
		api.RespondError(w, http.StatusBadGateway, err.Error())
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]string{"message": "event updated"})
}

// DeleteEvent removes an event from the user's primary Google Calendar.
// DELETE /api/calendar/events/{eventId}
func (h *CalendarHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("eventId")
	if eventID == "" {
		api.RespondError(w, http.StatusBadRequest, "eventId is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := h.service.DeleteEvent(ctx, eventID); err != nil {
		log.Printf("Failed to delete event %s: %v", eventID, err)
		api.RespondError(w, http.StatusBadGateway, err.Error())
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]string{"message": "event deleted"})
}