package github

// Content represents a file or directory in GitHub
type Content struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Content string `json:"content"`
	SHA     string `json:"sha"`
	Type    string `json:"type"`
}

// Ref represents a git reference
type Ref struct {
	Object struct {
		SHA string `json:"sha"`
	} `json:"object"`
}

// PullRequest represents a PR response
type PullRequest struct {
	Number int    `json:"number"`
	URL    string `json:"html_url"`
	State  string `json:"state"`
}