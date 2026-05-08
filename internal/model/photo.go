package model

import "time"

type Photo struct {
	ID          int64
	Filename    string
	Path        string
	Caption     string
	Description string
	Tags        []Tag
	CreatedAt   time.Time
}
