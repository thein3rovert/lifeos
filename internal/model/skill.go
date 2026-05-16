package model

import "time"

// Skill represents a skill document
type Skill struct {
	ID                string // filename without .md
	Title             string // from frontmatter
	Format            string // opencode, claude, copilot
	Author            string
	Content           string    // the markdown content
	UpdatedAt         time.Time // local modification time
	SyncedAt          time.Time // last time synced with GitHub
	PendingSync       bool      // true if local changes need to be pushed
	GitHubSHA         string    // GitHub blob SHA for conflict detection
	OpenCodeSessionID string    // OpenCode session ID for persistent chat
}

// SkillFile represents a file or folder in a skill's reference directory
type SkillFile struct {
	ID        int64     `json:"id"`
	SkillID   string    `json:"skill_id"`
	Path      string    `json:"path"`    // relative path from skill root (e.g., "references/example.md")
	Type      string    `json:"type"`    // "file" or "dir"
	Name      string    `json:"name"`    // file/folder name
	Content   string    `json:"content"` // file content (empty for dirs)
	UpdatedAt time.Time `json:"updated_at"`
}
