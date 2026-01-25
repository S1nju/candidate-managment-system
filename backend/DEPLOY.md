# Deployment Guide for Hostinger VPS

## Prerequisites
- A Hostinger VPS with Docker and Docker Compose installed.
- SSH access to the VPS.
- Valid `.env` file for the backend.

## Structure
Ensure your project structure on the server matches:
```
/projects/signMe/backend
├── backend/          (Laravel Code)
├── frontend/         (Next.js Code)
├── nginx/            (Nginx Config)
├── docker-compose.yml
└── .env              (Production Environment Variables)
```

## Steps

1.  **Clone/Copy Code**:
    Transfer your code to the VPS (e.g., using `rsync` or `git clone`).

2.  **Environment Setup**:
    Copy `backend/.env.example` to `backend/.env` (or root depending on setup) and configure:
    ```ini
    APP_ENV=production
    APP_DEBUG=false
    DB_HOST=db
    REDIS_HOST=redis
    ```

3.  **Build and Run**:
    Run the following command in the root directory (where `docker-compose.yml` is):
    ```bash
    docker-compose up -d --build
    ```

4.  **Run Migrations**:
    ```bash
    docker-compose exec app php artisan migrate --force
    ```

5.  **Access Application**:
    - Frontend: `http://<your-vps-ip>`
    - API: `http://<your-vps-ip>/api`

## SSL (Optional but Recommended)
For SSL, verify `nginx` configuration to use Certbot.
