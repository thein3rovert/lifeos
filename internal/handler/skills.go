package handler

import "net/http"

func Skills(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("skills page"))
}
