package habit

import (
	"errors"
	"net/http"

	"github.com/thein3rovert/lifeos/server/internal/api"
	"github.com/thein3rovert/lifeos/server/internal/model"
	service "github.com/thein3rovert/lifeos/server/internal/services"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

type Handler struct {
	service *service.HabitService
}

func NewHandler(service *service.HabitService) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	habits, err := h.service.ListHabits()
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if habits == nil {
		habits = []model.Habit{}
	}
	api.RespondJSON(w, http.StatusOK, map[string]any{"habits": habits})
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input service.CreateHabitInput
	if err := api.DecodeJSON(r, &input); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	habit, err := h.service.CreateHabit(input)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	api.RespondJSON(w, http.StatusCreated, habit)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("habitId")
	if id == "" {
		api.RespondError(w, http.StatusBadRequest, "habitId is required")
		return
	}
	var input service.UpdateHabitInput
	if err := api.DecodeJSON(r, &input); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	habit, err := h.service.UpdateHabit(id, input)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	api.RespondJSON(w, http.StatusOK, habit)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("habitId")
	if id == "" {
		api.RespondError(w, http.StatusBadRequest, "habitId is required")
		return
	}
	if err := h.service.DeleteHabit(id); err != nil {
		respondServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ListCompletions(w http.ResponseWriter, r *http.Request) {
	completions, err := h.service.ListHabitCompletions(r.URL.Query().Get("start"), r.URL.Query().Get("end"))
	if err != nil {
		respondServiceError(w, err)
		return
	}
	if completions == nil {
		completions = []model.HabitCompletion{}
	}
	api.RespondJSON(w, http.StatusOK, map[string]any{"completions": completions})
}

func (h *Handler) ListCompletionsForHabit(w http.ResponseWriter, r *http.Request) {
	completions, err := h.service.ListCompletionsForHabit(
		r.PathValue("habitId"), r.URL.Query().Get("start"), r.URL.Query().Get("end"),
	)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	if completions == nil {
		completions = []model.HabitCompletion{}
	}
	api.RespondJSON(w, http.StatusOK, map[string]any{"completions": completions})
}

func (h *Handler) ToggleCompletion(w http.ResponseWriter, r *http.Request) {
	var input service.ToggleHabitCompletionInput
	if err := api.DecodeJSON(r, &input); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	completed, err := h.service.ToggleHabitCompletion(input)
	if err != nil {
		respondServiceError(w, err)
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]bool{"completed": completed})
}

func respondServiceError(w http.ResponseWriter, err error) {
	var validationErr *service.ValidationError
	switch {
	case errors.As(err, &validationErr):
		api.RespondError(w, http.StatusBadRequest, validationErr.Error())
	case errors.Is(err, store.ErrHabitNotFound):
		api.RespondError(w, http.StatusNotFound, "habit not found")
	default:
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
	}
}
