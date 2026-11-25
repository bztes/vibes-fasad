---
'@bztes/vibes-fasad': minor
---

Replace `DATABASE_URL` and `DIR` with a single `DATA_DIR`, holding the database as `app.db`. To upgrade, rename `local.db` in the data directory to `app.db` and set `DATA_DIR` instead of `DIR`.
