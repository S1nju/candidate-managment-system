FROM nginx:alpine

# Copy public assets from backend
COPY backend/public /var/www/public

# Copy nginx configuration
COPY nginx/conf.d /etc/nginx/conf.d

# Ensure permissions (optional, nginx works as root/nginx)
# RUN chown -R nginx:nginx /var/www/public
