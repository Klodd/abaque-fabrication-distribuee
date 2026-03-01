from django.urls import path
from . import views

app_name = "choices"

urlpatterns = [
    path("", views.index, name="index"),
    path("update/", views.update_choice, name="update"),
    # API endpoints
    path("api/configurations/", views.api_get_configurations, name="api_configurations"),
    path("api/saved-jobs/", views.api_get_saved_jobs, name="api_get_saved_jobs"),
    path("api/saved-jobs/<int:job_id>/apply/", views.apply_job, name="apply_job"),
    path("api/saved-jobs/<int:job_id>/delete/", views.api_delete_job, name="api_delete_job"),
]
