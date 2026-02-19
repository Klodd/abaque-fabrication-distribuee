from django.urls import path
from . import views

app_name = "choices"

urlpatterns = [
    path("", views.index, name="index"),
    path("update/", views.update_choice, name="update"),
    # API endpoints
    path("api/configurations/", views.api_get_configurations, name="api_configurations"),
    path("api/saved-jobs/", views.api_get_saved_jobs, name="api_saved_jobs"),
    path("api/saved-jobs/<int:job_id>/delete/", views.api_delete_saved_job, name="api_delete_job"),
    path("api/export-configurations/", views.api_export_configurations, name="api_export_configurations"),
    path("api/import-configurations/", views.api_import_configurations, name="api_import_configurations"),
    path("api/export-jobs/", views.api_export_saved_jobs, name="api_export_jobs"),
    path("api/import-jobs/", views.api_import_saved_jobs, name="api_import_jobs"),
]
