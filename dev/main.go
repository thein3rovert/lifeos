package main

// Go auto remove import that are unused
import (
	// Used for string manipulation
	"fmt"
	// Base library for go, standard lib for go (https://pkg.go.dev/net/http)
	"net/http"
	// ==== 03 =====
	"log"
	"time"

	// ==== 04 =====
	"strings"
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
	// Wrap Handler with created middleware
	// Wrap Handler with logging middleware
	mux.Handle("/aboutPage", loggingMiddleware(headerMiddleware(http.HandlerFunc(aboutPageHandler))))
	mux.Handle("/about", loggingMiddleware(headerMiddleware(http.HandlerFunc(aboutHandler))))

	// fmt.Println("Server starting on port 9057 ...")
	// log.Println("Starting Server on Port 9057 ...") // Better
	// if err := http.ListenAndServe(":9057", mux); err != nil {
	// 	log.Fatal("Server Failed or Running on Processs", err)
 // }

 // ========= 03 ================
 // Default HTTP instead of Mux
 // Path Variables
 http.HandleFunc("/blog", blogPageHandler)
 http.HandleFunc("/user/", userHandler)
 http.HandleFunc("/username/", userDetailsHandler)

 	fmt.Println("Listening at port 6060 ..")

 // We are using default mux
 if err := http.ListenAndServe(":6060", nil); err != nil {
 	fmt.Println("Failed to listen at port 6060", err)
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


func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Log logic
			start := time.Now()
			log.Printf("%s %s %s", r.Method, r.RequestURI, time.Since(start))
			next.ServeHTTP(w, r)
	})
}

// ========= 03 =================
// https://api.example.com/api/v1/blog?title="How to survice the apocalypes"
// https://api.example.com/api/v1/blog

// Understanding Query Parameters
func blogPageHandler(w http.ResponseWriter, r *http.Request) {

	// https://api.example.com/api/v1/blog?title="How to survice the apocalypes"
	query := r.URL.Query() //Get the full query path
	title := query.Get("title")
	if title == "" {
		title = "blog-01"
	}
	fmt.Fprintf(w, "Welcome to my blog page, feel free to browser around\n let me know if you like what you see\n here is my first blog post, %s", title)
}

// Extracting Path Variables
// https://api.example.com/user/<userId>
// 1 -> User
// 2 -> UserID
// This allows us to manage resource based on userId
func userHandler(w http.ResponseWriter, r *http.Request) {
	pathSegments := strings.Split(r.URL.Path, "/")
	if len(pathSegments) >= 3 && pathSegments[1] == "user" {
		userID := pathSegments[2]
			fmt.Fprintf(w,  "User ID: %s", userID)
	} else {
		http.NotFound(w, r)
	}
}

// Combining Both => Handling Query + Extracting Path Variables
// Endpoints: https://api.example.com/username/<userId>?includeDetails=<boolean>
func userDetailsHandler(w http.ResponseWriter, r *http.Request) {
	pathSegments := strings.Split(r.URL.Path, "/")
	query := r.URL.Query()
	includeDetails  := query.Get("includeDetails")

	if len(pathSegments) >= 3 && pathSegments[1] == "username" {
		userID := pathSegments[2]
		response := fmt.Sprintf("User ID: %s", userID)
		if includeDetails == "true" {
			response += " (Details included)"
		}
		fmt.Fprintln(w, response)
	} else {
		http.NotFound(w,r)
	}
}
