package github

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
)

// SkillStore implements store.SkillStore interface using GitHub
type SkillStore struct {
	client     *Client
	owner      string
	repo       string
	branch     string
	skillsPath string
}

// NewSkillStore creates a GitHub-backed skill store
func NewSkillStore(owner, repo, token string) *SkillStore {
	return &SkillStore{
		client:     NewClient(owner, repo, token),
		owner:      owner,
		repo:       repo,
		branch:     "main",
		skillsPath: "skills",
	}
}

// ListSkills fetches all skill directories from the repo
// Each skill is a directory containing SKILL.md
func (s *SkillStore) ListSkills() ([]model.Skill, error) {
	ctx := context.Background()

	// List all items in skills/ directory
	contents, err := s.client.ListDirectoryContents(ctx, s.skillsPath)
	if err != nil {
		return nil, err
	}

	var skills []model.Skill
	for _, item := range contents {
		// Only process directories (skill folders)
		if item.Type == "dir" {
			id := item.Name
			skill, err := s.GetSkill(id)
			if err != nil {
				continue
			}
			skills = append(skills, *skill)
		}
	}
	return skills, nil
}

// GetSkill fetches a single skill file from GitHub
// Skills are stored as skills/{id}/SKILL.md
func (s *SkillStore) GetSkill(id string) (*model.Skill, error) {
	ctx := context.Background()
	path := fmt.Sprintf("%s/%s/SKILL.md", s.skillsPath, id)

	content, err := s.client.GetFileContent(ctx, path)
	if err != nil {
		return nil, err
	}

	skill := &model.Skill{
		ID:      id,
		Content: content,
	}

	// Parse frontmatter (supports both LifeOS and Opencode formats)
	if strings.HasPrefix(content, "---") {
		lines := strings.Split(content, "\n")
		for _, line := range lines[1:] {
			// LifeOS format: title:
			if strings.HasPrefix(line, "title:") {
				skill.Title = strings.TrimSpace(strings.TrimPrefix(line, "title:"))
			}
			// Opencode format: name:
			if strings.HasPrefix(line, "name:") {
				skill.Title = strings.TrimSpace(strings.TrimPrefix(line, "name:"))
			}
			// LifeOS format: format:
			if strings.HasPrefix(line, "format:") {
				skill.Format = strings.TrimSpace(strings.TrimPrefix(line, "format:"))
			}
			// Opencode format: compatibility:
			if strings.HasPrefix(line, "compatibility:") {
				skill.Format = strings.TrimSpace(strings.TrimPrefix(line, "compatibility:"))
			}
			if line == "---" {
				break
			}
		}
	}

	// Fallback: use ID as title if no title found
	if skill.Title == "" {
		skill.Title = skill.ID
	}

	return skill, nil
}

// SaveSkill creates/updates a file and opens a PR
// Skills are stored as skills/{id}/SKILL.md
func (s *SkillStore) SaveSkill(skill *model.Skill) error {
	ctx := context.Background()

	// 1. Get current file SHA (if exists)
	path := fmt.Sprintf("%s/%s/SKILL.md", s.skillsPath, skill.ID)
	sha, err := s.client.GetFileSHA(ctx, path)
	if err != nil {
		sha = ""
	}

	// 2. Create a new branch
	branchName := fmt.Sprintf("update-skill-%s-%d", skill.ID, time.Now().Unix())
	if err := s.client.CreateBranch(ctx, branchName, s.branch); err != nil {
		return err
	}

	// 3. Commit the file
	message := fmt.Sprintf("Update skill: %s", skill.ID)
	if err := s.client.CommitFile(ctx, path, skill.Content, sha, branchName, message); err != nil {
		return err
	}

	// 4. Create PR
	title := fmt.Sprintf("Update skill: %s", skill.ID)
	body := "Automated update from LifeOS"
	return s.client.CreatePR(ctx, title, branchName, s.branch, body)
}