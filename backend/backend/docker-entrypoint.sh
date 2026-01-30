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
        # Ensure there is a newline before appending
        sed -i '$a\' .env
        echo "APP_KEY=" >> .env
        log "Added APP_KEY placeholder to existing .env."
    fi
    
    # Check if it has a value
    if [ -z "$(grep "APP_KEY=base64:" .env)" ]; then
        log "APP_KEY empty or invalid in .env. Generating..."
        php artisan key:generate --no-interaction --force
    fi
else
    log "APP_KEY is set in the environment."
    if [ ! -f .env ]; then
        echo "APP_KEY=$APP_KEY" > .env
    fi
fi

# Emergency Debug Mode and Log Visibility
log "Enabling log visibility and debug mode..."
export APP_DEBUG=true
export LOG_CHANNEL=stderr

# Force Production Domains for Sanctum/Sessions
if [ "$APP_ENV" = "production" ]; then
    log "Configuring production domains for Sanctum..."
    export SANCTUM_STATEFUL_DOMAINS="signmehere.cloud,api.signmehere.cloud"
    export SESSION_DOMAIN=".signmehere.cloud"
    export SESSION_SECURE_COOKIE=true
fi

# Wait for Database
log "Waiting for database connection ($DB_HOST:$DB_PORT)..."
MAX_TRIES=30
COUNT=0
while ! php artisan tinker --execute="try { DB::connection()->getPdo(); exit(0); } catch (\Exception \$e) { exit(1); }" > /dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_TRIES ]; then
        log "CRITICAL ERROR: Database connection timed out after $MAX_TRIES tries."
        break
    fi
    log "Database not ready yet... waiting (try $COUNT/$MAX_TRIES)"
    sleep 2
done

# Verify key is loaded
log "Verifying loaded configuration..."
php artisan config:clear > /dev/null
KEY_CHECK=$(php artisan tinker --execute="echo config('app.key');")
if [ -z "$KEY_CHECK" ]; then
    log "CRITICAL ERROR: APP_KEY is still empty in Laravel config!"
else
    log "APP_KEY confirmed in config."
fi

# Ensure storage permissions
log "Fixing storage permissions..."
chown -R www-data:www-data /var/www/storage
chmod -R 777 /var/www/storage # Be aggressive for debugging

# Migrate database
if [ "$DB_FRESH" = "true" ]; then
    log "DB_FRESH is true. Running migrate:fresh..."
    php artisan migrate:fresh --force
else
    log "Migrating database..."
    php artisan migrate --force || log "Migration warning/failure."
fi

# Cache configuration
log "Preparing application cache..."
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
