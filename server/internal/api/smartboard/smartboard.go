package smartboard

import (
	"encoding/json"
	"net/http"

	"github.com/thein3rovert/lifeos/server/internal/api"
	service "github.com/thein3rovert/lifeos/server/internal/services"
)

// SmartBoardHandler handles smart board panel requests
type SmartBoardHandler struct {
	service *service.SmartBoardService
}

// NewSmartBoardHandler creates a new smart board handler
func NewSmartBoardHandler(service *service.SmartBoardService) *SmartBoardHandler {
	return &SmartBoardHandler{
		service: service,
	}
}

// RefreshPanel refreshes a specific panel with fresh AI data
// POST /api/smartboard/refresh/:panelType
func (h *SmartBoardHandler) RefreshPanel(w http.ResponseWriter, r *http.Request) {
	// Extract panel type from URL path
	panelType := r.PathValue("panelType")
	if panelType == "" {
		api.RespondError(w, http.StatusBadRequest, "panelType is required")
		return
	}

	// Validate panel type
	validTypes := map[string]bool{
		"things-to-remember": true,
		"suggestions":        true,
		"achievements":       true,
		"blockers":           true,
	}
	if !validTypes[panelType] {
		api.RespondError(w, http.StatusBadRequest, "invalid panelType")
		return
	}

	// Optional ?force=true bypasses the source-fingerprint cache
	force := r.URL.Query().Get("force") == "true"

	// Refresh panel via service (reuses existing session)
	panel, err := h.service.RefreshPanel(panelType, force, false)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Parse JSON data for response
	var data interface{}
	if err := json.Unmarshal([]byte(panel.Data), &data); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to parse panel data")
		return
	}

	response := map[string]interface{}{
		"panelType":     panel.PanelType,
		"data":          data,
		"lastRefreshed": panel.LastRefreshed,
	}

	api.RespondJSON(w, http.StatusOK, response)
}

// ResetPanel refreshes a panel with a fresh OpenCode session
// POST /api/smartboard/refresh/:panelType/reset
func (h *SmartBoardHandler) ResetPanel(w http.ResponseWriter, r *http.Request) {
	// Extract panel type from URL path
	panelType := r.PathValue("panelType")
	if panelType == "" {
		api.RespondError(w, http.StatusBadRequest, "panelType is required")
		return
	}

	// Validate panel type
	validTypes := map[string]bool{
		"things-to-remember": true,
		"suggestions":        true,
		"achievements":       true,
		"blockers":           true,
	}
	if !validTypes[panelType] {
		api.RespondError(w, http.StatusBadRequest, "invalid panelType")
		return
	}

	// Reset panel via service (force=true, newSession=true)
	panel, err := h.service.RefreshPanel(panelType, true, true)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Parse JSON data for response
	var data interface{}
	if err := json.Unmarshal([]byte(panel.Data), &data); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to parse panel data")
		return
	}

	response := map[string]interface{}{
		"panelType":     panel.PanelType,
		"data":          data,
		"lastRefreshed": panel.LastRefreshed,
	}

	api.RespondJSON(w, http.StatusOK, response)
}

// GetPanel retrieves cached panel data
// GET /api/smartboard/:panelType
func (h *SmartBoardHandler) GetPanel(w http.ResponseWriter, r *http.Request) {
	// Extract panel type from URL path
	panelType := r.PathValue("panelType")
	if panelType == "" {
		api.RespondError(w, http.StatusBadRequest, "panelType is required")
		return
	}

	// Get cached panel
	panel, err := h.service.GetCachedPanel(panelType)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// No cached data yet
	if panel == nil {
		api.RespondJSON(w, http.StatusOK, map[string]interface{}{
			"panelType":     panelType,
			"data":          nil,
			"lastRefreshed": nil,
		})
		return
	}

	// Parse JSON data for response
	var data interface{}
	if err := json.Unmarshal([]byte(panel.Data), &data); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to parse panel data")
		return
	}

	response := map[string]interface{}{
		"panelType":     panel.PanelType,
		"data":          data,
		"lastRefreshed": panel.LastRefreshed,
	}

	api.RespondJSON(w, http.StatusOK, response)
}

// UpdateItemStatus updates the status of a specific item
// PATCH /api/smartboard/item/:itemId
func (h *SmartBoardHandler) UpdateItemStatus(w http.ResponseWriter, r *http.Request) {
	// Extract item ID from URL path
	itemID := r.PathValue("itemId")
	if itemID == "" {
		api.RespondError(w, http.StatusBadRequest, "itemId is required")
		return
	}

	// Decode request body
	var req struct {
		PanelType string `json:"panelType"`
		Status    string `json:"status"`
	}
	if err := api.DecodeJSON(r, &req); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.PanelType == "" || req.Status == "" {
		api.RespondError(w, http.StatusBadRequest, "panelType and status are required")
		return
	}

	// Update status via service
	if err := h.service.UpdateItemStatus(req.PanelType, itemID, req.Status); err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "status updated successfully",
	})
}

// UpdateItemContent updates the content fields of a specific item in a card preview
// PATCH /api/smartboard/item/{itemId}/content
func (h *SmartBoardHandler) UpdateItemContent(w http.ResponseWriter, r *http.Request) {
	itemID := r.PathValue("itemId")
	if itemID == "" {
		api.RespondError(w, http.StatusBadRequest, "itemId is required")
		return
	}

	var req struct {
		PanelType string            `json:"panelType"`
		Fields    map[string]string `json:"fields"`
	}
	if err := api.DecodeJSON(r, &req); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.PanelType == "" || len(req.Fields) == 0 {
		api.RespondError(w, http.StatusBadRequest, "panelType and fields are required")
		return
	}

	if err := h.service.UpdateItemContent(req.PanelType, itemID, req.Fields); err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "content updated successfully",
	})
}

// GetScheduleStatus returns the scheduler status (next refresh, last error) for all panels.
// GET /api/smartboard/schedule
func (h *SmartBoardHandler) GetScheduleStatus(w http.ResponseWriter, r *http.Request) {
	status := h.service.ScheduleStatus()
	if status == nil {
		api.RespondJSON(w, http.StatusOK, map[string]interface{}{})
		return
	}
	api.RespondJSON(w, http.StatusOK, status)
}

// PausePanel pauses auto-refresh for a specific panel
// POST /api/smartboard/schedule/:panelType/pause
func (h *SmartBoardHandler) PausePanel(w http.ResponseWriter, r *http.Request) {
	panelType := r.PathValue("panelType")
	if panelType == "" {
		api.RespondError(w, http.StatusBadRequest, "panelType is required")
		return
	}

	if err := h.service.PausePanel(panelType); err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "panel paused successfully",
	})
}

// ResumePanel resumes auto-refresh for a specific panel
// POST /api/smartboard/schedule/:panelType/resume
func (h *SmartBoardHandler) ResumePanel(w http.ResponseWriter, r *http.Request) {
	panelType := r.PathValue("panelType")
	if panelType == "" {
		api.RespondError(w, http.StatusBadRequest, "panelType is required")
		return
	}

	if err := h.service.ResumePanel(panelType); err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "panel resumed successfully",
	})
}

// PauseAllPanels pauses all panel auto-refreshes
// POST /api/smartboard/schedule/pause-all
func (h *SmartBoardHandler) PauseAllPanels(w http.ResponseWriter, r *http.Request) {
	if err := h.service.PauseAllPanels(); err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "all panels paused successfully",
	})
}

// ResumeAllPanels resumes all panel auto-refreshes
// POST /api/smartboard/schedule/resume-all
func (h *SmartBoardHandler) ResumeAllPanels(w http.ResponseWriter, r *http.Request) {
	if err := h.service.ResumeAllPanels(); err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "all panels resumed successfully",
	})
}

// SetPanelSchedule updates the schedule configuration for a panel
// POST /api/smartboard/schedule/:panelType
func (h *SmartBoardHandler) SetPanelSchedule(w http.ResponseWriter, r *http.Request) {
	panelType := r.PathValue("panelType")
	if panelType == "" {
		api.RespondError(w, http.StatusBadRequest, "panelType is required")
		return
	}

	var req struct {
		Mode            string `json:"mode"`            // "interval" or "weekly"
		IntervalMinutes int    `json:"intervalMinutes"` // for interval mode
		WeeklyDay       int    `json:"weeklyDay"`       // 0-6 for weekly mode
		WeeklyHour      int    `json:"weeklyHour"`      // 0-23 for weekly mode
	}

	if err := api.DecodeJSON(r, &req); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate mode
	if req.Mode != "interval" && req.Mode != "weekly" {
		api.RespondError(w, http.StatusBadRequest, "mode must be 'interval' or 'weekly'")
		return
	}

	// Validate based on mode
	if req.Mode == "interval" && req.IntervalMinutes <= 0 {
		api.RespondError(w, http.StatusBadRequest, "intervalMinutes must be positive for interval mode")
		return
	}

	if req.Mode == "weekly" {
		if req.WeeklyDay < 0 || req.WeeklyDay > 6 {
			api.RespondError(w, http.StatusBadRequest, "weeklyDay must be between 0-6")
			return
		}
		if req.WeeklyHour < 0 || req.WeeklyHour > 23 {
			api.RespondError(w, http.StatusBadRequest, "weeklyHour must be between 0-23")
			return
		}
	}

	if err := h.service.SetPanelSchedule(panelType, req.Mode, req.IntervalMinutes, req.WeeklyDay, req.WeeklyHour); err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "schedule updated successfully",
	})
}
