"""
Django settings for freelancermgmt project.
"""

from pathlib import Path
from decouple import config
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    
    # Third-party apps
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'storages',
    'rosetta',

    # Local apps
    'customers',
    'leads',
    'projects',
    'finance',
    'invoicing',
    'document_processing',
    'profiles',
    'notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'freelancermgmt.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'freelancermgmt.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='freelancermgmt'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'en'

LANGUAGES = [
    ('en', 'English'),
    ('fr', 'Français'),
]

LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django Sites Framework
SITE_ID = 1

# CORS Settings
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# DJ Rest Auth Settings
REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_COOKIE': 'auth-token',
    'JWT_AUTH_REFRESH_COOKIE': 'refresh-token',
    'JWT_AUTH_HTTPONLY': False,
    'PASSWORD_RESET_SERIALIZER': 'dj_rest_auth.serializers.PasswordResetSerializer',
}

# Django Allauth Settings
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
# Keep username field active so adapter can auto-generate it
# Setting to None would disable username entirely
# ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_EMAIL_VERIFICATION = 'optional'
ACCOUNT_ADAPTER = 'freelancermgmt.adapters.CustomAccountAdapter'

# Password Reset Settings
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour in seconds
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# Celery Settings
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULE = {
    'sync-bank-accounts-daily': {
        'task': 'finance.tasks.sync_all_bank_accounts',
        'schedule': timedelta(hours=24),
    },
}

# AWS S3 Settings (for production)
USE_S3 = config('USE_S3', default=False, cast=bool)

if USE_S3:
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='eu-west-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    AWS_DEFAULT_ACL = 'private'
    AWS_S3_FILE_OVERWRITE = False
    
    # S3 static and media settings
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
        },
        'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
        },
    }

# Email Settings
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='localhost')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@freelancermgmt.com')

# DRF Spectacular Settings (API Documentation)
SPECTACULAR_SETTINGS = {
    'TITLE': 'Freelancer Management API',
    'DESCRIPTION': 'API for managing customers, leads, projects, finances, and invoicing',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Open Banking Settings
OPENBANKING_CLIENT_ID = config('OPENBANKING_CLIENT_ID', default='')
OPENBANKING_CLIENT_SECRET = config('OPENBANKING_CLIENT_SECRET', default='')
OPENBANKING_API_URL = config('OPENBANKING_API_URL', default='')
OPENBANKING_REDIRECT_URI = config('OPENBANKING_REDIRECT_URI', default='')

# Social Auth Settings (Google)
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'APP': {
            'client_id': config('GOOGLE_OAUTH_CLIENT_ID', default=''),
            'secret': config('GOOGLE_OAUTH_CLIENT_SECRET', default=''),
            'key': ''
        }
    },
    'github': {
        'SCOPE': [
            'user',
            'email',
        ],
        'APP': {
            'client_id': config('GITHUB_OAUTH_CLIENT_ID', default=''),
            'secret': config('GITHUB_OAUTH_CLIENT_SECRET', default=''),
            'key': ''
        }
    }
}

# OpenAI Settings (Document Processing & AI Assistant)
OPENAI_API_KEY = config('OPENAI_API_KEY', default='')
OPENAI_MODEL = config('OPENAI_MODEL', default='gpt-5')  # Updated to GPT-5 (Aug 2025)
OPENAI_MAX_TOKENS = config('OPENAI_MAX_TOKENS', default=6000, cast=int)  # Increased for better extraction
OPENAI_TEMPERATURE = config('OPENAI_TEMPERATURE', default=0.1, cast=float)
OPENAI_REASONING_EFFORT = config('OPENAI_REASONING_EFFORT', default='medium')  # For GPT-5: minimal, low, medium, high

# Freelance Pricing Settings
DEFAULT_TJM = config('DEFAULT_TJM', default=500, cast=float)  # Default if not set in profile
DEFAULT_SECURITY_MARGIN = config('DEFAULT_SECURITY_MARGIN', default=10.0, cast=float)  # Default 10%
TJM_HOURS_PER_DAY = config('TJM_HOURS_PER_DAY', default=7, cast=int)  # For hourly conversion

# Estimate & Signature Settings
ESTIMATE_SIGNATURE_ENABLED = config('ESTIMATE_SIGNATURE_ENABLED', default=True, cast=bool)
SIGNATURE_CERTIFICATE_PATH = config('SIGNATURE_CERTIFICATE_PATH', default=None)
SIGNATURE_PRIVATE_KEY_PATH = config('SIGNATURE_PRIVATE_KEY_PATH', default=None)
SIGNATURE_LINK_EXPIRY_DAYS = config('SIGNATURE_LINK_EXPIRY_DAYS', default=30, cast=int)

# Estimate Settings
ESTIMATE_DEFAULT_VALID_DAYS = config('ESTIMATE_DEFAULT_VALID_DAYS', default=30, cast=int)
ESTIMATE_NUMBER_PREFIX = config('ESTIMATE_NUMBER_PREFIX', default='DEVIS')
INVOICE_NUMBER_PREFIX = config('INVOICE_NUMBER_PREFIX', default='FACT')
