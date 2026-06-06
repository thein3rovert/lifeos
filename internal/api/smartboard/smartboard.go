package smartboard

import (
	"encoding/json"
	"net/http"

	"github.com/thein3rovert/lifeos/internal/api"
	service "github.com/thein3rovert/lifeos/internal/services"
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

	// Refresh panel via service
	panel, err := h.service.RefreshPanel(panelType, force)
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
