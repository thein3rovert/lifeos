package store

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
)

// GitHubSkillStore reads/writes skills from/to a GitHub repo
type GitHubSkillStore struct {
	owner  string // GitHub username/org
	repo   string // Repository name
	token  string // GitHub personal access token
	branch string // Default branch (e.g., "main")
}

// NewGitHubSkillStore creates a new GitHub-based skill store
func NewGitHubSkillStore(owner, repo, token string) *GitHubSkillStore {
	return &GitHubSkillStore{
		owner:  owner,
		repo:   repo,
		token:  token,
		branch: "main",
	}
}

// ListGithubSkills fetches all markdown files from the repo
func (s *GitHubSkillStore) ListGithubSkills() ([]model.Skill, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/skills", s.owner, s.repo)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	//TODO: Move auth to util or new file
	req.Header.Set("Authorization", "token "+s.token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api error: %s", resp.Status)
	}

	var files []struct {
		Name string `json:"name"`
		Path string `json:"path"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&files); err != nil {
		return nil, err
	}

	var skills []model.Skill
	for _, file := range files {
		if strings.HasSuffix(file.Name, ".md") {
			id := strings.TrimSuffix(file.Name, ".md")
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
func (s *GitHubSkillStore) GetSkill(id string) (*model.Skill, error) {
	path := fmt.Sprintf("skills/%s.md", id)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", s.owner, s.repo, path)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// TODO: Move auth to a new file
	req.Header.Set("Authorization", "token "+s.token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api error: %s", resp.Status)
	}

	// TODO: move somewhere and call (best practice
	var result struct {
		Content  string `json:"content"`
		Encoding string `json:"encoding"`
		SHA      string `json:"sha"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// Decode base64 content
	content, err := base64.StdEncoding.DecodeString(result.Content)
	if err != nil {
		return nil, err
	}

	skill := &model.Skill{
		ID:      id,
		Content: string(content),
	}

	// Parse frontmatter
	if strings.HasPrefix(string(content), "---") {
		lines := strings.Split(string(content), "\n")
		for _, line := range lines[1:] {
			if strings.HasPrefix(line, "title:") {
				skill.Title = strings.TrimSpace(strings.TrimPrefix(line, "title:"))
			}
			if strings.HasPrefix(line, "format:") {
				skill.Format = strings.TrimSpace(strings.TrimPrefix(line, "format:"))
			}
			if line == "---" {
				break
			}
		}
	}

	return skill, nil
}

// SaveSkill creates/updates a file and opens a PR
func (s *GitHubSkillStore) SaveSkill(skill *model.Skill) error {
	ctx := context.Background()

	// 1. Get current file SHA (if exists)
	sha, err := s.getFileSHA(ctx, skill.ID)
	if err != nil {
		sha = "" // File doesn't exist, will create new
	}

	// 2. Create a new branch
	branchName := fmt.Sprintf("update-skill-%s-%d", skill.ID, time.Now().Unix())
	if err := s.createBranch(ctx, branchName); err != nil {
		return err
	}

	// 3. Commit the file
	path := fmt.Sprintf("skills/%s.md", skill.ID)
	if err := s.commitFile(ctx, path, skill.Content, sha, branchName); err != nil {
		return err
	}

	// 4. Create PR
	return s.createPR(ctx, branchName, skill.ID)
}

// Helper: Move to util:  get file SHA
func (s *GitHubSkillStore) getFileSHA(ctx context.Context, id string) (string, error) {
	path := fmt.Sprintf("skills/%s.md", id)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", s.owner, s.repo, path)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "token "+s.token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", nil
	}

	var result struct {
		SHA string `json:"sha"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.SHA, nil
}

// Helper: create branch
func (s *GitHubSkillStore) createBranch(ctx context.Context, name string) error {
	// Get main branch SHA
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/git/ref/heads/%s", s.owner, s.repo, s.branch)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "token "+s.token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var result struct {
		Object struct {
			SHA string `json:"sha"`
		} `json:"object"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}

	// Create new branch
	url = fmt.Sprintf("https://api.github.com/repos/%s/%s/git/refs", s.owner, s.repo)
	body := fmt.Sprintf(`{"ref": "refs/heads/%s", "sha": "%s"}`, name, result.Object.SHA)

	req, err = http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "token "+s.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

// Helper: Move to Util commit file
func (s *GitHubSkillStore) commitFile(ctx context.Context, path, content, sha, branch string) error {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents/%s", s.owner, s.repo, path)

	encoded := base64.StdEncoding.EncodeToString([]byte(content))
	var body string
	if sha != "" {
		body = fmt.Sprintf(`{"message": "Update %s", "content": "%s", "sha": "%s", "branch": "%s"}`, path, encoded, sha, branch)
	} else {
		body = fmt.Sprintf(`{"message": "Create %s", "content": "%s", "branch": "%s"}`, path, encoded, branch)
	}

	req, err := http.NewRequestWithContext(ctx, "PUT", url, strings.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "token "+s.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("commit failed: %s - %s", resp.Status, string(body))
	}

	return nil
}

// Helper: Move to Uitl create PR
func (s *GitHubSkillStore) createPR(ctx context.Context, branch, skillID string) error {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls", s.owner, s.repo)

	title := fmt.Sprintf("Update skill: %s", skillID)
	body := fmt.Sprintf(`{"title": "%s", "head": "%s", "base": "%s", "body": "Automated update from LifeOS"}`, title, branch, s.branch)

	req, err := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "token "+s.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("pr creation failed: %s - %s", resp.Status, string(body))
	}

	return nil
}
