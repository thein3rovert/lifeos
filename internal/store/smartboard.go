package store

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
)

// SmartBoardStore defines operations for smart board panels
type SmartBoardStore interface {
	SavePanel(panelType string, data interface{}, sessionID, sourceFingerprint string) error
	GetLatestPanel(panelType string) (*model.SmartBoardPanel, error)
	UpdateItemStatus(panelType, itemID, status string) error
	UpdateItemContent(panelType, itemID string, fields map[string]string) error
}

// SQLSmartBoardStore implements SmartBoardStore using SQLite
type SQLSmartBoardStore struct {
	db *sql.DB
}

// NewSmartBoardStore creates a new smart board store
func NewSmartBoardStore(db *sql.DB) *SQLSmartBoardStore {
	return &SQLSmartBoardStore{db: db}
}

// SavePanel saves panel data to the database
func (s *SQLSmartBoardStore) SavePanel(panelType string, data interface{}, sessionID, sourceFingerprint string) error {
	// Marshal data to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	query := `INSERT INTO smartboard_panels (panel_type, data, session_id, source_fingerprint, last_refreshed, created_at)
	          VALUES (?, ?, ?, ?, ?, ?)`

	now := time.Now()
	_, err = s.db.Exec(query, panelType, string(jsonData), sessionID, sourceFingerprint, now, now)
	return err
}

// GetLatestPanel retrieves the most recent panel data for a given type
func (s *SQLSmartBoardStore) GetLatestPanel(panelType string) (*model.SmartBoardPanel, error) {
	query := `SELECT id, panel_type, data, COALESCE(session_id, ''), COALESCE(source_fingerprint, ''), last_refreshed, created_at
	          FROM smartboard_panels
	          WHERE panel_type = ?
	          ORDER BY last_refreshed DESC
	          LIMIT 1`

	var panel model.SmartBoardPanel
	err := s.db.QueryRow(query, panelType).Scan(
		&panel.ID,
		&panel.PanelType,
		&panel.Data,
		&panel.SessionID,
		&panel.SourceFingerprint,
		&panel.LastRefreshed,
		&panel.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil // No cached data yet
	}

	if err != nil {
		return nil, err
	}

	return &panel, nil
}

// UpdateItemStatus updates the status of a specific item within a panel
func (s *SQLSmartBoardStore) UpdateItemStatus(panelType, itemID, status string) error {
	// Get latest panel
	panel, err := s.GetLatestPanel(panelType)
	if err != nil {
		return err
	}
	if panel == nil {
		return sql.ErrNoRows
	}

	// Parse the JSON data based on panel type
	var updatedData interface{}

	switch panelType {
	case "suggestions":
		var data model.SuggestionsData
		if err := json.Unmarshal([]byte(panel.Data), &data); err != nil {
			return err
		}

		// Find and update the item
		for i := range data.Suggestions {
			if data.Suggestions[i].ID == itemID {
				data.Suggestions[i].Status = status
				break
			}
		}
		updatedData = data

	case "things-to-remember":
		var data model.ThingsToRememberData
		if err := json.Unmarshal([]byte(panel.Data), &data); err != nil {
			return err
		}

		// Find and update the item category
		for i := range data.Items {
			if data.Items[i].ID == itemID {
				data.Items[i].Category = status // status is the new category
				break
			}
		}
		updatedData = data

	default:
		return nil // Other panel types don't support status updates
	}

	// Marshal updated data
	jsonData, err := json.Marshal(updatedData)
	if err != nil {
		return err
	}

	// Update the panel
	query := `UPDATE smartboard_panels
	          SET data = ?
	          WHERE id = ?`

	_, err = s.db.Exec(query, string(jsonData), panel.ID)
	return err
}

// UpdateItemContent updates content fields of a specific item within a panel.
// Allowed fields vary per panel type:
//   - things-to-remember: "text", "title"
//   - suggestions: "suggestion", "reasoning", "title"
//   - achievements: "achievement", "title"
//   - blockers: "blocker", "context", "title"
func (s *SQLSmartBoardStore) UpdateItemContent(panelType, itemID string, fields map[string]string) error {
	panel, err := s.GetLatestPanel(panelType)
	if err != nil {
		return err
	}
	if panel == nil {
		return sql.ErrNoRows
	}

	var updatedData interface{}

	switch panelType {
	case "things-to-remember":
		var data model.ThingsToRememberData
		if err := json.Unmarshal([]byte(panel.Data), &data); err != nil {
			return err
		}
		for i := range data.Items {
			if data.Items[i].ID == itemID {
				if v, ok := fields["text"]; ok {
					data.Items[i].Text = v
				}
				if v, ok := fields["title"]; ok {
					data.Items[i].Title = v
				}
				break
			}
		}
		updatedData = data

	case "suggestions":
		var data model.SuggestionsData
		if err := json.Unmarshal([]byte(panel.Data), &data); err != nil {
			return err
		}
		for i := range data.Suggestions {
			if data.Suggestions[i].ID == itemID {
				if v, ok := fields["suggestion"]; ok {
					data.Suggestions[i].Suggestion = v
				}
				if v, ok := fields["reasoning"]; ok {
					data.Suggestions[i].Reasoning = v
				}
				if v, ok := fields["title"]; ok {
					data.Suggestions[i].Title = v
				}
				break
			}
		}
		updatedData = data

	case "achievements":
		var data model.AchievementsData
		if err := json.Unmarshal([]byte(panel.Data), &data); err != nil {
			return err
		}
		for i := range data.Achievements {
			if data.Achievements[i].ID == itemID {
				if v, ok := fields["achievement"]; ok {
					data.Achievements[i].Achievement = v
				}
				if v, ok := fields["title"]; ok {
					data.Achievements[i].Title = v
				}
				break
			}
		}
		updatedData = data

	case "blockers":
		var data model.BlockersData
		if err := json.Unmarshal([]byte(panel.Data), &data); err != nil {
			return err
		}
		for i := range data.Blockers {
			if data.Blockers[i].ID == itemID {
				if v, ok := fields["blocker"]; ok {
					data.Blockers[i].Blocker = v
				}
				if v, ok := fields["context"]; ok {
					data.Blockers[i].Context = v
				}
				if v, ok := fields["title"]; ok {
					data.Blockers[i].Title = v
				}
				break
			}
		}
		updatedData = data

	default:
		return nil
	}

	jsonData, err := json.Marshal(updatedData)
	if err != nil {
		return err
	}

	query := `UPDATE smartboard_panels SET data = ? WHERE id = ?`
	_, err = s.db.Exec(query, string(jsonData), panel.ID)
	return err
}
