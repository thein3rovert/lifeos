package main

// Go auto remove import that are unused
import (
	"fmt"
	// Base library for go, standard lib for go (https://pkg.go.dev/net/http)
	"net/http"
)

//===============NOTE=============
// go build
// use curl for all api testing

func main() {
	_ = fmt.Sprint
	_ = http.StatusOK

	// Call http lib and handle function with this
	// Go has the ability to take function as paramater

	// When /'api is called -> handler -> function
	http.HandleFunc("/api", apiHandler)

	fmt.Println("Starting sever at port 5837 ...")
	if err := http.ListenAndServe(":5837", nil); err != nil {
		fmt.Printf("Error starting server: %v\n", err)
	}

}

// * httpRquest points to a location where user requewst abd param are persent
// -> user provided data
// http.ResponseWriter -> backend writes it resposne
func apiHandler(writeResponse http.ResponseWriter, userRequest *http.Request) {
	fmt.Fprint(writeResponse, "HELLO THEIN3ROVERT")
}
