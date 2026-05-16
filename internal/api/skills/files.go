package skills

import (
	"encoding/json"
	"net/http"

	"github.com/thein3rovert/lifeos/internal/store/skills"
)

type SkillFileHandler struct {
	skillStore *skills.SQLSkillStore
}

// Return new instance of the skill file handler
func NewSkillFileHandler(skillStore *skills.SQLSkillStore) *SkillFileHandler {
	return &SkillFileHandler{skillStore: skillStore}
}

// GET /api/skills/{id}/files - List all files for a skills references
func (h *SkillFileHandler) ListFile(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")

	files, err := h.skillStore.GetSkillFiles(skillID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)

}

// GET /api/skills/{id}/files/{path...} - List single file by path
func (h *SkillFileHandler) GetFile(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")
	path := r.PathValue("path")

	file, err := h.skillStore.GetSkillFileByPath(skillID, path)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(file)
}
