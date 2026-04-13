package store

import "github.com/thein3rovert/lifeos/internal/model"

type Store interface {
	SavePhoto(photo *model.Photo) error
	ListPhotos() ([]model.Photo, error)

	// Tags
	SaveTag(name string) (int64, error)
	AddTagToPhoto(photoID, tagID int64) error
	ListTags() ([]model.Tag, error)
	GetPhotoTags(photoID int64) ([]model.Tag, error)

	//Search
	SearchPhotos(query string) ([]model.Photo, error)
	GetPhotoByTag(tagName string) ([]model.Photo, error)

	// SkillStore interfac
	ListSkills() ([]model.Skill, error)
	GetSkills(id string) (*model.Skill, error)
	SaveSkill(skill *model.Skill) error

}
