package model

import "time"

// Skill represents a skill document
type Skill struct {
	ID          string    // filename without .md
	Title       string    // from frontmatter
	Format      string    // opencode, claude, copilot
	Author      string
	Content     string    // the markdown content
	UpdatedAt   time.Time // local modification time
	SyncedAt    time.Time // last time synced with GitHub
	PendingSync bool      // true if local changes need to be pushed
	GitHubSHA   string    // GitHub blob SHA for conflict detection
}
