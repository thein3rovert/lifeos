// Package utils contains small, dependency-free helpers shared across
// the server. Keep this package free of business logic and external I/O.
package utils

import "strings"

// StripFrontmatter removes a leading YAML frontmatter block (delimited by
// `---` lines) from markdown content. If no frontmatter is present the
// input is returned unchanged.
func StripFrontmatter(content string) string {
	if !strings.HasPrefix(content, "---") {
		return content
	}

	lines := strings.Split(content, "\n")
	inFrontmatter := true
	var result []string

	for i, line := range lines {
		if i == 0 && line == "---" {
			continue
		}
		if inFrontmatter && line == "---" {
			inFrontmatter = false
			continue
		}
		if !inFrontmatter {
			result = append(result, line)
		}
	}

	return strings.Join(result, "\n")
}
