package store

import (
	"database/sql"
	"time"
)

// CalendarStore manages Google OAuth tokens for Calendar integration.
// Single-user app — one row, id = 1.
type CalendarStore interface {
	SaveTokens(accessToken, refreshToken, tokenType string, expiry time.Time) error
	GetTokens() (*OAuthTokens, error)
	ClearTokens() error
}

// OAuthTokens holds the stored Google OAuth tokens.
type OAuthTokens struct {
	AccessToken  string
	RefreshToken string
	TokenType    string
	Expiry       time.Time
}

type SQLCalendarStore struct {
	db *sql.DB
}

// Create new instance of calender store
func NewCalendarStore(db *sql.DB) *SQLCalendarStore {
	return &SQLCalendarStore{db: db}
}

// SaveTokens upserts the single token row.
func (s *SQLCalendarStore) SaveTokens(accessToken, refreshToken, tokenType string, expiry time.Time) error {
	now := time.Now()
	_, err := s.db.Exec(`INSERT INTO google_oauth_tokens (id, access_token, refresh_token, token_type, expiry, updated_at)
		VALUES (1, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			access_token = excluded.access_token,
			refresh_token = excluded.refresh_token,
			token_type = excluded.token_type,
			expiry = excluded.expiry,
			updated_at = excluded.updated_at`,
		accessToken, refreshToken, tokenType, expiry, now)
	return err
}

// GetTokens returns the stored tokens, or nil if none exist.
func (s *SQLCalendarStore) GetTokens() (*OAuthTokens, error) {
	var t OAuthTokens
	err := s.db.QueryRow(`SELECT access_token, refresh_token, token_type, expiry FROM google_oauth_tokens WHERE id = 1`).
		Scan(&t.AccessToken, &t.RefreshToken, &t.TokenType, &t.Expiry)
	// if my id (1) does not exist
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// ClearTokens removes the stored tokens.
func (s *SQLCalendarStore) ClearTokens() error {
	_, err := s.db.Exec(`DELETE FROM google_oauth_tokens WHERE id = 1`)
	return err
}
