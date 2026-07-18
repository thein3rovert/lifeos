// Package sidecar is a typed HTTP client for the Node.js sidecar service.
// Handlers and services depend on this client instead of raw sidecar URLs,
// so the base URL is configured once at startup and endpoint knowledge lives
// in one place.
package sidecar

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client talks to the LifeOS Node.js sidecar over HTTP.
type Client struct {
	baseURL string
	http    *http.Client
}

// Option configures a Client.
type Option func(*Client)

// WithHTTPClient overrides the underlying http.Client (useful for tests).
func WithHTTPClient(hc *http.Client) Option {
	return func(c *Client) { c.http = hc }
}

// New constructs a Client. The default underlying http.Client has a 10-minute
// timeout — long enough for AI-heavy skill rewrites and agent chats.
func New(baseURL string, opts ...Option) *Client {
	c := &Client{
		baseURL: baseURL,
		http: &http.Client{
			Timeout: 10 * time.Minute,
		},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// BaseURL returns the configured sidecar base URL.
func (c *Client) BaseURL() string { return c.baseURL }

// ── Wire types ─────────────────────────────────────────────────────────

// AgentChatRequest is the payload for POST /agent/chat.
type AgentChatRequest struct {
	Message          string                `json:"message"`
	SessionID        *string               `json:"sessionId,omitempty"`
	StructuredOutput *StructuredOutputSpec `json:"structuredOutput,omitempty"`
	Context          string                `json:"context,omitempty"`
	RequestID        string                `json:"requestId,omitempty"`
}

// StructuredOutputSpec asks the sidecar to constrain output to a schema.
type StructuredOutputSpec struct {
	PanelType string `json:"panelType"`
}

// AgentChatResponse is the response from POST /agent/chat.
type AgentChatResponse struct {
	Response  string `json:"response"`
	SessionID string `json:"sessionId"`
}

// ── Endpoints ──────────────────────────────────────────────────────────

// UpdateSkill sends the current skill text plus buffered notes to the sidecar
// and returns the AI-rewritten skill content.
// POST /skill/update
func (c *Client) UpdateSkill(existingSkill, newNotes string) (string, error) {
	type req struct {
		ExistingSkill string `json:"existingSkill"`
		NewNotes      string `json:"newNotes"`
	}
	type resp struct {
		UpdatedSkill string `json:"updatedSkill"`
		Error        string `json:"error"`
	}

	var out resp
	if err := c.postJSON("/skill/update", req{existingSkill, newNotes}, &out); err != nil {
		return "", err
	}
	if out.Error != "" {
		return "", fmt.Errorf("sidecar error: %s", out.Error)
	}
	return out.UpdatedSkill, nil
}

// CreateOrResumeSession asks the sidecar to open (or reuse) an OpenCode session
// for a given skill and returns the session ID.
// POST /session/getOrCreate
func (c *Client) CreateOrResumeSession(skillID, skillTitle string) (string, error) {
	body := map[string]string{
		"skillId":    skillID,
		"skillTitle": skillTitle,
	}
	var out struct {
		SessionID string `json:"sessionId"`
	}
	if err := c.postJSON("/session/getOrCreate", body, &out); err != nil {
		return "", err
	}
	if out.SessionID == "" {
		return "", fmt.Errorf("sidecar returned empty sessionId")
	}
	return out.SessionID, nil
}

// SendSessionChat sends a chat message inside an existing session and returns
// the assistant's textual reply.
// POST /session/chat
func (c *Client) SendSessionChat(sessionID, message, skillContent string) (string, error) {
	body := map[string]interface{}{
		"sessionId":    sessionID,
		"message":      message,
		"skillContent": skillContent,
	}
	// Sidecar returns a single string value under some field — decode loosely.
	var out map[string]interface{}
	if err := c.postJSON("/session/chat", body, &out); err != nil {
		return "", err
	}
	for _, v := range out {
		if s, ok := v.(string); ok {
			return s, nil
		}
	}
	return "", fmt.Errorf("no string response from sidecar")
}

// SendAgentChat forwards a request to the general-purpose agent endpoint.
// POST /agent/chat
func (c *Client) SendAgentChat(req AgentChatRequest) (AgentChatResponse, error) {
	var out AgentChatResponse
	if err := c.postJSON("/agent/chat", req, &out); err != nil {
		return AgentChatResponse{}, err
	}
	return out, nil
}

// AbortAgentRequest cancels an in-flight agent request by its ID.
// Uses a short-lived http.Client since aborts should be fast.
// POST /agent/abort
func (c *Client) AbortAgentRequest(requestID string) error {
	if requestID == "" {
		return fmt.Errorf("requestId is required")
	}

	quick := &http.Client{Timeout: 10 * time.Second}
	body, err := json.Marshal(map[string]string{"requestId": requestID})
	if err != nil {
		return fmt.Errorf("failed to marshal abort request: %w", err)
	}

	resp, err := quick.Post(c.baseURL+"/agent/abort", "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("sidecar abort request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sidecar abort error: %s", string(bodyBytes))
	}
	return nil
}

// ── Internal helpers ───────────────────────────────────────────────────

// postJSON marshals body to JSON, POSTs it to path, and decodes the JSON
// response into out. Returns a wrapped error on any non-2xx response.
func (c *Client) postJSON(path string, body, out interface{}) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.http.Post(c.baseURL+path, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("sidecar request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sidecar %s returned %d: %s", path, resp.StatusCode, string(bodyBytes))
	}

	if out == nil {
		return nil
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("failed to decode sidecar response: %w", err)
	}
	return nil
}
