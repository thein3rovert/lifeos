package store

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/thein3rovert/lifeos/internal/model"
)

type FileSkillStore struct {
	dir string
}

func NewFileSkillStore(dir string) *FileSkillStore {
	return &FileSkillStore{dir: dir}
}

func (s *FileSkillStore) GetSkill(id string) (*model.Skill, error) {
	path := filepath.Join(s.dir, id+".md")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	skill := &model.Skill{
		ID:      id,
		Content: string(data),
	}

	// Formatter parsing (title only for now)
	line := strings.Split(string(data), "\n")
	for _, line := range line[1:] {
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
	info, _ := os.Stat(path)
	if info != nil {
		skill.UpdatedAt = info.ModTime()
	}

	return skill, nil
}

func (s *FileSkillStore) ListSkills() ([]model.Skill, error) {
	entries, err := os.ReadDir(s.dir)

	if err != nil {
		return nil, err
	}

	var skills []model.Skill

	// Get all skill and append to skills
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".md") {
			id := strings.TrimSuffix(entry.Name(), ".md")
			skill, err := s.GetSkill(id)
			if err != nil {
				continue
			}
			skills = append(skills, *skill)
		}
	}
	return skills, nil
}

func (s *FileSkillStore) SaveSkill(skill *model.Skill) error {
	path := filepath.Join(s.dir, skill.ID+".md")
	return os.WriteFile(path, []byte(skill.Content), 0644)
}

// Sync is a no-op for local file store (always fresh)
func (s *FileSkillStore) Sync() error {
	return nil
}
