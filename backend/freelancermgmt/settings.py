"""
Django settings for freelancermgmt project.
"""

from pathlib import Path
from decouple import config
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

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
    'oauth2_provider',
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
    'cra',
    'ai_actions',
    'subscriptions.apps.SubscriptionsConfig',
]

# Optional apps --------------------------------------------------------------
try:
    import rosetta  # noqa: F401
except ImportError:
    if 'rosetta' in INSTALLED_APPS:
        INSTALLED_APPS.remove('rosetta')

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

# Authentication Backends
AUTHENTICATION_BACKENDS = [
    # Needed to login by username in Django admin, regardless of `allauth`
    'django.contrib.auth.backends.ModelBackend',
    # `allauth` specific authentication methods, such as login by e-mail
    'allauth.account.auth_backends.AuthenticationBackend',
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

def _env_list(name, default):
    """Split comma-separated env values into a trimmed list, ignoring blanks."""
    raw = config(name, default=default)
    return [item.strip() for item in raw.split(',') if item.strip()]


# CORS Settings
CORS_ALLOWED_ORIGINS = _env_list(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173'
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https?://localhost(:\d+)?$",
    r"^https?://127\.0\.0\.1(:\d+)?$",
]
CSRF_TRUSTED_ORIGINS = _env_list(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost,http://127.0.0.1,http://localhost:5173,http://127.0.0.1:5173'
)

# REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'oauth2_provider.contrib.rest_framework.OAuth2Authentication',
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
    'PASSWORD_RESET_SERIALIZER': 'freelancermgmt.serializers.CustomPasswordResetSerializer',
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
SOCIALACCOUNT_ADAPTER = 'freelancermgmt.socialaccount_adapter.CustomSocialAccountAdapter'
SOCIALACCOUNT_AUTO_SIGNUP = True

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
CELERY_IMPORTS = (
    'utils.email_tasks',
)
CELERY_BEAT_SCHEDULE = {
    'sync-bank-accounts-daily': {
        'task': 'finance.tasks.sync_all_bank_accounts',
        'schedule': timedelta(hours=24),
    },
    'check-trial-expirations-daily': {
        'task': 'subscriptions.tasks.check_trial_expirations',
        'schedule': timedelta(hours=24),
    },
    'send-trial-ending-reminders-daily': {
        'task': 'subscriptions.tasks.send_trial_ending_reminders',
        'schedule': timedelta(hours=24),
    },
    'sync-stripe-subscriptions-hourly': {
        'task': 'subscriptions.tasks.sync_stripe_subscriptions',
        'schedule': timedelta(hours=1),
    },
}

# AWS S3 Settings (for production) - Compatible with Hetzner S3
USE_S3 = config('USE_S3', default=False, cast=bool)

if USE_S3:
    AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='eu-central-1')

    # Support for custom S3 endpoints (Hetzner, DigitalOcean Spaces, etc.)
    AWS_S3_ENDPOINT_URL = config('AWS_S3_ENDPOINT_URL', default=None)

    # Dynamic custom domain based on endpoint
    if AWS_S3_ENDPOINT_URL:
        # Extract hostname from endpoint for Hetzner/custom S3
        from urllib.parse import urlparse
        parsed = urlparse(AWS_S3_ENDPOINT_URL)
        AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.{parsed.netloc}'
    else:
        # Standard AWS S3 domain
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
# MailerSend Configuration (API is recommended over SMTP for better features)
# For production: Use 'utils.mailersend_backend.MailerSendBackend' with MailerSend API
# For development: Use 'django.core.mail.backends.console.EmailBackend' to print emails to console
# Alternative: Use 'django.core.mail.backends.smtp.EmailBackend' for SMTP relay
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')

# MailerSend API Key (Recommended)
# Generate API key in MailerSend dashboard: Settings → API Tokens
# Required when using utils.mailersend_backend.MailerSendBackend
MAILERSEND_API_KEY = config('MAILERSEND_API_KEY', default='')

# Sender Email (must be verified domain in MailerSend)
# This should be a verified email address from your domain (e.g., noreply@yourdomain.com)
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@kiik.app')

# MailerSend SMTP Settings (Alternative to API)
# Only needed if using EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# SMTP Server: smtp.mailersend.net
# Port: 587 (TLS/STARTTLS)
# See: https://www.mailersend.com/help/smtp-relay
EMAIL_HOST = config('EMAIL_HOST', default='smtp.mailersend.net')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)  # Use TLS (587), not SSL (465)

# MailerSend SMTP Credentials (only if using SMTP backend)
# Generate SMTP credentials in MailerSend dashboard: Domains → Your Domain → SMTP Users
# Username and Password are case-sensitive
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

# DRF Spectacular Settings (API Documentation)
SPECTACULAR_SETTINGS = {
    'TITLE': 'kiik.app API',
    'DESCRIPTION': 'API for managing customers, leads, projects, finances, and invoicing with ChatGPT integration',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,

    # OAuth 2.0 Security Scheme for ChatGPT Integration
    'SECURITY': [{
        'OAuth2': []
    }],
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'OAuth2': {
                'type': 'oauth2',
                'flows': {
                    'authorizationCode': {
                        'authorizationUrl': config('OAUTH_AUTHORIZATION_URL', default='/oauth/authorize/'),
                        'tokenUrl': config('OAUTH_TOKEN_URL', default='/oauth/token/'),
                        'refreshUrl': config('OAUTH_TOKEN_URL', default='/oauth/token/'),
                        'scopes': {
                            # Customer management
                            'customers:read': 'View customers',
                            'customers:write': 'Create and update customers',

                            # Project management
                            'projects:read': 'View projects',
                            'projects:write': 'Create and update projects',

                            # Invoice management
                            'invoices:read': 'View invoices',
                            'invoices:write': 'Create and update invoices',

                            # Estimate management
                            'estimates:read': 'View estimates',
                            'estimates:write': 'Create and update estimates',

                            # CRA (Activity Reports)
                            'cra:read': 'View activity reports',
                            'cra:write': 'Create and update activity reports',

                            # Document import
                            'documents:import': 'Import documents and approve imports',

                            # Context access (read-only aggregated data)
                            'context:read': 'Read aggregated context information',
                        }
                    }
                }
            },
            'Bearer': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
            }
        }
    },

    # Operation ID configuration for stable tool names
    'CAMELIZE_NAMES': False,
    'SCHEMA_COERCE_PATH_PK': True,
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
OPENAI_CA_BUNDLE = config('OPENAI_CA_BUNDLE', default=None)
OPENAI_VERIFY_SSL = config('OPENAI_VERIFY_SSL', default=True, cast=bool)

# INSEE API Settings (French Company Lookup)
# Get your API key from: https://portail-api.insee.fr/
INSEE_API_KEY = config('INSEE_API_KEY', default='')

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

# Stripe Settings (Subscription & Billing)
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')

# Subscription & Trial Settings
FREE_TRIAL_DAYS = config('FREE_TRIAL_DAYS', default=7, cast=int)
FREE_TRIAL_TIER = config('FREE_TRIAL_TIER', default='CORE')

# FREE Tier Usage Limits (per calendar month)
FREE_INVOICE_LIMIT = config('FREE_INVOICE_LIMIT', default=25, cast=int)
FREE_ESTIMATE_LIMIT = config('FREE_ESTIMATE_LIMIT', default=25, cast=int)
FREE_IMPORT_LIMIT = config('FREE_IMPORT_LIMIT', default=10, cast=int)

# Production Security Settings
if not DEBUG:
    # SSL/HTTPS Settings
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)
    CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=True, cast=bool)

    # HSTS (HTTP Strict Transport Security)
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
    SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)

    # Security Headers
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

    # Proxy Headers (for nginx reverse proxy)
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Sentry Error Tracking (Production)
SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN and not DEBUG:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
        ],
        # Set traces_sample_rate to 1.0 to capture 100% of transactions for performance monitoring.
        # Adjust this value in production to reduce overhead.
        traces_sample_rate=config('SENTRY_TRACES_SAMPLE_RATE', default=0.1, cast=float),
        # If you wish to associate users to errors (assuming you are using
        # django.contrib.auth) you may enable sending PII data.
        send_default_pii=True,
        environment=config('SENTRY_ENVIRONMENT', default='production'),
    )

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 1024 * 1024 * 15,  # 15 MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django_error.log',
            'maxBytes': 1024 * 1024 * 15,  # 15 MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'celery_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'celery.log',
            'maxBytes': 1024 * 1024 * 15,  # 15 MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console', 'celery_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'document_processing': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'finance': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# OAuth2 Provider Settings (django-oauth-toolkit)
# Configuration for ChatGPT and third-party app integration
OAUTH2_PROVIDER = {
    # Token lifetimes
    'ACCESS_TOKEN_EXPIRE_SECONDS': config('OAUTH2_PROVIDER_ACCESS_TOKEN_EXPIRE_SECONDS', default=3600, cast=int),  # 1 hour
    'REFRESH_TOKEN_EXPIRE_SECONDS': config('OAUTH2_PROVIDER_REFRESH_TOKEN_EXPIRE_SECONDS', default=604800, cast=int),  # 7 days
    'AUTHORIZATION_CODE_EXPIRE_SECONDS': config('OAUTH2_PROVIDER_AUTHORIZATION_CODE_EXPIRE_SECONDS', default=60, cast=int),  # 1 minute

    # PKCE is required for ChatGPT integration
    'PKCE_REQUIRED': True,

    # Supported scopes (must match SPECTACULAR_SETTINGS scopes)
    'SCOPES': {
        'customers:read': 'View customers',
        'customers:write': 'Create and update customers',
        'projects:read': 'View projects',
        'projects:write': 'Create and update projects',
        'invoices:read': 'View invoices',
        'invoices:write': 'Create and update invoices',
        'estimates:read': 'View estimates',
        'estimates:write': 'Create and update estimates',
        'cra:read': 'View activity reports',
        'cra:write': 'Create and update activity reports',
        'documents:import': 'Import documents and approve imports',
        'context:read': 'Read aggregated context information',
    },

    # Default scopes granted when none are requested
    'DEFAULT_SCOPES': [],

    # Allow rotating refresh tokens for enhanced security
    'ROTATE_REFRESH_TOKEN': True,

    # OAuth2 grant types
    'ALLOWED_REDIRECT_URI_SCHEMES': ['https', 'http'],  # Allow http for local dev

    # Request and response handling
    'ERROR_RESPONSE_WITH_SCOPES': True,
}
