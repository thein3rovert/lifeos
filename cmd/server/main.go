package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/thein3rovert/lifeos/internal/handler"
	"github.com/thein3rovert/lifeos/internal/middleware"
	"github.com/thein3rovert/lifeos/internal/store"
)

// go run cmd/server/main.go
// Every Request: Middleware(customlogge) -> Handler
func main() {

	// Initialise store
	db, err := store.NewSQLiteStore("lifeos.db")
	if err != nil {
		log.Fatalf("Failed to initialise store: %v", err)
	}


	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("LifeOS is running"))
	})


	mux.HandleFunc("/home", handler.Home)

	mux.HandleFunc("/photos", handler.Photos)
	mux.HandleFunc("/photos/view", handler.ListPhotos(db))
	mux.HandleFunc("/photos/upload", handler.UpdatePhoto(db))

	// Static file server for serving local photo
	// Any request to eg. /static/photo/<filename> will server friom disk
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("."))))

	mux.HandleFunc("/skills", handler.Skills)

	log.Println("Server starting on 6060")
	if err := http.ListenAndServe(":6060", middleware.CustomLogger(mux)); err != nil {
		fmt.Println("Failed to listen at port 6060", err)
		log.Fatal(err)
	}


}
