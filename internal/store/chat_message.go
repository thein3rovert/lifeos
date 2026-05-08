package store

import (
	"database/sql"
	"time"
)

// TODO: Move this to the model folder
type ChatMessage struct {
	ID		int 	`json:"id"`
	SkillID string `json:"skill_id`
	SessionID string `json:"session_id`
	Role string `json:"role"`
	Content string `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}


type ChatMessageStore struct {
	db *sql.DB
}

// Create a new instance of chat message store
func NewChatMessageStore(db *sql.DB) *ChatMessageStore {
	return &ChatMessageStore{db: db}
}

// Save Messages saves chat message to the database
func (store *ChatMessageStore)SaveChatMessage(skillID, sessionID, role, content string) error {
	// Query database forchat message
	query := `INSERT INTO chat_message(skill_id, session_id, role, content, created_at)
	VALUE (?, ?, ?, ?, ?)`

	_, err := store.db.Exec(query, skillID, sessionID, role, content, time.Now())
	return err
}


// Get messages retrived all messages for a skill's session
func (store *ChatMessageStore)GetChatMessages(skillID, sessionID string) ([]ChatMessage, error) {
	query := `SELECT id, skill_id, session_id, role, content, created_at
	          FROM chat_messages
	          WHERE skill_id = ? AND session_id = ?
	          ORDER BY created_at ASC`

	rows, err := store.db.Query(query, skillID, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []ChatMessage
	for rows.Next() {
	var msg ChatMessage
	err := rows.Scan(&msg.ID, &msg.SkillID, &msg.SessionID, &msg.Role, &msg.Content, &msg.CreatedAt)
	if err != nil {
		return nil, err
	}
	messages = append(messages, msg)
	}
	return messages, rows.Err()
}


// deleteMessages helps to delete all message for a specific skills session
func (store *ChatMessageStore)DeleteChatMessages(skillID, sessionID string) error {
	query := `DELETE FROM chat_messages WHERE skill_id = ? AND session_id = ?`
	_, err := store.db.Exec(query, skillID, sessionID)
	return err
}
