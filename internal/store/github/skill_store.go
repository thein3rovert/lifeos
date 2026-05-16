package github

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
)

// SkillStore implements store.SkillStore interface using GitHub with caching
type SkillStore struct {
	client     *Client
	owner      string
	repo       string
	branch     string
	skillsPath string

	// Cache
	cache    map[string]cachedSkill
	cacheMux sync.RWMutex
	ttl      time.Duration
}

type cachedSkill struct {
	skill    *model.Skill
	cachedAt time.Time
}

// NewSkillStore creates a GitHub-backed skill store with caching
func NewSkillStore(owner, repo, token string) *SkillStore {
	return &SkillStore{
		client:     NewClient(owner, repo, token),
		owner:      owner,
		repo:       repo,
		branch:     "main",
		skillsPath: "skills",
		cache:      make(map[string]cachedSkill),
		ttl:        5 * time.Minute, // Cache for 5 minutes
	}
}

// ListSkills fetches all skill directories (with caching)
func (s *SkillStore) ListSkills() ([]model.Skill, error) {
	// Try cache first
	s.cacheMux.RLock()
	if len(s.cache) > 0 {
		// Check if cache is still fresh
		for _, cached := range s.cache {
			if time.Since(cached.cachedAt) < s.ttl {
				s.cacheMux.RUnlock()
				return s.getAllFromCache(), nil
			}
			break // If one is stale, refresh all
		}
	}
	s.cacheMux.RUnlock()

	// Fetch from GitHub
	return s.fetchAndCacheAll()
}

// GetSkill fetches a single skill (with caching)
func (s *SkillStore) GetSkill(id string) (*model.Skill, error) {
	// Try cache first
	s.cacheMux.RLock()
	if cached, ok := s.cache[id]; ok {
		if time.Since(cached.cachedAt) < s.ttl {
			s.cacheMux.RUnlock()
			return cached.skill, nil
		}
	}
	s.cacheMux.RUnlock()

	// Fetch from GitHub
	skill, err := s.fetchFromGitHub(id)
	if err != nil {
		return nil, err
	}

	// Update cache
	s.cacheMux.Lock()
	s.cache[id] = cachedSkill{skill: skill, cachedAt: time.Now()}
	s.cacheMux.Unlock()

	return skill, nil
}

// Sync forces a refresh from GitHub
func (s *SkillStore) Sync() error {
	s.cacheMux.Lock()
	s.cache = make(map[string]cachedSkill)
	s.cacheMux.Unlock()

	_, err := s.fetchAndCacheAll()
	return err
}

// InvalidateCache clears the cache
func (s *SkillStore) InvalidateCache() {
	s.cacheMux.Lock()
	s.cache = make(map[string]cachedSkill)
	s.cacheMux.Unlock()
}

// Internal: get all from cache
func (s *SkillStore) getAllFromCache() []model.Skill {
	s.cacheMux.RLock()
	defer s.cacheMux.RUnlock()

	var skills []model.Skill
	for _, cached := range s.cache {
		skills = append(skills, *cached.skill)
	}
	return skills
}

// Internal: fetch all from GitHub and cache
func (s *SkillStore) fetchAndCacheAll() ([]model.Skill, error) {
	ctx := context.Background()

	contents, err := s.client.ListDirectoryContents(ctx, s.skillsPath)
	if err != nil {
		return nil, err
	}

	var skills []model.Skill
	newCache := make(map[string]cachedSkill)

	for _, item := range contents {
		if item.Type == "dir" {
			id := item.Name
			skill, err := s.fetchFromGitHub(id)
			if err != nil {
				continue
			}
			skills = append(skills, *skill)
			newCache[id] = cachedSkill{skill: skill, cachedAt: time.Now()}
		}
	}

	// Update cache
	s.cacheMux.Lock()
	s.cache = newCache
	s.cacheMux.Unlock()

	return skills, nil
}

// Internal: fetch single skill from GitHub
func (s *SkillStore) fetchFromGitHub(id string) (*model.Skill, error) {
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
			if strings.HasPrefix(line, "title:") {
				skill.Title = strings.TrimSpace(strings.TrimPrefix(line, "title:"))
			}
			if strings.HasPrefix(line, "name:") {
				skill.Title = strings.TrimSpace(strings.TrimPrefix(line, "name:"))
			}
			if strings.HasPrefix(line, "format:") {
				skill.Format = strings.TrimSpace(strings.TrimPrefix(line, "format:"))
			}
			if strings.HasPrefix(line, "compatibility:") {
				skill.Format = strings.TrimSpace(strings.TrimPrefix(line, "compatibility:"))
			}
			if line == "---" {
				break
			}
		}
	}

	if skill.Title == "" {
		skill.Title = skill.ID
	}

	return skill, nil
}

// SaveSkill creates/updates a file and opens a PR
func (s *SkillStore) SaveSkill(skill *model.Skill) error {
	ctx := context.Background()

	path := fmt.Sprintf("%s/%s/SKILL.md", s.skillsPath, skill.ID)
	sha, err := s.client.GetFileSHA(ctx, path)
	if err != nil {
		sha = ""
	}

	branchName := fmt.Sprintf("update-skill-%s-%d", skill.ID, time.Now().Unix())
	if err := s.client.CreateBranch(ctx, branchName, s.branch); err != nil {
		return err
	}

	message := fmt.Sprintf("Update skill: %s", skill.ID)
	if err := s.client.CommitFile(ctx, path, skill.Content, sha, branchName, message); err != nil {
		return err
	}

	title := fmt.Sprintf("Update skill: %s", skill.ID)
	body := "Automated update from LifeOS"
	return s.client.CreatePR(ctx, title, branchName, s.branch, body)
}

// GetSkillFiles fetches all files in a skill's references directory
func (s *SkillStore) GetSkillFiles(skillID string) ([]model.SkillFile, error) {

	// Return empty context
	ctx := context.Background()

	referencesPath := fmt.Sprintf("%s/%s/references", s.skillsPath, skillID)

	// Recursively fetch all contents
	contents, err := s.client.ListDirectoryRecursive(ctx, referencesPath)
	if err != nil {
		// If references folder doesn't exist, return empty list
		return []model.SkillFile{}, nil
	}

	var files []model.SkillFile
	for _, item := range contents {
		file := model.SkillFile{
			SkillID:   skillID,
			Path:      strings.TrimPrefix(item.Path, s.skillsPath+"/"+skillID+"/"),
			Type:      item.Type,
			Name:      item.Name,
			UpdatedAt: time.Now(),
		}

		// Fetch content for files (not directories)
		if item.Type == "file" && (strings.HasSuffix(item.Name, ".md") || strings.HasSuffix(item.Name, ".json")) {
			content, err := s.client.GetFileContent(ctx, item.Path)
			if err == nil {
				file.Content = content
			}
		}

		files = append(files, file)
	}

	return files, nil
}
