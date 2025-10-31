from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'plans', views.SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'subscriptions', views.SubscriptionViewSet, basename='subscription')
router.register(r'admin/subscriptions', views.AdminSubscriptionViewSet, basename='admin-subscription')
router.register(r'admin/usage', views.UsageCounterViewSet, basename='admin-usage')

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/', views.stripe_webhook, name='stripe-webhook'),
]
