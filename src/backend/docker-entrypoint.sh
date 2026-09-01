#!/bin/sh

# Exit on fail
set -e

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log "Starting entrypoint script (Direct Env Mode)..."
log "USER: $(id)"
log "PWD: $(pwd)"

# 0. EMERGENCY DEPENDENCY CHECK
if [ ! -f /var/www/vendor/autoload.php ]; then
    log "ERROR: /var/www/vendor/autoload.php is MISSING!"
    log "Current directory: $(pwd)"
    log "Listing current directory content:"
    ls -la
    
    if [ -f composer.json ]; then
        log "Attempting to run composer install now..."
        composer install --no-interaction --no-dev --optimize-autoloader || log "Composer install failed!"
    else
        log "CRITICAL: composer.json not found in $(pwd). Container cannot start."
        exit 1
    fi
fi
if [ -f /var/www/vendor/autoload.php ]; then
    log "Success: vendor/autoload.php found."
fi

# 1. DELETE ANY .ENV FILE
# Per user request, we do not use .env files. 
# We delete it to ensure Laravel ONLY looks at the container environment.
if [ -f .env ]; then
    log "Removing existing .env file to ensure direct environment usage..."
    rm -f .env
fi

# 2. DELETE ANY OLD CACHE (Crucial for Docker)
log "Cleaning Laravel bootstrap cache..."
rm -f /var/www/bootstrap/cache/*.php

# 3. SELF-HEALING: Check APP_KEY
# If APP_KEY is missing, we must generate it, but we can't save it to .env easily
# without violating the "no env file" rule. 
# However, Laravel needs it. We'll check if it's set.
if [ -z "$APP_KEY" ]; then
    log "WARNING: APP_KEY is not set in the environment!"
    log "Generating a temporary one for this session..."
    export APP_KEY=$(php artisan key:generate --show --no-interaction)
fi

# 4. EMERGENCY DEBUG MODE
# We force these via exports if they aren't set
export APP_DEBUG=${APP_DEBUG:-true}
export LOG_CHANNEL=${LOG_CHANNEL:-stderr}

# 5. WAIT FOR DATABASE (MYSQL)
log "Waiting for MySQL connection ($DB_HOST:$DB_PORT)..."
MAX_TRIES=30
COUNT=0
while ! php -r "try { \$pdo = new PDO('mysql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT'), getenv('DB_USERNAME'), getenv('DB_PASSWORD')); exit(0); } catch (Exception \$e) { exit(1); }" > /dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_TRIES ]; then
        log "WARNING: Database connection check timed out. Proceeding anyway..."
        break
    fi
    log "Database not ready yet... waiting (try $COUNT/$MAX_TRIES)"
    sleep 2
done

# 6. STORAGE PERMISSIONS & DIRECTORIES
log "Setting up storage..."
mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache
chown -R www-data:www-data /var/www/storage
chmod -R 775 /var/www/storage

# 7. CLEAR ARTISAN CACHE
log "Clearing artisan cache..."
php artisan config:clear
php artisan cache:clear

# 8. DATABASE MIGRATIONS
log "Migrating database..."
php artisan migrate --force || log "Migration warning/failure."

# 9. STORAGE LINK
log "Linking storage..."
php artisan storage:link --force || true

# Start command
log "Starting application command: $@"
exec "$@"
