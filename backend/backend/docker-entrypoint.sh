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
    log "WARNING: APP_KEY is not set in the environment!"
    log "This may cause a 500 error if Laravel cannot find a key in .env either."
else
    log "APP_KEY is set in the environment."
fi

# We will NOT copy .env.example to .env here, 
# as Dockply should provide variables via environment.
# If Laravel requires a .env file to exist, it's better to create an empty one
# to avoid it reading a fallback .env that might have different keys.
if [ ! -f .env ]; then
    touch .env
    log "Created empty .env file to ensure Laravel doesn't complain, favoring system env."
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
