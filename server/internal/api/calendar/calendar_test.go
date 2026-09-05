package calendar

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	service "github.com/thein3rovert/lifeos/server/internal/services"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

type calendarStoreStub struct{}

func (calendarStoreStub) SaveTokens(string, string, string, time.Time) error { return nil }
func (calendarStoreStub) GetTokens() (*store.OAuthTokens, error)             { return nil, nil }
func (calendarStoreStub) ClearTokens() error                                 { return nil }

func TestCreateEventReturnsBadRequestForValidationError(t *testing.T) {
	svc := service.NewCalendarService(calendarStoreStub{}, "", "", "")
	handler := NewCalendarHandler(svc, "")
	request := httptest.NewRequest(http.MethodPost, "/api/calendar/events", strings.NewReader(`{
		"title":"Invalid event",
		"start":"2026-09-07T10:00:00Z",
		"end":"2026-09-07T09:00:00Z"
	}`))
	response := httptest.NewRecorder()

	handler.CreateEvent(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d; body = %s", response.Code, http.StatusBadRequest, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), "end must be after start") {
		t.Fatalf("body = %q, want validation message", response.Body.String())
	}
}

func TestRespondCalendarRateLimited(t *testing.T) {
	response := httptest.NewRecorder()

	respondCalendarRateLimited(response)

	if response.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusTooManyRequests)
	}
	var body map[string]string
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["error"] != "google_calendar_rate_limited" {
		t.Fatalf("error = %q, want google_calendar_rate_limited", body["error"])
	}
	if body["message"] != calendarRateLimitMessage {
		t.Fatalf("message = %q, want %q", body["message"], calendarRateLimitMessage)
	}
}
