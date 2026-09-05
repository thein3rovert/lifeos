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
	habits []model.Habit
	err    error
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
