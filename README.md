# SmartNotesGenerator

## Run the backend locally

Apply `backend/migrations/001_create_lecture_messages.sql` to the configured
MySQL database before using saved lecture Q&A. Then start the backend from the
`backend` directory with:

```powershell
python run_local.py
```

The local runner binds to `127.0.0.1`; the API also rejects requests whose
client address is not loopback. Do not expose this development application
through a public interface or reverse proxy.