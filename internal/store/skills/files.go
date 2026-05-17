package skills

import (
	"database/sql"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
)

// Add this at the start of the file
func init() {
	// Migration: add pending_sync column to skill_files table
}

// CreateSkillFilesTable creates the skill_files table with pending_sync
func (s *SQLSkillStore) createSkillFilesTable() error {
	query := `
	CREATE TABLE IF NOT EXISTS skill_files (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		skill_id TEXT NOT NULL,
		path TEXT NOT NULL,
		type TEXT,
		name TEXT,
		content TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		pending_sync BOOLEAN DEFAULT FALSE,
		github_sha TEXT,
		UNIQUE(skill_id, path)
	);
	CREATE INDEX IF NOT EXISTS idx_skill_files_pending ON skill_files(pending_sync);
	`
	_, err := s.db.Exec(query)
	if err != nil {
		return err
	}
	// Migration: add column if table exists
	_, _ = s.db.Exec(`ALTER TABLE skill_files ADD COLUMN pending_sync BOOLEAN DEFAULT FALSE`)
	_, _ = s.db.Exec(`ALTER TABLE skill_files ADD COLUMN github_sha TEXT`)
	return nil
}

// SaveSkillFile inserts or updates a skill file
func (s *SQLSkillStore) SaveSkillFile(file *model.SkillFile) error {
	query := `
		INSERT INTO skill_files (skill_id, path, type, name, content, updated_at, pending_sync, github_sha)
		VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)
		ON CONFLICT(skill_id, path) DO UPDATE SET
			type = excluded.type,
			name = excluded.name,
			content = excluded.content,
			updated_at = excluded.updated_at,
			pending_sync = TRUE,
			github_sha = excluded.github_sha
	`
	_, err := s.db.Exec(query,
		file.SkillID,
		file.Path,
		file.Type,
		file.Name,
		file.Content,
		time.Now(),
	)
	return err
}

// GetSkillFiles retrieves all files for a skill
func (s *SQLSkillStore) GetSkillFiles(skillID string) ([]model.SkillFile, error) {
	query := `
		SELECT id, skill_id, path, type, name, content, updated_at
		FROM skill_files
		WHERE skill_id = ?
		ORDER BY path ASC
	`
	rows, err := s.db.Query(query, skillID)
	if err != nil {
		return []model.SkillFile{}, err
	}
	defer rows.Close()

	files := []model.SkillFile{}
	for rows.Next() {
		var f model.SkillFile
		var content sql.NullString
		err := rows.Scan(&f.ID, &f.SkillID, &f.Path, &f.Type, &f.Name, &content, &f.UpdatedAt)
		if err != nil {
			return []model.SkillFile{}, err
		}
		if content.Valid {
			f.Content = content.String
		}
		files = append(files, f)
	}
	return files, rows.Err()
}


func (s *SQLSkillStore) GetModifiedSkillFiles() ([]model.SkillFile, error) {
	query := `
		SELECT id, skill_id, path, type, name, content, updated_at
		FROM skill_files
		WHERE pending_sync = TRUE
	`
	rows, err := s.db.Query(query)
	if err != nil {
		return []model.SkillFile{}, err
	}
	defer rows.Close()

	var files []model.SkillFile

	for rows.Next() {
		var f model.SkillFile
		var content sql.NullString

		err := rows.Scan(&f.ID, &f.SkillID, &f.Path, &f.Type, &f.Name, &content, &f.UpdatedAt)
		if err != nil {
			return []model.SkillFile{}, err
		}

		if content.Valid {
			f.Content = content.String
		}

		files = append(files, f)
	}
	return files, rows.Err()
}


func (s *SQLSkillStore) ClearPendingSync() error {
	query := `UPDATE skill_files SET pending_sync = FALSE WHERE pending_sync = TRUE`
	_, err := s.db.Exec(query)
	return err
}

// DeleteSkillFiles removes all files for a skill (used when syncing)
func (s *SQLSkillStore) DeleteSkillFiles(skillID string) error {
	query := `DELETE FROM skill_files WHERE skill_id = ?`
	_, err := s.db.Exec(query, skillID)
	return err
}

// GetSkillFileByPath retrieves a single file by path
func (s *SQLSkillStore) GetSkillFileByPath(skillID, path string) (*model.SkillFile, error) {
	query := `
		SELECT id, skill_id, path, type, name, content, updated_at
		FROM skill_files
		WHERE skill_id = ? AND path = ?
	`
	var f model.SkillFile
	var content sql.NullString
	err := s.db.QueryRow(query, skillID, path).Scan(
		&f.ID, &f.SkillID, &f.Path, &f.Type, &f.Name, &content, &f.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if content.Valid {
		f.Content = content.String
	}
	return &f, nil
}
