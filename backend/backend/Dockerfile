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

# Fix line endings and permissions for entrypoint
RUN apt-get update && apt-get install -y dos2unix \
    && dos2unix docker-entrypoint.sh \
    && chmod 755 docker-entrypoint.sh \
    && chown www-data:www-data docker-entrypoint.sh

# Expose HTTP port
EXPOSE 8000

# Entrypoint to handle setup
# Using sh explicitly to avoid permission issues with direct execution
ENTRYPOINT ["/bin/sh", "/var/www/docker-entrypoint.sh"]

# Start Laravel directly (passed as args to entrypoint)
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
