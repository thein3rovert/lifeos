package store

import (
	"database/sql"
	"errors"

	"github.com/thein3rovert/lifeos/server/internal/model"
)

var ErrAgentConversationNotFound = errors.New("agent conversation not found")

type AgentConversationStore interface {
	CreateConversation(*model.AgentConversation) error
	ListConversations(source string) ([]model.AgentConversation, error)
	GetConversation(id, source string) (*model.AgentConversation, error)
	UpdateConversationTitle(id, source, title string) error
	AddMessage(*model.AgentMessage) error
	ListMessages(conversationID string) ([]model.AgentMessage, error)
}

type SQLAgentConversationStore struct {
	db *sql.DB
}

func NewAgentConversationStore(db *sql.DB) *SQLAgentConversationStore {
	return &SQLAgentConversationStore{db: db}
}

func (s *SQLAgentConversationStore) CreateConversation(conversation *model.AgentConversation) error {
	_, err := s.db.Exec(`INSERT INTO agent_conversations
		(id, source, title, opencode_session_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)`, conversation.ID, conversation.Source, conversation.Title,
		conversation.OpenCodeSessionID, conversation.CreatedAt, conversation.UpdatedAt)
	return err
}

func (s *SQLAgentConversationStore) ListConversations(source string) ([]model.AgentConversation, error) {
	rows, err := s.db.Query(`SELECT id, source, title, opencode_session_id, created_at, updated_at
		FROM agent_conversations WHERE source = ? ORDER BY updated_at DESC, id DESC`, source)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	conversations := make([]model.AgentConversation, 0)
	for rows.Next() {
		conversation, err := scanAgentConversation(rows)
		if err != nil {
			return nil, err
		}
		conversations = append(conversations, *conversation)
	}
	return conversations, rows.Err()
}

func (s *SQLAgentConversationStore) GetConversation(id, source string) (*model.AgentConversation, error) {
	conversation, err := scanAgentConversation(s.db.QueryRow(`SELECT id, source, title,
		opencode_session_id, created_at, updated_at FROM agent_conversations
		WHERE id = ? AND source = ?`, id, source))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrAgentConversationNotFound
	}
	return conversation, err
}

func (s *SQLAgentConversationStore) UpdateConversationTitle(id, source, title string) error {
	result, err := s.db.Exec(`UPDATE agent_conversations SET title = ?
		WHERE id = ? AND source = ?`, title, id, source)
	if err != nil {
		return err
	}
	return agentConversationResultError(result)
}

func (s *SQLAgentConversationStore) AddMessage(message *model.AgentMessage) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`INSERT INTO agent_messages
		(id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`,
		message.ID, message.ConversationID, message.Role, message.Content, message.CreatedAt); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE agent_conversations SET updated_at = ? WHERE id = ?`,
		message.CreatedAt, message.ConversationID); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *SQLAgentConversationStore) ListMessages(conversationID string) ([]model.AgentMessage, error) {
	rows, err := s.db.Query(`SELECT id, conversation_id, role, content, created_at
		FROM agent_messages WHERE conversation_id = ? ORDER BY created_at, id`, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := make([]model.AgentMessage, 0)
	for rows.Next() {
		var message model.AgentMessage
		if err := rows.Scan(&message.ID, &message.ConversationID, &message.Role, &message.Content, &message.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}
	return messages, rows.Err()
}

type agentConversationScanner interface {
	Scan(...any) error
}

func scanAgentConversation(scanner agentConversationScanner) (*model.AgentConversation, error) {
	var conversation model.AgentConversation
	err := scanner.Scan(&conversation.ID, &conversation.Source, &conversation.Title,
		&conversation.OpenCodeSessionID, &conversation.CreatedAt, &conversation.UpdatedAt)
	return &conversation, err
}

func agentConversationResultError(result sql.Result) error {
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrAgentConversationNotFound
	}
	return nil
}
