#!/bin/sh

# Exit on fail
set -e

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Starting entrypoint script..."

# Check if APP_KEY is set
if [ -z "$APP_KEY" ]; then
    log "WARNING: APP_KEY is not set. Attempting to generate one if .env exists..."
    if [ ! -f .env ]; then
        log "Creating .env from .env.example..."
        cp .env.example .env
    fi
    php artisan key:generate --no-interaction
else
    log "APP_KEY is set."
fi

# Ensure storage permissions
log "Fixing storage permissions..."
chown -R www-data:www-data /var/www/storage
chmod -R 775 /var/www/storage

# Migrate database
log "Migrating database..."
php artisan migrate --force

# Cache configuration
log "Caching configuration and routes..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Link storage
log "Linking storage..."
php artisan storage:link

# Start PHP-FPM (or passed command)
log "Starting application command: $@"
exec "$@"
