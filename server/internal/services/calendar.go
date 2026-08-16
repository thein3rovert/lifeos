package service

import (
	"context"
	"fmt"
	"log"

	"github.com/thein3rovert/lifeos/server/internal/store"
	calendar "google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
	"golang.org/x/oauth2"
)

const calendarScope = "https://www.googleapis.com/auth/calendar.events"

// CalendarService handles Google Calendar OAuth + event operations.
type CalendarService struct {
	store       store.CalendarStore
	oauthConfig *oauth2.Config
}

func NewCalendarService(store store.CalendarStore, clientID, clientSecret, redirectURI string) *CalendarService {
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
	return &CalendarService{store: store, oauthConfig: cfg}
}

// ── OAuth ──────────────────────────────────────────────────────

// AuthURL builds the Google consent URL.
func (s *CalendarService) AuthURL(state string) string {
	return s.oauthConfig.AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "consent"),
	)
}

// ExchangeCode trades an OAuth code for tokens and persists them.
func (s *CalendarService) ExchangeCode(ctx context.Context, code string) error {
	token, err := s.oauthConfig.Exchange(ctx, code)
	if err != nil {
		return fmt.Errorf("token exchange failed: %w", err)
	}
	if token.RefreshToken == "" {
		log.Println("Warning: no refresh token returned. User may need to revoke access and retry.")
	}
	return s.store.SaveTokens(token.AccessToken, token.RefreshToken, token.TokenType, token.Expiry)
}

// IsConnected returns true if tokens are stored.
func (s *CalendarService) IsConnected() (bool, error) {
	tokens, err := s.store.GetTokens()
	if err != nil {
		return false, err
	}
	return tokens != nil, nil
}

// Disconnect clears stored tokens.
func (s *CalendarService) Disconnect() error {
	return s.store.ClearTokens()
}

// ── Token refresh ───────────────────────────────────────────────

// persistingTokenSource wraps an oauth2.TokenSource and saves refreshed tokens.
type persistingTokenSource struct {
	store    store.CalendarStore
	inner    oauth2.TokenSource
	lastSeen *oauth2.Token
}

func (p *persistingTokenSource) Token() (*oauth2.Token, error) {
	token, err := p.inner.Token()
	if err != nil {
		return nil, err
	}
	// Persist only if the access token changed (i.e. a refresh happened).
	if p.lastSeen == nil || token.AccessToken != p.lastSeen.AccessToken {
		if err := p.store.SaveTokens(token.AccessToken, token.RefreshToken, token.TokenType, token.Expiry); err != nil {
			log.Printf("Warning: failed to persist refreshed token: %v", err)
		}
		p.lastSeen = token
	}
	return token, nil
}

// getValidTokenSource returns a token source that auto-refreshes and persists.
// Returns an error if no tokens are stored.
func (s *CalendarService) getValidTokenSource(ctx context.Context) (oauth2.TokenSource, error) {
	tokens, err := s.store.GetTokens()
	if err != nil {
		return nil, fmt.Errorf("failed to read tokens: %w", err)
	}
	if tokens == nil {
		return nil, fmt.Errorf("not connected — start OAuth flow first")
	}

	stored := &oauth2.Token{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		TokenType:    tokens.TokenType,
		Expiry:       tokens.Expiry,
	}

	inner := s.oauthConfig.TokenSource(ctx, stored)
	return &persistingTokenSource{store: s.store, inner: inner, lastSeen: stored}, nil
}

// getCalendarClient returns a Google Calendar API client using the stored token.
func (s *CalendarService) getCalendarClient(ctx context.Context) (*calendar.Service, error) {
	ts, err := s.getValidTokenSource(ctx)
	if err != nil {
		return nil, err
	}
	return calendar.NewService(ctx, option.WithTokenSource(ts))
}

// ── Events ──────────────────────────────────────────────────────

// CalendarEvent is the normalized JSON shape returned to the frontend.
type CalendarEvent struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Start       string `json:"start"`
	End         string `json:"end"`
	Description string `json:"description,omitempty"`
	Location    string `json:"location,omitempty"`
}

// GetEvents fetches events from the user's primary calendar for the given range.
func (s *CalendarService) GetEvents(ctx context.Context, timeMin, timeMax string) ([]CalendarEvent, error) {
	client, err := s.getCalendarClient(ctx)
	if err != nil {
		return nil, err
	}

	events, err := client.Events.List("primary").
		TimeMin(timeMin).
		TimeMax(timeMax).
		SingleEvents(true).
		OrderBy("startTime").
		Do()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch events: %w", err)
	}

	result := make([]CalendarEvent, 0, len(events.Items))
	for _, e := range events.Items {
		result = append(result, CalendarEvent{
			ID:          e.Id,
			Title:       e.Summary,
			Start:       e.Start.DateTime,
			End:         e.End.DateTime,
			Description: e.Description,
			Location:    e.Location,
		})
	}
	return result, nil
}

// CreateEventInput is the body for creating a new event.
type CreateEventInput struct {
	Title       string `json:"title"`
	Start       string `json:"start"`
	End         string `json:"end"`
	Description string `json:"description,omitempty"`
	Location    string `json:"location,omitempty"`
}

// CreateEvent creates an event on the user's primary calendar.
func (s *CalendarService) CreateEvent(ctx context.Context, input CreateEventInput) (string, error) {
	client, err := s.getCalendarClient(ctx)
	if err != nil {
		return "", err
	}

	event := &calendar.Event{
		Summary:     input.Title,
		Description: input.Description,
		Location:    input.Location,
		Start:       &calendar.EventDateTime{DateTime: input.Start},
		End:         &calendar.EventDateTime{DateTime: input.End},
	}

	created, err := client.Events.Insert("primary", event).Do()
	if err != nil {
		return "", fmt.Errorf("failed to create event: %w", err)
	}
	return created.Id, nil
}

// UpdateEventInput is the body for updating an existing event.
type UpdateEventInput struct {
	Title       *string `json:"title,omitempty"`
	Start       *string `json:"start,omitempty"`
	End         *string `json:"end,omitempty"`
	Description *string `json:"description,omitempty"`
	Location    *string `json:"location,omitempty"`
}

// UpdateEvent patches an event on the user's primary calendar.
func (s *CalendarService) UpdateEvent(ctx context.Context, eventID string, input UpdateEventInput) error {
	client, err := s.getCalendarClient(ctx)
	if err != nil {
		return err
	}

	event := &calendar.Event{}
	if input.Title != nil {
		event.Summary = *input.Title
	}
	if input.Description != nil {
		event.Description = *input.Description
	}
	if input.Location != nil {
		event.Location = *input.Location
	}
	if input.Start != nil {
		event.Start = &calendar.EventDateTime{DateTime: *input.Start}
	}
	if input.End != nil {
		event.End = &calendar.EventDateTime{DateTime: *input.End}
	}

	if _, err := client.Events.Patch("primary", eventID, event).Do(); err != nil {
		return fmt.Errorf("failed to update event: %w", err)
	}
	return nil
}

// DeleteEvent removes an event from the user's primary calendar.
func (s *CalendarService) DeleteEvent(ctx context.Context, eventID string) error {
	client, err := s.getCalendarClient(ctx)
	if err != nil {
		return err
	}
	if err := client.Events.Delete("primary", eventID).Do(); err != nil {
		return fmt.Errorf("failed to delete event: %w", err)
	}
	return nil
}