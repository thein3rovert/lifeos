package calendar

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/api"
	"github.com/thein3rovert/lifeos/server/internal/store"
	"golang.org/x/oauth2"
)

const calendarScope = "https://www.googleapis.com/auth/calendar.events"

// CalendarHandler handles Google Calendar OAuth + event endpoints.
type CalendarHandler struct {
	store       store.CalendarStore
	oauthConfig *oauth2.Config
	frontendURL string // where to send the user after OAuth callback
}

// NewCalendarHandler creates a new calendar handler.
func NewCalendarHandler(store store.CalendarStore, clientID, clientSecret, redirectURI, frontendURL string) *CalendarHandler {
	cfg := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURI,
		Scopes:       []string{calendarScope},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://accounts.google.com/o/oauth2/auth",
			TokenURL: "https://oauth2.googleapis.com/token",
		},
	}
	return &CalendarHandler{
		store:       store,
		oauthConfig: cfg,
		frontendURL: frontendURL,
	}
}

// StartAuth redirects the user to Google's OAuth consent screen.
// GET /api/calendar/oauth/start
func (h *CalendarHandler) StartAuth(w http.ResponseWriter, r *http.Request) {
	state := "lifeos"

	// access_type=offline so we get a refresh token.
	// prompt=consent forces re-grant so the refresh token is always returned.
	authURL := h.oauthConfig.AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "consent"),
	)

	log.Println("Starting Google OAuth flow, redirecting to consent screen")
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

	// Exchange the auth code for tokens
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	token, err := h.oauthConfig.Exchange(ctx, code)
	if err != nil {
		log.Printf("OAuth token exchange failed: %v", err)
		api.RespondError(w, http.StatusBadGateway, "failed to exchange auth code for tokens")
		return
	}

	if token.RefreshToken == "" {
		// Google only returns the refresh token on the first consent approval
		// (or when prompt=consent forces re-grant). If the user previously
		// approved without offline access, they need to revoke + re-auth at
		// https://myaccount.google.com/permissions.
		log.Println("Warning: no refresh token returned. User may need to revoke access and retry.")
	}

	// Persist tokens to DB.
	if err := h.store.SaveTokens(
		token.AccessToken,
		token.RefreshToken,
		token.TokenType,
		token.Expiry,
	); err != nil {
		log.Printf("Failed to save OAuth tokens: %v", err)
		api.RespondError(w, http.StatusInternalServerError, "failed to save tokens")
		return
	}

	log.Println("OAuth tokens saved successfully")
	http.Redirect(w, r, h.frontendURL, http.StatusSeeOther)
}

// Disconnect revokes Google access by clearing stored tokens.
// POST /api/calendar/oauth/disconnect
func (h *CalendarHandler) Disconnect(w http.ResponseWriter, r *http.Request) {
	if err := h.store.ClearTokens(); err != nil {
		log.Printf("Failed to clear OAuth tokens: %v", err)
		api.RespondError(w, http.StatusInternalServerError, "failed to disconnect")
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]string{"message": "disconnected"})
}

// HasConnection returns 200 if tokens exist, 401 otherwise.
// GET /api/calendar/oauth/status
func (h *CalendarHandler) HasConnection(w http.ResponseWriter, r *http.Request) {
	tokens, err := h.store.GetTokens()
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to check tokens")
		return
	}
	if tokens == nil {
		api.RespondJSON(w, http.StatusOK, map[string]bool{"connected": false})
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]bool{"connected": true})
}
