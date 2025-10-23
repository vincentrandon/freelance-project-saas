import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'freelancermgmt.settings')

app = Celery('freelancermgmt')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Periodic task schedule
app.conf.beat_schedule = {
    # Monitor AI training jobs every 10 minutes
    'monitor-training-jobs': {
        'task': 'document_processing.tasks.monitor_training_jobs',
        'schedule': crontab(minute='*/10'),  # Every 10 minutes
    },
    # Monitor active model performance every hour
    'monitor-model-performance': {
        'task': 'document_processing.tasks.monitor_model_performance',
        'schedule': crontab(minute=0),  # Every hour at minute 0
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
