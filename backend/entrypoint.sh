#!/bin/sh

# Exit on error
set -e

# Create media directories if they don't exist
mkdir -p /app/media/imported_documents
mkdir -p /app/staticfiles

# Run migrations
python manage.py migrate

# Collect static files (Django admin CSS/JS)
python manage.py collectstatic --noinput

# Start the application
exec "$@"






