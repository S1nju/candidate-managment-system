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
    Create `backend/.env` with the following content (update the secrets!):
    ```ini
    APP_NAME="SignMe"
    APP_ENV=production
    APP_KEY=base64:YOUR_GENERATED_KEY_HERE
    APP_DEBUG=false
    APP_URL=https://signmehere.cloud

    LOG_CHANNEL=stack
    LOG_LEVEL=debug

    DB_CONNECTION=mysql
    DB_HOST=db
    DB_PORT=3306
    DB_DATABASE=signme
    DB_USERNAME=signme
    DB_PASSWORD=password

    BROADCAST_CONNECTION=log
    FILESYSTEM_DISK=local
    
    # Store photos in public for now (mapped to docker volume)
    # FILESYSTEM_DISK=public 
    # Use s3 if you configured it

    QUEUE_CONNECTION=redis
    CACHE_STORE=redis
    SESSION_DRIVER=redis
    
    REDIS_HOST=redis
    REDIS_PASSWORD=null
    REDIS_PORT=6379

    SANCTUM_STATEFUL_DOMAINS=signmehere.cloud
    
    DIDIT_API_KEY=your_didit_key
    DIDIT_WORKFLOW_ID=your_workflow_id
    ```
    
    *Generate `APP_KEY` by running `docker-compose run --rm app php artisan key:generate --show` after initial setup, or generate locally.*

3.  **HTTPS Setup (First Time Only)**:
    Run the initialization script to generate SSL certificates:
    ```bash
    chmod +x init-letsencrypt.sh
    ./init-letsencrypt.sh
    ```
    *Follow the prompts (if any) or wait for it to complete.*

4.  **Confirm Build**:
    ```bash
    docker-compose up -d --build
    ```

5.  **Run Migrations & Seeds**:
    ```bash
    docker-compose exec app php artisan migrate --force
    docker-compose exec app php artisan db:seed --force
    ```

    *Note: This creates a default admin account: `admin@signme.com` / `password`.*

6.  **Access Application**:
    - App: `https://signmehere.cloud`

## SSL (Optional but Recommended)
For SSL, verify `nginx` configuration to use Certbot.
