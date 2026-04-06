## Practise
### Net/HTTP and Handler Interface

### 3. Building Custom Middleware
- Handler are backend logics (services in java)
- Logic that applied to all handlers are and should be independent with all the handlers
- log all the request
- Handles authentication and authorisation 

- Middleware handle the communication within the handler and client by processing the request coming fro the client and sending then to the handlers and also processing all the response from the handles and forwarding that to the client.
Things that are and should be done in the middleware layers are:
- Logging 
- Authentication 
- Rate Limiting

> [!note] 
> We can have multiple middleware btw the client and the handlers, the concept of having multiple middleware is called **Nested Middleware** (Nesting)
```
 curl -i -X GET http://localhost:9057/about
HTTP/1.1 200 OK
X-Custom-Header: Pokemon
Date: Sun, 05 Apr 2026 20:36:17 GMT
Content-Length: 56
Content-Type: text/plain; charset=utf-8
```

#### Todo
- Create and register cstom middleware function
> Client -> middleware(set ex. custom-header) -> Handler
- Chaining of middleware (Logs into middleware)

## Query Param and Path Variable 
- Handling dynamic url parameter and query (Managing url cominf from userss and more)
- Parse query from url 
- Extra path varuable using http.servemux
