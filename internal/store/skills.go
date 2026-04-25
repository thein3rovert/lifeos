package store

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
)

// SQLSkillStore implements SkillStore using SQLite as the primary source
type SQLSkillStore struct {
	db          *sql.DB
	githubStore SkillStore // GitHub store for sync operations
}

// NewSQLSkillStore creates a SQLite-backed skill store
func NewSQLSkillStore(db *sql.DB, githubStore SkillStore) (*SQLSkillStore, error) {
	s := &SQLSkillStore{
		db:          db,
		githubStore: githubStore,
	}
	
	if err := s.createTable(); err != nil {
		return nil, fmt.Errorf("failed to create skills table: %w", err)
	}
	
	return s, nil
}

// createTable creates the skills table with sync tracking
func (s *SQLSkillStore) createTable() error {
	query := `
	CREATE TABLE IF NOT EXISTS skills (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		format TEXT,
		author TEXT,
		content TEXT NOT NULL,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		synced_at DATETIME,
		pending_sync BOOLEAN DEFAULT FALSE,
		github_sha TEXT
	);
	
	CREATE INDEX IF NOT EXISTS idx_skills_pending ON skills(pending_sync);
	CREATE INDEX IF NOT EXISTS idx_skills_synced ON skills(synced_at);
	`
	
	_, err := s.db.Exec(query)
	return err
}

// ListSkills returns all skills from SQLite
func (s *SQLSkillStore) ListSkills() ([]model.Skill, error) {
	query := `
		SELECT id, title, format, author, content, updated_at, synced_at, pending_sync, github_sha
		FROM skills
		ORDER BY title
	`
	
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	skills, err := s.scanSkills(rows)
	if err != nil {
		return nil, err
	}
	
	log.Printf("[SQLite] Loaded %d skills from database", len(skills))
	return skills, nil
}

// GetSkill returns a single skill from SQLite
func (s *SQLSkillStore) GetSkill(id string) (*model.Skill, error) {
	query := `
		SELECT id, title, format, author, content, updated_at, synced_at, pending_sync, github_sha
		FROM skills
		WHERE id = ?
	`
	
	row := s.db.QueryRow(query, id)
	skill, err := s.scanSkill(row)
	if err != nil {
		return nil, err
	}
	
	log.Printf("[SQLite] Loaded skill '%s' from database", id)
	return skill, nil
}

// SaveSkill saves to SQLite, marks as pending_sync
func (s *SQLSkillStore) SaveSkill(skill *model.Skill) error {
	query := `
		INSERT INTO skills (id, title, format, author, content, updated_at, synced_at, pending_sync, github_sha)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			title = excluded.title,
			format = excluded.format,
			author = excluded.author,
			content = excluded.content,
			updated_at = CURRENT_TIMESTAMP,
			pending_sync = TRUE
	`
	
	_, err := s.db.Exec(query,
		skill.ID,
		skill.Title,
		skill.Format,
		skill.Author,
		skill.Content,
		skill.UpdatedAt,
		skill.SyncedAt,
		skill.PendingSync,
		skill.GitHubSHA,
	)
	
	return err
}

// Sync pulls all skills from GitHub and upserts to SQLite
func (s *SQLSkillStore) Sync() error {
	if s.githubStore == nil {
		return fmt.Errorf("no GitHub store configured")
	}
	
	// Fetch all skills from GitHub
	githubSkills, err := s.githubStore.ListSkills()
	if err != nil {
		return fmt.Errorf("failed to fetch from GitHub: %w", err)
	}
	
	// Upsert each skill
	for _, skill := range githubSkills {
		skill.SyncedAt = time.Now()
		skill.PendingSync = false
		
		if err := s.upsertSkillFromGitHub(&skill); err != nil {
			// Log but continue - don't fail entire sync for one skill
			fmt.Printf("Warning: failed to sync skill %s: %v\n", skill.ID, err)
		}
	}
	
	return nil
}

// upsertSkillFromGitHub inserts or updates skill from GitHub (preserves local pending changes)
func (s *SQLSkillStore) upsertSkillFromGitHub(skill *model.Skill) error {
	// Check if we have pending local changes
	existing, err := s.GetSkill(skill.ID)
	if err == nil && existing.PendingSync {
		// Local has pending changes - don't overwrite, just update metadata
		// TODO: Implement conflict resolution
		return nil
	}
	
	query := `
		INSERT INTO skills (id, title, format, author, content, updated_at, synced_at, pending_sync, github_sha)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			title = excluded.title,
			format = excluded.format,
			author = excluded.author,
			content = excluded.content,
			updated_at = excluded.updated_at,
			synced_at = excluded.synced_at,
			pending_sync = FALSE,
			github_sha = excluded.github_sha
	`
	
	_, err = s.db.Exec(query,
		skill.ID,
		skill.Title,
		skill.Format,
		skill.Author,
		skill.Content,
		skill.UpdatedAt,
		skill.SyncedAt,
		false,
		skill.GitHubSHA,
	)
	
	return err
}

// GetPendingSkills returns skills with local changes needing push
func (s *SQLSkillStore) GetPendingSkills() ([]model.Skill, error) {
	query := `
		SELECT id, title, format, author, content, updated_at, synced_at, pending_sync, github_sha
		FROM skills
		WHERE pending_sync = TRUE
	`
	
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	return s.scanSkills(rows)
}

// PushToGitHub pushes pending skills to GitHub
func (s *SQLSkillStore) PushToGitHub() error {
	if s.githubStore == nil {
		return fmt.Errorf("no GitHub store configured")
	}
	
	pending, err := s.GetPendingSkills()
	if err != nil {
		return err
	}
	
	for _, skill := range pending {
		if err := s.githubStore.SaveSkill(&skill); err != nil {
			return fmt.Errorf("failed to push skill %s: %w", skill.ID, err)
		}
		
		// Mark as synced
		skill.PendingSync = false
		skill.SyncedAt = time.Now()
		if err := s.updateSyncStatus(&skill); err != nil {
			return fmt.Errorf("failed to update sync status for %s: %w", skill.ID, err)
		}
	}
	
	return nil
}

// updateSyncStatus updates only the sync-related fields
func (s *SQLSkillStore) updateSyncStatus(skill *model.Skill) error {
	query := `UPDATE skills SET pending_sync = ?, synced_at = ? WHERE id = ?`
	_, err := s.db.Exec(query, skill.PendingSync, skill.SyncedAt, skill.ID)
	return err
}

// scanSkills scans multiple rows
func (s *SQLSkillStore) scanSkills(rows *sql.Rows) ([]model.Skill, error) {
	var skills []model.Skill
	
	for rows.Next() {
		skill, err := s.scanSkillFromRows(rows)
		if err != nil {
			return nil, err
		}
		skills = append(skills, skill)
	}
	
	return skills, rows.Err()
}

// scanSkill scans a single row
func (s *SQLSkillStore) scanSkill(row *sql.Row) (*model.Skill, error) {
	var skill model.Skill
	var updatedAt, syncedAt sql.NullTime
	var githubSHA sql.NullString
	
	err := row.Scan(
		&skill.ID,
		&skill.Title,
		&skill.Format,
		&skill.Author,
		&skill.Content,
		&updatedAt,
		&syncedAt,
		&skill.PendingSync,
		&githubSHA,
	)
	
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("skill not found")
	}
	if err != nil {
		return nil, err
	}
	
	if updatedAt.Valid {
		skill.UpdatedAt = updatedAt.Time
	}
	if syncedAt.Valid {
		skill.SyncedAt = syncedAt.Time
	}
	if githubSHA.Valid {
		skill.GitHubSHA = githubSHA.String
	}
	
	return &skill, nil
}

// scanSkillFromRows scans from Rows (for ListSkills)
func (s *SQLSkillStore) scanSkillFromRows(rows *sql.Rows) (model.Skill, error) {
	var skill model.Skill
	var updatedAt, syncedAt sql.NullTime
	var githubSHA sql.NullString
	
	err := rows.Scan(
		&skill.ID,
		&skill.Title,
		&skill.Format,
		&skill.Author,
		&skill.Content,
		&updatedAt,
		&syncedAt,
		&skill.PendingSync,
		&githubSHA,
	)
	
	if err != nil {
		return skill, err
	}
	
	if updatedAt.Valid {
		skill.UpdatedAt = updatedAt.Time
	}
	if syncedAt.Valid {
		skill.SyncedAt = syncedAt.Time
	}
	if githubSHA.Valid {
		skill.GitHubSHA = githubSHA.String
	}
	
	return skill, nil
}

// ParseFrontmatter extracts title, format, author from markdown content
func ParseFrontmatter(content string) (title, format, author string) {
	if !strings.HasPrefix(content, "---") {
		return
	}
	
	lines := strings.Split(content, "\n")
	for _, line := range lines[1:] {
		if strings.HasPrefix(line, "title:") {
			title = strings.TrimSpace(strings.TrimPrefix(line, "title:"))
		}
		if strings.HasPrefix(line, "name:") {
			title = strings.TrimSpace(strings.TrimPrefix(line, "name:"))
		}
		if strings.HasPrefix(line, "format:") {
			format = strings.TrimSpace(strings.TrimPrefix(line, "format:"))
		}
		if strings.HasPrefix(line, "compatibility:") {
			format = strings.TrimSpace(strings.TrimPrefix(line, "compatibility:"))
		}
		if strings.HasPrefix(line, "author:") {
			author = strings.TrimSpace(strings.TrimPrefix(line, "author:"))
		}
		if line == "---" {
			break
		}
	}
	
	return
}