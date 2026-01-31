#!/bin/sh

# Exit on fail
set -e

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Starting entrypoint script..."

# Sync Environment Variables to .env
# This ensures that both CLI and Web processes see the same configuration
log "Syncing environment variables to .env..."
touch .env
# List of critical variables to sync
VARS="APP_NAME APP_ENV APP_KEY APP_DEBUG APP_URL DB_CONNECTION DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD SANCTUM_STATEFUL_DOMAINS SESSION_DOMAIN SESSION_DRIVER SESSION_SECURE_COOKIE LOG_CHANNEL"

for var in $VARS; do
    val=$(eval echo \$$var)
    if [ ! -z "$val" ]; then
        if grep -q "^$var=" .env; then
            # Use | as delimiter for sed to handle cases where $val contains /
            sed -i "s|^$var=.*|$var=$val|" .env
        else
            echo "$var=$val" >> .env
        fi
    fi
done

# Handle APP_KEY generation if still missing after sync
if ! grep -q "APP_KEY=base64:" .env; then
    log "APP_KEY empty or missing in .env. Generating..."
    # Ensure placeholder exists for key:generate
    if ! grep -q "^APP_KEY=" .env; then
        echo "APP_KEY=" >> .env
    fi
    php artisan key:generate --no-interaction --force
fi

# Force Production Domains for Sanctum/Sessions if in production
if [ "$APP_ENV" = "production" ]; then
    log "Configuring production domains for Sanctum..."
    DOMAIN="signmehere.cloud"
    # Only append if not already set to the correct production value
    if ! grep -q "SANCTUM_STATEFUL_DOMAINS=.*$DOMAIN" .env; then
        echo "SANCTUM_STATEFUL_DOMAINS=$DOMAIN,api.$DOMAIN" >> .env
        echo "SESSION_DOMAIN=.$DOMAIN" >> .env
        echo "SESSION_SECURE_COOKIE=true" >> .env
    fi
fi

# Wait for Database
# Ensure we are checking mysql, not sqlite
log "Waiting for database connection ($DB_HOST:$DB_PORT)..."
MAX_TRIES=30
COUNT=0
# Use a simple PHP check instead of tinker to be faster and more direct
while ! php -r "try { \$pdo = new PDO('mysql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD')); exit(0); } catch (Exception \$e) { exit(1); }" > /dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_TRIES ]; then
        log "CRITICAL WARNING: Database connection check timed out. Proceeding anyway..."
        break
    fi
    log "Database not ready yet... waiting (try $COUNT/$MAX_TRIES)"
    sleep 2
done

# Verify key is loaded
log "Verifying loaded configuration..."
# Clear cache before checking to ensure we see the latest .env
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
