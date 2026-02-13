# pern-dashboard-backend

## Auth (JWT)

- **POST /api/auth/register** – body: `{ email, password, name, role? }` (role: student | teacher | admin). Returns `{ user, token }`.
- **POST /api/auth/login** – body: `{ email, password }`. Returns `{ user, token }`.
- **GET /api/auth/me** – header: `Authorization: Bearer <token>`. Returns `{ user }`.

Set **JWT_SECRET** in `.env` (required in production).
