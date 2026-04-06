**Stack**
- Go (net/http or Chi router)
- HTML templates (Go's `html/template`)
- SQLite for metadata storage
- Local filesystem for photo storage

**Project Structure**
```
lifeos/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── handler/       # HTTP handlers
│   ├── store/         # DB layer
│   └── model/         # types
├── templates/         # HTML templates
├── static/            # CSS, JS
├── photos/            # uploaded photos
├── skills/            # markdown skill files
└── go.mod
```

**Two pages for now**
- `/photos` — upload + display photos (store files on disk, metadata in SQLite)
- `/skills` — reads `.md` files from `skills/` dir, renders them as HTML

**Go best practices we'll follow**
- Separate concerns: handlers don't touch the DB directly
- Use interfaces for the store layer (easy to swap later)
- Error handling done properly (no ignoring errors)
- Config via env vars, not hardcoded


# Notes

Store: Just a name for the layer of your app that talks to the database. Think of it as a "data store" — it stores and retrieves things. The interface defines what it can do, the SQLite implementation defines how it does it.

DSN = Data Source Name — just a string that tells the driver where your database is. For SQLite it's simply a file path like "lifeos.db". For Postgres it'd be something like "postgres://user:pass@localhost/dbname".
