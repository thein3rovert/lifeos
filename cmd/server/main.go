package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("LifeOS is running"))
	})

	log.Println("Server starting on 6060")
	if err := http.ListenAndServe(":6060", mux); err != nil {
		fmt.Println("Failed to listen at port 6060", err)
		log.Fatal(err)
	}
}
