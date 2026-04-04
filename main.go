package main

// Go auto remove import that are unused
import (
	"fmt"
	// Base library for go, standard lib for go (https://pkg.go.dev/net/http)
	"net/http"
)


func main() {
	_ = fmt.Sprint
	_ = http.StatusOK

	// Call http lib and handle function with this
	// Go has the ability to take function as paramater

	// lWhen /'api is called -> handler -> function
	http.HandleFunc("/api", apiHandler)

	fmt.Println("Starting sever at port 8080 ...")
	http.ListenAndServe(":8080", nil)

}
