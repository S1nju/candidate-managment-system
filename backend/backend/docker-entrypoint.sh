#!/bin/sh

# Exit on fail
set -e

# Wait for DB to be ready (optional, or handle in compose healthcheck)

# Install dependencies if not already (for dev mostly, prod should be in build)
# Ensure storage permissions
echo "Fixing storage permissions..."
chown -R www-data:www-data /var/www/storage
chmod -R 775 /var/www/storage

# Migrate database
echo "Migrating database..."
php artisan migrate --force

# Cache configuration
echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Link storage
echo "Linking storage..."
php artisan storage:link

# Start PHP-FPM
echo "Starting PHP-FPM..."
php-fpm
