package model

import "time"

// Skill represents a skill document
type Skill struct {
	ID        string // filename without .md
	Title     string // from frontmatter
	Format    string // opencode, claude, copilot
	Author    string
	Content   string // the markdown content
	UpdatedAt time.Time
}
