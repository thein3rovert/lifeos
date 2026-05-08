package github

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client provides authenticated GitHub API access
type Client struct {
	httpClient *http.Client
	token      string
	owner      string
	repo       string
	baseURL    string
}

// NewClient creates a new GitHub API client
func NewClient(owner, repo, token string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		token:      token,
		owner:      owner,
		repo:       repo,
		baseURL:    "https://api.github.com",
	}
}

// Do makes an authenticated GitHub API request
func (c *Client) Do(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	url := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "token "+c.token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return c.httpClient.Do(req)
}

// GetFileSHA fetches the SHA of a file (for updates)
func (c *Client) GetFileSHA(ctx context.Context, path string) (string, error) {
	apiPath := fmt.Sprintf("/repos/%s/%s/contents/%s", c.owner, c.repo, path)

	resp, err := c.Do(ctx, "GET", apiPath, nil)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", nil
	}

	var content Content
	if err := json.NewDecoder(resp.Body).Decode(&content); err != nil {
		return "", err
	}
	return content.SHA, nil
}

// CreateBranch creates a new branch from an existing branch
func (c *Client) CreateBranch(ctx context.Context, branchName, baseBranch string) error {
	// Get base branch SHA
	refPath := fmt.Sprintf("/repos/%s/%s/git/ref/heads/%s", c.owner, c.repo, baseBranch)
	resp, err := c.Do(ctx, "GET", refPath, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var ref Ref
	if err := json.NewDecoder(resp.Body).Decode(&ref); err != nil {
		return err
	}

	// Create new branch
	createPath := fmt.Sprintf("/repos/%s/%s/git/refs", c.owner, c.repo)
	body := fmt.Sprintf(`{"ref": "refs/heads/%s", "sha": "%s"}`, branchName, ref.Object.SHA)

	resp, err = c.Do(ctx, "POST", createPath, strings.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

// CommitFile creates or updates a file
func (c *Client) CommitFile(ctx context.Context, path, content, sha, branch, message string) error {
	updatePath := fmt.Sprintf("/repos/%s/%s/contents/%s", c.owner, c.repo, path)

	encoded := base64.StdEncoding.EncodeToString([]byte(content))
	var body string
	if sha != "" {
		body = fmt.Sprintf(`{"message": "%s", "content": "%s", "sha": "%s", "branch": "%s"}`, message, encoded, sha, branch)
	} else {
		body = fmt.Sprintf(`{"message": "%s", "content": "%s", "branch": "%s"}`, message, encoded, branch)
	}

	resp, err := c.Do(ctx, "PUT", updatePath, strings.NewReader(body))
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

// CreatePR opens a pull request
func (c *Client) CreatePR(ctx context.Context, title, headBranch, baseBranch, body string) error {
	prPath := fmt.Sprintf("/repos/%s/%s/pulls", c.owner, c.repo)

	prBody := fmt.Sprintf(`{"title": "%s", "head": "%s", "base": "%s", "body": "%s"}`,
		title, headBranch, baseBranch, body)

	resp, err := c.Do(ctx, "POST", prPath, strings.NewReader(prBody))
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

// ListDirectoryContents lists files in a directory
func (c *Client) ListDirectoryContents(ctx context.Context, dir string) ([]Content, error) {
	path := fmt.Sprintf("/repos/%s/%s/contents/%s", c.owner, c.repo, dir)

	resp, err := c.Do(ctx, "GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api error: %s", resp.Status)
	}

	var contents []Content
	if err := json.NewDecoder(resp.Body).Decode(&contents); err != nil {
		return nil, err
	}
	return contents, nil
}

// GetFileContent fetches and decodes a file
func (c *Client) GetFileContent(ctx context.Context, path string) (string, error) {
	apiPath := fmt.Sprintf("/repos/%s/%s/contents/%s", c.owner, c.repo, path)

	resp, err := c.Do(ctx, "GET", apiPath, nil)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github api error: %s", resp.Status)
	}

	var content Content
	if err := json.NewDecoder(resp.Body).Decode(&content); err != nil {
		return "", err
	}

	decoded, err := base64.StdEncoding.DecodeString(content.Content)
	if err != nil {
		return "", err
	}
	return string(decoded), nil
}
