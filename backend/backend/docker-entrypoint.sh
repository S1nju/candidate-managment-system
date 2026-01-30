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
if [ "$DB_FRESH" = "true" ]; then
    log "DB_FRESH is true. Running migrate:fresh..."
    php artisan migrate:fresh --force
else
    log "Migrating database..."
    if ! php artisan migrate --force; then
        log "ERROR: Migration failed. If tables already exist, try setting DB_FRESH=true in your environment variables."
        log "CAUTION: DB_FRESH=true will wipe all data in the database!"
        # We don't exit here to allow the app to attempt to start anyway if possible
        # but in most cases, a migration failure is critical.
        # exit 1 
    fi
fi

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
