package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/store"
	calendar "google.golang.org/api/calendar/v3"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

type calendarServiceStoreStub struct{}

func (calendarServiceStoreStub) SaveTokens(string, string, string, time.Time) error { return nil }
func (calendarServiceStoreStub) GetTokens() (*store.OAuthTokens, error)             { return nil, nil }
func (calendarServiceStoreStub) ClearTokens() error                                 { return nil }

func TestBuildWeeklyRecurrence(t *testing.T) {
	tests := []struct {
		name    string
		input   CreateEventInput
		want    string
		wantErr string
	}{
		{
			name:  "one-off event",
			input: CreateEventInput{Start: "2026-09-07T09:00:00-04:00", End: "2026-09-07T10:00:00-04:00"},
		},
		{
			name: "weekly never ends",
			input: CreateEventInput{
				Start: "2026-09-07T09:00:00-04:00",
				End:   "2026-09-07T10:00:00-04:00",
				Recurrence: &WeeklyRecurrenceInput{
					Weekdays: []string{"MO", "WE"}, End: "never", TimeZone: "America/New_York",
				},
			},
			want: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE",
		},
		{
			name: "until is inclusive in recurrence timezone",
			input: CreateEventInput{
				Start: "2026-11-02T09:00:00-05:00",
				End:   "2026-11-02T10:00:00-05:00",
				Recurrence: &WeeklyRecurrenceInput{
					Weekdays: []string{"MO"}, End: "until", Until: "2026-11-09", TimeZone: "America/New_York",
				},
			},
			want: "RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261110T045959Z",
		},
		{
			name:    "invalid start",
			input:   CreateEventInput{Start: "tomorrow", End: "2026-09-07T10:00:00Z"},
			wantErr: "start must be a valid RFC3339 timestamp",
		},
		{
			name:    "end before start",
			input:   CreateEventInput{Start: "2026-09-07T10:00:00Z", End: "2026-09-07T09:00:00Z"},
			wantErr: "end must be after start",
		},
		{
			name: "invalid timezone",
			input: CreateEventInput{
				Start: "2026-09-07T09:00:00Z", End: "2026-09-07T10:00:00Z",
				Recurrence: &WeeklyRecurrenceInput{Weekdays: []string{"MO"}, End: "never", TimeZone: "Mars/Olympus"},
			},
			wantErr: "recurrence timeZone must be a valid IANA timezone",
		},
		{
			name: "no weekdays",
			input: CreateEventInput{
				Start: "2026-09-07T09:00:00Z", End: "2026-09-07T10:00:00Z",
				Recurrence: &WeeklyRecurrenceInput{End: "never", TimeZone: "UTC"},
			},
			wantErr: "recurrence must include at least one weekday",
		},
		{
			name: "invalid weekday",
			input: CreateEventInput{
				Start: "2026-09-07T09:00:00Z", End: "2026-09-07T10:00:00Z",
				Recurrence: &WeeklyRecurrenceInput{Weekdays: []string{"XX"}, End: "never", TimeZone: "UTC"},
			},
			wantErr: `invalid recurrence weekday "XX"; use SU, MO, TU, WE, TH, FR, or SA`,
		},
		{
			name: "start weekday missing",
			input: CreateEventInput{
				Start: "2026-09-07T23:30:00-04:00", End: "2026-09-08T00:30:00-04:00",
				Recurrence: &WeeklyRecurrenceInput{Weekdays: []string{"TU"}, End: "never", TimeZone: "America/New_York"},
			},
			wantErr: "recurrence weekdays must include the start date's local weekday",
		},
		{
			name: "until before local start",
			input: CreateEventInput{
				Start: "2026-09-07T23:30:00-04:00", End: "2026-09-08T00:30:00-04:00",
				Recurrence: &WeeklyRecurrenceInput{Weekdays: []string{"MO"}, End: "until", Until: "2026-09-06", TimeZone: "America/New_York"},
			},
			wantErr: "recurrence until must not be before the local start date",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rules, err := buildWeeklyRecurrence(tt.input)
			if tt.wantErr != "" {
				var validationErr *ValidationError
				if !errors.As(err, &validationErr) {
					t.Fatalf("expected ValidationError, got %v", err)
				}
				if err.Error() != tt.wantErr {
					t.Fatalf("error = %q, want %q", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.want == "" {
				if rules != nil {
					t.Fatalf("rules = %v, want nil", rules)
				}
				return
			}
			if len(rules) != 1 || rules[0] != tt.want {
				t.Fatalf("rules = %v, want [%s]", rules, tt.want)
			}
		})
	}
}

func TestGetEventsCoalescesRequestsCachesMastersAndCopiesResults(t *testing.T) {
	var listCalls atomic.Int32
	var masterCalls atomic.Int32
	listStarted := make(chan struct{})
	releaseList := make(chan struct{})
	var startOnce sync.Once

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/calendars/primary/events":
			listCalls.Add(1)
			startOnce.Do(func() { close(listStarted) })
			<-releaseList
			_ = json.NewEncoder(w).Encode(map[string]any{"items": []any{map[string]any{
				"id":                "occurrence-1",
				"summary":           "Standup",
				"start":             map[string]string{"dateTime": "2026-09-07T09:00:00Z"},
				"end":               map[string]string{"dateTime": "2026-09-07T09:30:00Z"},
				"recurringEventId":  "master-1",
				"originalStartTime": map[string]string{"dateTime": "2026-09-07T09:00:00Z"},
			}}})
		case r.Method == http.MethodGet && r.URL.Path == "/calendars/primary/events/master-1":
			masterCalls.Add(1)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id": "master-1", "start": map[string]string{"timeZone": "UTC"},
				"recurrence": []string{"RRULE:FREQ=WEEKLY;BYDAY=MO"},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	svc := newTestCalendarService(t, server.URL)
	const timeMin = "2026-09-01T00:00:00Z"
	const timeMax = "2026-10-01T00:00:00Z"

	results := make([][]CalendarEvent, 2)
	errs := make([]error, 2)
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		results[0], errs[0] = svc.GetEvents(context.Background(), timeMin, timeMax)
	}()
	<-listStarted
	go func() {
		defer wg.Done()
		results[1], errs[1] = svc.GetEvents(context.Background(), timeMin, timeMax)
	}()
	time.Sleep(20 * time.Millisecond)
	close(releaseList)
	wg.Wait()

	for _, err := range errs {
		if err != nil {
			t.Fatalf("GetEvents returned error: %v", err)
		}
	}
	if got := listCalls.Load(); got != 1 {
		t.Fatalf("list calls = %d, want 1", got)
	}
	if got := masterCalls.Load(); got != 1 {
		t.Fatalf("master calls = %d, want 1", got)
	}
	results[0][0].Title = "mutated"
	results[0][0].Recurrence.Rules[0] = "mutated"
	if results[1][0].Title != "Standup" || results[1][0].Recurrence.Rules[0] != "RRULE:FREQ=WEEKLY;BYDAY=MO" {
		t.Fatalf("coalesced result shares mutable state: %+v", results[1][0])
	}

	third, err := svc.GetEvents(context.Background(), timeMin, timeMax)
	if err != nil {
		t.Fatalf("third GetEvents returned error: %v", err)
	}
	if got := listCalls.Load(); got != 2 {
		t.Fatalf("list calls after third request = %d, want 2", got)
	}
	if got := masterCalls.Load(); got != 1 {
		t.Fatalf("master cache calls = %d, want 1", got)
	}
	if third[0].Recurrence.Rules[0] != "RRULE:FREQ=WEEKLY;BYDAY=MO" {
		t.Fatalf("cached master metadata was mutated: %+v", third[0].Recurrence)
	}
}

func TestSuccessfulCreateInvalidatesRecurringMasterCache(t *testing.T) {
	var masterCalls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/calendars/primary/events":
			_ = json.NewEncoder(w).Encode(map[string]any{"items": []any{map[string]any{
				"id": "occurrence-1", "recurringEventId": "master-1",
			}}})
		case r.Method == http.MethodGet && r.URL.Path == "/calendars/primary/events/master-1":
			masterCalls.Add(1)
			_ = json.NewEncoder(w).Encode(map[string]any{"id": "master-1"})
		case r.Method == http.MethodPost && r.URL.Path == "/calendars/primary/events":
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]string{"id": "created-1"})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	svc := newTestCalendarService(t, server.URL)
	if _, err := svc.GetEvents(context.Background(), "min", "max"); err != nil {
		t.Fatalf("first GetEvents returned error: %v", err)
	}
	if _, err := svc.CreateEvent(context.Background(), CreateEventInput{
		Title: "New", Start: "2026-09-07T10:00:00Z", End: "2026-09-07T11:00:00Z",
	}); err != nil {
		t.Fatalf("CreateEvent returned error: %v", err)
	}
	if _, err := svc.GetEvents(context.Background(), "min", "max"); err != nil {
		t.Fatalf("second GetEvents returned error: %v", err)
	}
	if got := masterCalls.Load(); got != 2 {
		t.Fatalf("master calls = %d, want 2 after invalidation", got)
	}
}

func TestClassifyCalendarRateLimitError(t *testing.T) {
	for _, reason := range []string{"rateLimitExceeded", "RATE_LIMIT_EXCEEDED"} {
		t.Run(reason, func(t *testing.T) {
			err := classifyCalendarError("fetch", &googleapi.Error{
				Code:   http.StatusForbidden,
				Errors: []googleapi.ErrorItem{{Reason: reason}},
			})
			if !errors.Is(err, ErrCalendarRateLimited) {
				t.Fatalf("error = %v, want ErrCalendarRateLimited", err)
			}
		})
	}

	nonRateLimit := classifyCalendarError("fetch", &googleapi.Error{
		Code: http.StatusForbidden, Errors: []googleapi.ErrorItem{{Reason: "forbidden"}},
	})
	if errors.Is(nonRateLimit, ErrCalendarRateLimited) {
		t.Fatalf("non-rate-limit error classified as rate limited: %v", nonRateLimit)
	}
}

func TestGetEventsClassifiesGoogleRateLimitResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"error":{"code":403,"message":"Quota exceeded","errors":[{"reason":"rateLimitExceeded","message":"Quota exceeded"}]}}`))
	}))
	defer server.Close()

	svc := newTestCalendarService(t, server.URL)
	_, err := svc.GetEvents(context.Background(), "min", "max")
	if !errors.Is(err, ErrCalendarRateLimited) {
		t.Fatalf("error = %v, want ErrCalendarRateLimited", err)
	}
}

func newTestCalendarService(t *testing.T, endpoint string) *CalendarService {
	t.Helper()
	client, err := calendar.NewService(context.Background(),
		option.WithEndpoint(endpoint+"/"),
		option.WithoutAuthentication(),
	)
	if err != nil {
		t.Fatalf("create calendar client: %v", err)
	}
	svc := NewCalendarService(calendarServiceStoreStub{}, "", "", "")
	svc.client = func(context.Context) (*calendar.Service, error) { return client, nil }
	return svc
}
