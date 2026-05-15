package skills

import (
	"database/sql"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
)

// SaveSkillFile inserts or updates a skill file
func (s *SQLSkillStore) SaveSkillFile(file *model.SkillFile) error {
	query := `
		INSERT INTO skill_files (skill_id, path, type, name, content, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(skill_id, path) DO UPDATE SET
			type = excluded.type,
			name = excluded.name,
			content = excluded.content,
			updated_at = excluded.updated_at
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
		return nil, err
	}
	defer rows.Close()

	var files []model.SkillFile
	for rows.Next() {
		var f model.SkillFile
		var content sql.NullString
		err := rows.Scan(&f.ID, &f.SkillID, &f.Path, &f.Type, &f.Name, &content, &f.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if content.Valid {
			f.Content = content.String
		}
		files = append(files, f)
	}
	return files, rows.Err()
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
