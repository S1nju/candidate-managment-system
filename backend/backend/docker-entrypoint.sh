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
        echo "APP_KEY=" > .env
        log "Created new .env with APP_KEY placeholder."
    elif ! grep -q "APP_KEY=" .env; then
        echo "APP_KEY=" >> .env
        log "Added APP_KEY placeholder to existing .env."
    fi
    
    if [ -z "$(grep "APP_KEY=base64:" .env)" ]; then
        log "APP_KEY empty or invalid in .env. Generating..."
        php artisan key:generate --no-interaction --force
        # Re-check to confirm
        if grep -q "APP_KEY=base64:" .env; then
            log "APP_KEY successfully generated."
        else
            log "ERROR: Failed to generate APP_KEY automatically. Please set it manually in Dockply."
        fi
    else
        log "APP_KEY found in .env."
    fi
else
    log "APP_KEY is set in the environment."
    if [ ! -f .env ]; then
        echo "APP_KEY=$APP_KEY" > .env
    fi
fi

# Emergency Debug Mode: If we are getting 500, we need to see it.
# We only enable this if APP_DEBUG is not explicitly set to false.
if [ -z "$APP_DEBUG" ] || [ "$APP_DEBUG" = "null" ]; then
    log "Enabling APP_DEBUG=true for investigation..."
    if grep -q "APP_DEBUG=" .env; then
        sed -i 's/APP_DEBUG=.*/APP_DEBUG=true/' .env
    else
        echo "APP_DEBUG=true" >> .env
    fi
    export APP_DEBUG=true
fi

# Ensure storage permissions
log "Fixing storage permissions..."
chown -R www-data:www-data /var/www/storage
chmod -R 775 /var/www/storage

# Migrate database
if [ "$DB_FRESH" = "true" ]; then
    log "DB_FRESH is true. Running migrate:fresh..."
    php artisan migrate:fresh --force
else
    log "Migrating database..."
    if ! php artisan migrate --force; then
        log "WARNING: Migration failed. Check if tables already exist or if DB is connected."
    fi
fi

# Cache configuration
log "Clearing and caching configuration..."
php artisan config:clear
php artisan route:clear
php artisan view:clear

if [ "$APP_ENV" = "production" ]; then
    log "Production environment detected. Caching..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

# Link storage
log "Linking storage..."
php artisan storage:link

# Start PHP-FPM (or passed command)
log "Starting application command: $@"
exec "$@"
