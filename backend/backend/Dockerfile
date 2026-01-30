FROM php:8.4-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    supervisor \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# PHP extensions
RUN pecl install redis \
    && docker-php-ext-enable redis

RUN docker-php-ext-install \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    sockets

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# App directory
WORKDIR /var/www

# Copy code
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader

# Permissions
RUN chown -R www-data:www-data /var/www

# Expose HTTP port (what Dockploy will route to)
EXPOSE 8000

# Copy and make entrypoint script executable
RUN chmod +x /var/www/docker-entrypoint.sh

# Entrypoint to handle setup
ENTRYPOINT ["/var/www/docker-entrypoint.sh"]

# Start Laravel directly (passed as $@ to entrypoint)
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
