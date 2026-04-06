package store

import "github.com/thein3rovert/lifeos/internal/model"

type Store interface {
	SavePhoto(photo *model.Photo) error
	ListPhotos() ([]model.Photo, error)
}
