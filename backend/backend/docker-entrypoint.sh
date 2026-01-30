#!/bin/sh

# Exit on fail
set -e

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Starting entrypoint script..."

# Handle APP_KEY
if [ -z "$APP_KEY" ]; then
    log "APP_KEY not found in environment. Checking .env..."
    if [ ! -f .env ]; then
        touch .env
        log "Created .env file."
    fi
    
    if grep -q "APP_KEY=" .env && [ -n "$(grep "APP_KEY=base64:" .env)" ]; then
        log "APP_KEY found in .env file."
    else
        log "APP_KEY not found in .env. Generating one..."
        php artisan key:generate --no-interaction --force
        log "APP_KEY generated and saved to .env."
    fi
else
    log "APP_KEY is set in the environment."
    # Ensure .env exists even if using environment variables
    if [ ! -f .env ]; then
        touch .env
    fi
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
