package store

import (
	"database/sql"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/model"
)

// ChatMessageStore is the interface consumers depend on. The concrete
// SQL-backed implementation is SQLChatMessageStore below.
type ChatMessageStore interface {
	SaveChatMessage(skillID, sessionID, role, content string) error
	GetChatMessages(skillID, sessionID string) ([]model.ChatMessage, error)
	DeleteChatMessages(skillID, sessionID string) error
}

// SQLChatMessageStore is the SQLite-backed ChatMessageStore.
type SQLChatMessageStore struct {
	db *sql.DB
}

// NewChatMessageStore returns a new SQLite-backed ChatMessageStore.
// Returns the interface type so callers can substitute mocks in tests.
func NewChatMessageStore(db *sql.DB) ChatMessageStore {
	return &SQLChatMessageStore{db: db}
}

// SaveChatMessage inserts a message into the chat_messages table.
func (s *SQLChatMessageStore) SaveChatMessage(skillID, sessionID, role, content string) error {
	query := `INSERT INTO chat_messages(skill_id, session_id, role, content, created_at)
	          VALUES (?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, skillID, sessionID, role, content, time.Now())
	return err
}

// GetChatMessages returns all messages for a skill's session in insertion order.
func (s *SQLChatMessageStore) GetChatMessages(skillID, sessionID string) ([]model.ChatMessage, error) {
	query := `SELECT id, skill_id, session_id, role, content, created_at
	          FROM chat_messages
	          WHERE skill_id = ? AND session_id = ?
	          ORDER BY created_at ASC`

	rows, err := s.db.Query(query, skillID, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []model.ChatMessage
	for rows.Next() {
		var msg model.ChatMessage
		if err := rows.Scan(&msg.ID, &msg.SkillID, &msg.SessionID, &msg.Role, &msg.Content, &msg.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	return messages, rows.Err()
}

// DeleteChatMessages removes all messages for a skill's session.
func (s *SQLChatMessageStore) DeleteChatMessages(skillID, sessionID string) error {
	query := `DELETE FROM chat_messages WHERE skill_id = ? AND session_id = ?`
	_, err := s.db.Exec(query, skillID, sessionID)
	return err
}
