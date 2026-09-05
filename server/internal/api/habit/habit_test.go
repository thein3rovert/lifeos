package habit

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/model"
	service "github.com/thein3rovert/lifeos/server/internal/services"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

type handlerHabitStore struct {
	habits      []model.Habit
	completions []model.HabitCompletion
	completed   bool
	err         error
}

func (s *handlerHabitStore) ListHabits() ([]model.Habit, error) { return s.habits, s.err }
func (s *handlerHabitStore) GetHabit(string) (*model.Habit, error) {
	if s.err != nil {
		return nil, s.err
	}
	if len(s.habits) == 0 {
		return nil, store.ErrHabitNotFound
	}
	return &s.habits[0], nil
}
func (s *handlerHabitStore) CreateHabit(habit *model.Habit) error { return s.err }
func (s *handlerHabitStore) UpdateHabit(habit *model.Habit) error { return s.err }
func (s *handlerHabitStore) ArchiveHabit(string, time.Time) error { return s.err }
func (s *handlerHabitStore) ListHabitCompletions(string, string) ([]model.HabitCompletion, error) {
	return s.completions, s.err
}
func (s *handlerHabitStore) ListCompletionsForHabit(string, string, string) ([]model.HabitCompletion, error) {
	return s.completions, s.err
}
func (s *handlerHabitStore) ToggleHabitCompletion(string, string, string, time.Time) (bool, error) {
	return s.completed, s.err
}

func TestCreateReturnsValidationError(t *testing.T) {
	handler := NewHandler(service.NewHabitService(&handlerHabitStore{}))
	request := httptest.NewRequest(http.MethodPost, "/api/habits", strings.NewReader(`{"name":" ","recurrence":"daily","weekdays":[],"startDate":"2026-09-05"}`))
	response := httptest.NewRecorder()

	handler.Create(response, request)

	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "name must not be empty") {
		t.Fatalf("response = %d %s", response.Code, response.Body.String())
	}
}

func TestUpdateMissingReturnsNotFound(t *testing.T) {
	handler := NewHandler(service.NewHabitService(&handlerHabitStore{}))
	request := httptest.NewRequest(http.MethodPatch, "/api/habits/missing", strings.NewReader(`{"name":"Read"}`))
	request.SetPathValue("habitId", "missing")
	response := httptest.NewRecorder()

	handler.Update(response, request)

	if response.Code != http.StatusNotFound || !strings.Contains(response.Body.String(), "habit not found") {
		t.Fatalf("response = %d %s", response.Code, response.Body.String())
	}
}

func TestListReturnsJSONAndInternalErrorIsGeneric(t *testing.T) {
	t.Run("empty list", func(t *testing.T) {
		handler := NewHandler(service.NewHabitService(&handlerHabitStore{}))
		response := httptest.NewRecorder()
		handler.List(response, httptest.NewRequest(http.MethodGet, "/api/habits", nil))
		var body struct {
			Habits []model.Habit `json:"habits"`
		}
		if response.Code != http.StatusOK || json.Unmarshal(response.Body.Bytes(), &body) != nil || body.Habits == nil {
			t.Fatalf("response = %d %s", response.Code, response.Body.String())
		}
	})

	t.Run("internal error", func(t *testing.T) {
		handler := NewHandler(service.NewHabitService(&handlerHabitStore{err: errors.New("database details")}))
		response := httptest.NewRecorder()
		handler.List(response, httptest.NewRequest(http.MethodGet, "/api/habits", nil))
		if response.Code != http.StatusInternalServerError || strings.Contains(response.Body.String(), "database details") {
			t.Fatalf("response = %d %s", response.Code, response.Body.String())
		}
	})
}

func TestCompletionHandlers(t *testing.T) {
	t.Run("list validates range", func(t *testing.T) {
		handler := NewHandler(service.NewHabitService(&handlerHabitStore{}))
		response := httptest.NewRecorder()
		handler.ListCompletions(response, httptest.NewRequest(http.MethodGet, "/api/habits/completions?start=2026-09-31&end=2026-10-01", nil))
		if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "start must be a valid") {
			t.Fatalf("response = %d %s", response.Code, response.Body.String())
		}
	})

	t.Run("list returns records", func(t *testing.T) {
		stub := &handlerHabitStore{completions: []model.HabitCompletion{{HabitID: "habit-1", Date: "2026-09-05"}}}
		handler := NewHandler(service.NewHabitService(stub))
		response := httptest.NewRecorder()
		handler.ListCompletions(response, httptest.NewRequest(http.MethodGet, "/api/habits/completions?start=2026-09-05&end=2026-09-05", nil))
		if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"habitId":"habit-1"`) {
			t.Fatalf("response = %d %s", response.Code, response.Body.String())
		}
	})

	t.Run("toggle returns resulting state", func(t *testing.T) {
		handler := NewHandler(service.NewHabitService(&handlerHabitStore{completed: true}))
		response := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodPost, "/api/habits/completions", strings.NewReader(`{"habitId":"habit-1","date":"2026-09-05"}`))
		handler.ToggleCompletion(response, request)
		if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"completed":true`) {
			t.Fatalf("response = %d %s", response.Code, response.Body.String())
		}
	})

	t.Run("missing habit returns not found", func(t *testing.T) {
		handler := NewHandler(service.NewHabitService(&handlerHabitStore{err: store.ErrHabitNotFound}))
		response := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, "/api/habits/missing/completions?start=2026-09-01&end=2026-09-05", nil)
		request.SetPathValue("habitId", "missing")
		handler.ListCompletionsForHabit(response, request)
		if response.Code != http.StatusNotFound || !strings.Contains(response.Body.String(), "habit not found") {
			t.Fatalf("response = %d %s", response.Code, response.Body.String())
		}
	})

	t.Run("internal error is generic JSON", func(t *testing.T) {
		handler := NewHandler(service.NewHabitService(&handlerHabitStore{err: errors.New("database details")}))
		response := httptest.NewRecorder()
		handler.ListCompletions(response, httptest.NewRequest(http.MethodGet, "/api/habits/completions?start=2026-09-01&end=2026-09-05", nil))
		if response.Code != http.StatusInternalServerError || strings.Contains(response.Body.String(), "database details") || response.Header().Get("Content-Type") != "application/json" {
			t.Fatalf("response = %d %s", response.Code, response.Body.String())
		}
	})
}
