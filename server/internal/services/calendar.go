package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/store"
	"golang.org/x/oauth2"
	calendar "google.golang.org/api/calendar/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

// ErrCalendarReauthorizationRequired indicates that Google rejected the saved
// refresh token and the user must complete OAuth again.
var ErrCalendarReauthorizationRequired = errors.New("google calendar reauthorization required")

// ErrCalendarRateLimited indicates that Google rejected a request because the
// per-user Calendar API quota was exhausted.
var ErrCalendarRateLimited = errors.New("google calendar rate limited")

// ValidationError indicates invalid calendar event input.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

const (
	calendarScope          = "https://www.googleapis.com/auth/calendar.events"
	calendarMasterCacheTTL = 5 * time.Minute
)

type eventRangeCall struct {
	done       chan struct{}
	generation uint64
	events     []CalendarEvent
	err        error
}

type recurringMasterMetadata struct {
	timeZone string
	rules    []string
}

type masterCacheEntry struct {
	metadata  recurringMasterMetadata
	expiresAt time.Time
}

type masterCall struct {
	done     chan struct{}
	metadata recurringMasterMetadata
	err      error
}

// CalendarService handles Google Calendar OAuth + event operations.
type CalendarService struct {
	store       store.CalendarStore
	oauthConfig *oauth2.Config
	client      func(context.Context) (*calendar.Service, error)

	cacheMu         sync.Mutex
	cacheGeneration uint64
	masterCache     map[string]masterCacheEntry
	rangeInFlight   map[string]*eventRangeCall
	masterInFlight  map[string]*masterCall
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
	s := &CalendarService{
		store:          store,
		oauthConfig:    cfg,
		masterCache:    make(map[string]masterCacheEntry),
		rangeInFlight:  make(map[string]*eventRangeCall),
		masterInFlight: make(map[string]*masterCall),
	}
	s.client = s.getCalendarClient
	return s
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
	if err := s.store.ClearTokens(); err != nil {
		return err
	}
	s.invalidateEventCaches()
	return nil
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
		var retrieveErr *oauth2.RetrieveError
		if errors.As(err, &retrieveErr) && retrieveErr.ErrorCode == "invalid_grant" {
			if clearErr := p.store.ClearTokens(); clearErr != nil {
				log.Printf("Warning: failed to clear invalid Google Calendar tokens: %v", clearErr)
			}
			return nil, ErrCalendarReauthorizationRequired
		}
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
	ID          string                   `json:"id"`
	Title       string                   `json:"title"`
	Start       string                   `json:"start"`
	End         string                   `json:"end"`
	Description string                   `json:"description,omitempty"`
	Location    string                   `json:"location,omitempty"`
	Recurrence  *CalendarEventRecurrence `json:"recurrence,omitempty"`
}

// CalendarEventRecurrence identifies an expanded occurrence and its series.
type CalendarEventRecurrence struct {
	SeriesID          string   `json:"seriesId"`
	OriginalStartTime string   `json:"originalStartTime,omitempty"`
	TimeZone          string   `json:"timeZone,omitempty"`
	Rules             []string `json:"rules,omitempty"`
}

// GetEvents fetches events from the user's primary calendar for the given range.
func (s *CalendarService) GetEvents(ctx context.Context, timeMin, timeMax string) ([]CalendarEvent, error) {
	key := timeMin + "\x00" + timeMax
	s.cacheMu.Lock()
	if call, ok := s.rangeInFlight[key]; ok {
		s.cacheMu.Unlock()
		select {
		case <-call.done:
			return cloneCalendarEvents(call.events), call.err
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	call := &eventRangeCall{done: make(chan struct{}), generation: s.cacheGeneration}
	s.rangeInFlight[key] = call
	s.cacheMu.Unlock()

	events, err := s.fetchEvents(ctx, timeMin, timeMax, call.generation)
	call.events = cloneCalendarEvents(events)
	call.err = err
	close(call.done)

	s.cacheMu.Lock()
	if s.rangeInFlight[key] == call {
		delete(s.rangeInFlight, key)
	}
	s.cacheMu.Unlock()
	return cloneCalendarEvents(events), err
}

func (s *CalendarService) fetchEvents(ctx context.Context, timeMin, timeMax string, generation uint64) ([]CalendarEvent, error) {
	client, err := s.client(ctx)
	if err != nil {
		return nil, err
	}

	var items []*calendar.Event
	pageToken := ""
	for {
		events, err := client.Events.List("primary").
			TimeMin(timeMin).
			TimeMax(timeMax).
			SingleEvents(true).
			OrderBy("startTime").
			PageToken(pageToken).
			Do()
		if err != nil {
			return nil, classifyCalendarError("failed to fetch events", err)
		}
		items = append(items, events.Items...)
		if events.NextPageToken == "" {
			break
		}
		pageToken = events.NextPageToken
	}

	result := make([]CalendarEvent, 0, len(items))
	for _, event := range items {
		normalized := CalendarEvent{
			ID:          event.Id,
			Title:       event.Summary,
			Start:       eventDateTime(event.Start),
			End:         eventDateTime(event.End),
			Description: event.Description,
			Location:    event.Location,
		}

		if event.RecurringEventId != "" {
			metadata, err := s.getRecurringMasterMetadata(ctx, client, event.RecurringEventId, generation)
			if err != nil {
				return nil, err
			}

			normalized.Recurrence = &CalendarEventRecurrence{
				SeriesID:          event.RecurringEventId,
				OriginalStartTime: eventDateTime(event.OriginalStartTime),
				TimeZone:          recurringEventTimeZone(event, metadata.timeZone),
				Rules:             append([]string(nil), metadata.rules...),
			}
		}

		result = append(result, normalized)
	}
	return result, nil
}

func (s *CalendarService) getRecurringMasterMetadata(ctx context.Context, client *calendar.Service, eventID string, generation uint64) (recurringMasterMetadata, error) {
	now := time.Now()
	s.cacheMu.Lock()
	if generation == s.cacheGeneration {
		if entry, ok := s.masterCache[eventID]; ok && now.Before(entry.expiresAt) {
			metadata := cloneMasterMetadata(entry.metadata)
			s.cacheMu.Unlock()
			return metadata, nil
		}
	}
	if call, ok := s.masterInFlight[eventID]; ok && generation == s.cacheGeneration {
		s.cacheMu.Unlock()
		select {
		case <-call.done:
			return cloneMasterMetadata(call.metadata), call.err
		case <-ctx.Done():
			return recurringMasterMetadata{}, ctx.Err()
		}
	}
	if generation != s.cacheGeneration {
		s.cacheMu.Unlock()
		master, err := client.Events.Get("primary", eventID).Do()
		if err != nil {
			return recurringMasterMetadata{}, classifyCalendarError(fmt.Sprintf("failed to fetch recurring event %q", eventID), err)
		}
		metadata := recurringMasterMetadata{
			timeZone: eventTimeZone(master.Start),
			rules:    append([]string(nil), master.Recurrence...),
		}
		return metadata, nil
	}
	call := &masterCall{done: make(chan struct{})}
	s.masterInFlight[eventID] = call
	s.cacheMu.Unlock()

	master, err := client.Events.Get("primary", eventID).Do()
	if err != nil {
		call.err = classifyCalendarError(fmt.Sprintf("failed to fetch recurring event %q", eventID), err)
	} else {
		call.metadata = recurringMasterMetadata{
			timeZone: eventTimeZone(master.Start),
			rules:    append([]string(nil), master.Recurrence...),
		}
	}
	close(call.done)

	s.cacheMu.Lock()
	if s.masterInFlight[eventID] == call {
		delete(s.masterInFlight, eventID)
	}
	if call.err == nil && s.cacheGeneration == generation {
		s.masterCache[eventID] = masterCacheEntry{
			metadata:  cloneMasterMetadata(call.metadata),
			expiresAt: time.Now().Add(calendarMasterCacheTTL),
		}
	}
	s.cacheMu.Unlock()
	return cloneMasterMetadata(call.metadata), call.err
}

func (s *CalendarService) invalidateEventCaches() {
	s.cacheMu.Lock()
	s.cacheGeneration++
	s.masterCache = make(map[string]masterCacheEntry)
	s.rangeInFlight = make(map[string]*eventRangeCall)
	s.masterInFlight = make(map[string]*masterCall)
	s.cacheMu.Unlock()
}

func cloneMasterMetadata(metadata recurringMasterMetadata) recurringMasterMetadata {
	metadata.rules = append([]string(nil), metadata.rules...)
	return metadata
}

func cloneCalendarEvents(events []CalendarEvent) []CalendarEvent {
	if events == nil {
		return nil
	}
	result := make([]CalendarEvent, len(events))
	copy(result, events)
	for i := range result {
		if events[i].Recurrence != nil {
			recurrence := *events[i].Recurrence
			recurrence.Rules = append([]string(nil), recurrence.Rules...)
			result[i].Recurrence = &recurrence
		}
	}
	return result
}

func eventDateTime(value *calendar.EventDateTime) string {
	if value == nil {
		return ""
	}
	if value.DateTime != "" {
		return value.DateTime
	}
	return value.Date
}

func recurringEventTimeZone(event *calendar.Event, masterTimeZone string) string {
	if event.OriginalStartTime != nil && event.OriginalStartTime.TimeZone != "" {
		return event.OriginalStartTime.TimeZone
	}
	return masterTimeZone
}

func eventTimeZone(value *calendar.EventDateTime) string {
	if value == nil {
		return ""
	}
	return value.TimeZone
}

func classifyCalendarError(operation string, err error) error {
	var apiErr *googleapi.Error
	if errors.As(err, &apiErr) && apiErr.Code == http.StatusForbidden {
		for _, item := range apiErr.Errors {
			if strings.EqualFold(item.Reason, "rateLimitExceeded") || strings.EqualFold(item.Reason, "RATE_LIMIT_EXCEEDED") {
				return fmt.Errorf("%s: %w", operation, ErrCalendarRateLimited)
			}
		}
	}
	return fmt.Errorf("%s: %w", operation, err)
}

// WeeklyRecurrenceInput describes an optional weekly recurrence rule.
type WeeklyRecurrenceInput struct {
	Weekdays []string `json:"weekdays"`
	End      string   `json:"end"`
	Until    string   `json:"until,omitempty"`
	TimeZone string   `json:"timeZone"`
}

var recurrenceWeekdays = map[string]time.Weekday{
	"SU": time.Sunday,
	"MO": time.Monday,
	"TU": time.Tuesday,
	"WE": time.Wednesday,
	"TH": time.Thursday,
	"FR": time.Friday,
	"SA": time.Saturday,
}

func buildWeeklyRecurrence(input CreateEventInput) ([]string, error) {
	start, err := time.Parse(time.RFC3339, input.Start)
	if err != nil {
		return nil, &ValidationError{Message: "start must be a valid RFC3339 timestamp"}
	}
	end, err := time.Parse(time.RFC3339, input.End)
	if err != nil {
		return nil, &ValidationError{Message: "end must be a valid RFC3339 timestamp"}
	}
	if !end.After(start) {
		return nil, &ValidationError{Message: "end must be after start"}
	}
	if input.Recurrence == nil {
		return nil, nil
	}

	recurrence := input.Recurrence
	location, err := time.LoadLocation(recurrence.TimeZone)
	if err != nil {
		return nil, &ValidationError{Message: "recurrence timeZone must be a valid IANA timezone"}
	}
	if len(recurrence.Weekdays) == 0 {
		return nil, &ValidationError{Message: "recurrence must include at least one weekday"}
	}

	localStart := start.In(location)
	seen := make(map[string]bool, len(recurrence.Weekdays))
	startIncluded := false
	for _, token := range recurrence.Weekdays {
		weekday, ok := recurrenceWeekdays[token]
		if !ok {
			return nil, &ValidationError{Message: fmt.Sprintf("invalid recurrence weekday %q; use SU, MO, TU, WE, TH, FR, or SA", token)}
		}
		if seen[token] {
			return nil, &ValidationError{Message: fmt.Sprintf("duplicate recurrence weekday %q", token)}
		}
		seen[token] = true
		startIncluded = startIncluded || weekday == localStart.Weekday()
	}
	if !startIncluded {
		return nil, &ValidationError{Message: "recurrence weekdays must include the start date's local weekday"}
	}

	rule := "RRULE:FREQ=WEEKLY;BYDAY=" + strings.Join(recurrence.Weekdays, ",")
	switch recurrence.End {
	case "never":
		if recurrence.Until != "" {
			return nil, &ValidationError{Message: "recurrence until must be empty when end is never"}
		}
	case "until":
		untilDate, err := time.ParseInLocation(time.DateOnly, recurrence.Until, location)
		if err != nil {
			return nil, &ValidationError{Message: "recurrence until must use YYYY-MM-DD when end is until"}
		}
		localStartDate := time.Date(localStart.Year(), localStart.Month(), localStart.Day(), 0, 0, 0, 0, location)
		if untilDate.Before(localStartDate) {
			return nil, &ValidationError{Message: "recurrence until must not be before the local start date"}
		}
		inclusiveUntil := untilDate.AddDate(0, 0, 1).Add(-time.Second).UTC()
		rule += ";UNTIL=" + inclusiveUntil.Format("20060102T150405Z")
	default:
		return nil, &ValidationError{Message: "recurrence end must be never or until"}
	}

	return []string{rule}, nil
}

// CreateEventInput is the body for creating a new event.
type CreateEventInput struct {
	Title       string                 `json:"title"`
	Start       string                 `json:"start"`
	End         string                 `json:"end"`
	Description string                 `json:"description,omitempty"`
	Location    string                 `json:"location,omitempty"`
	Recurrence  *WeeklyRecurrenceInput `json:"recurrence,omitempty"`
}

// CreateEvent creates an event on the user's primary calendar.
func (s *CalendarService) CreateEvent(ctx context.Context, input CreateEventInput) (string, error) {
	recurrence, err := buildWeeklyRecurrence(input)
	if err != nil {
		return "", err
	}

	client, err := s.client(ctx)
	if err != nil {
		return "", err
	}

	event := &calendar.Event{
		Summary:     input.Title,
		Description: input.Description,
		Location:    input.Location,
		Start:       &calendar.EventDateTime{DateTime: input.Start},
		End:         &calendar.EventDateTime{DateTime: input.End},
		Recurrence:  recurrence,
	}
	if input.Recurrence != nil {
		event.Start.TimeZone = input.Recurrence.TimeZone
		event.End.TimeZone = input.Recurrence.TimeZone
	}

	created, err := client.Events.Insert("primary", event).Do()
	if err != nil {
		return "", classifyCalendarError("failed to create event", err)
	}
	s.invalidateEventCaches()
	return created.Id, nil
}

// UpdateEventInput is the body for updating an existing event.
type UpdateEventInput struct {
	Title       *string                `json:"title,omitempty"`
	Start       *string                `json:"start,omitempty"`
	End         *string                `json:"end,omitempty"`
	Description *string                `json:"description,omitempty"`
	Location    *string                `json:"location,omitempty"`
	Recurrence  *WeeklyRecurrenceInput `json:"recurrence,omitempty"`
}

// UpdateEvent patches an event on the user's primary calendar.
func (s *CalendarService) UpdateEvent(ctx context.Context, eventID string, input UpdateEventInput) error {
	client, err := s.client(ctx)
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
	if input.Recurrence != nil {
		if input.Start == nil || input.End == nil {
			return &ValidationError{Message: "start and end are required when updating recurrence"}
		}
		rules, err := buildWeeklyRecurrence(CreateEventInput{
			Start: *input.Start, End: *input.End, Recurrence: input.Recurrence,
		})
		if err != nil {
			return err
		}
		event.Recurrence = rules
		event.Start.TimeZone = input.Recurrence.TimeZone
		event.End.TimeZone = input.Recurrence.TimeZone
	}

	if _, err := client.Events.Patch("primary", eventID, event).Do(); err != nil {
		return classifyCalendarError("failed to update event", err)
	}
	s.invalidateEventCaches()
	return nil
}

// DeleteEvent removes an event from the user's primary calendar.
func (s *CalendarService) DeleteEvent(ctx context.Context, eventID string) error {
	client, err := s.client(ctx)
	if err != nil {
		return err
	}
	if err := client.Events.Delete("primary", eventID).Do(); err != nil {
		return classifyCalendarError("failed to delete event", err)
	}
	s.invalidateEventCaches()
	return nil
}
