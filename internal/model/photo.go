package model

import "time"

type Photo struct {
	ID int64
	Filename string
	Path     string
	Caption  string
	Description string
	tags 			[]Tag
	CreatedAt time.Time
}
