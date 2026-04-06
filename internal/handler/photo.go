package handler

import "net/http"

func Photos(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("photo page"))
}
