package main

// Go auto remove import that are unused
import (
	// Used for string manipulation
	"fmt"
	// Base library for go, standard lib for go (https://pkg.go.dev/net/http)
	"net/http"
	// ==== 03 =====
	"log"
	// "time"
)

// Custom http handler
type HomeHandler struct{}

//===============NOTE=============
// go build
// use curl for all api testing

// GO provide http.servemux which is a request multiplexer for routing
// diff urls (Matches the URL of each incoming requesst against a list
// of registerted patterns and calls the handlers fir the patterns that
// most closely matches the URL)
// Pattern is something with a host and a path of a request
// For every GET /pokemon -> new handler (get all pokemon)
// For every POST -> new handler (creat a new pokemon)

// Response writer is use for sending response back to the client

//===============END OF NOTE=============

func main() {

	// ============= 01 ==============
	_ = fmt.Sprint
	_ = http.StatusOK

	// Call http lib and handle function with this
	// Go has the ability to take function as paramater

	// When /'api is called -> handler -> function
	http.HandleFunc("/api", apiHandler)
	http.HandleFunc("/greetings", handleGreetings)
	http.HandleFunc("/health", userHealthCheck)

	// fmt.Println("Starting sever at port 5837 ...")
	// if err := http.ListenAndServe(":5837", nil); err != nil {
	// 	fmt.Printf("Error starting server: %v\n", err)
	// }




// ============= 02 ==============

// ServerMux -> Multiplexer
	mux := http.NewServeMux()

	mux.Handle("/", HomeHandler{} )

	// Functions
	// User -> localhosts:8080/hello -> routes it -> /hello | /status

	mux.HandleFunc("/hello", func(writeResponse  http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(writeResponse, "Hello again from thein3rovert, You are accessing %s and %s using User Agent %s\n", r.URL.Path, r.URL.Host, r.Header.Get("User-Agent"))
	})

	mux.HandleFunc("/status", func(writeResponse http.ResponseWriter, r *http.Request) {
		writeResponse.WriteHeader(http.StatusOK)
		fmt.Fprint(writeResponse, `{"status": "OK"}`)
	})

	// fmt.Println("Server starting on port 4089 ...")
	// // Route Request -> Multiplexer
	// http.ListenAndServe(":4089", mux)


	// ============= 03 ==============
	// Use http.handleFunc to call a function
	// Wrap requst with created middleware
	mux.Handle("/aboutPage", headerMiddleware(http.HandlerFunc(aboutPageHandler)))
	mux.Handle("/about", headerMiddleware(http.HandlerFunc(aboutHandler)))

	// fmt.Println("Server starting on port 9057 ...")
	log.Println("Starting Server on Port 9057 ...") // Better
	if err := http.ListenAndServe(":9057", mux); err != nil {
		log.Fatal("Server Failed or Running on Processs", err)
 }


}


// ============= 01 ==============
// * httpRquest points to a location where user requewst abd param are persent
// -> user provided data
// http.ResponseWriter -> backend writes it resposne
func apiHandler(writeResponse http.ResponseWriter, userRequest *http.Request) {
	fmt.Fprint(writeResponse, "HELLO THEIN3ROVERT")
}

func handleGreetings(writeResponse http.ResponseWriter, userRequest *http.Request) {
	fmt.Fprint(writeResponse, "Trust you're fine")
}

func userHealthCheck(writeResponse http.ResponseWriter, userRequest *http.Request) {
	//TODO: Add user variable to response later
	fmt.Fprint(writeResponse, "I think i'm good, thanks for asking")
}


// ============= 02 ==============
func (handleHome HomeHandler) ServeHTTP(writeResponse http.ResponseWriter, r *http.Request) {
	fmt.Fprint(writeResponse, "Welcome to thein3rovert Go Server!")
}


// ============= 03 ==============
func aboutPageHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Welcome to the About Me Page!")
}

func aboutHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "My name is thein3rovert, but you can call me iv3..haha!")
}

// Middleware
func headerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request ) {
		// Implement Logics
		// Ex. Authentication here! X-API-KEY: (check if exist or not and more..)
		w.Header().Set("X-Custom-Header", "Pokemon")
		//End of middleware logic
		next.ServeHTTP(w, r)
})

}
