from django.db import models
from django.contrib.auth.models import User
import json


class UserConfiguration(models.Model):
    """Store user-customized option configurations per group"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="configurations")
    group_id = models.IntegerField()  # Reference to the group ID from DEFAULT_GROUPS
    group_name = models.CharField(max_length=255)
    options_json = models.JSONField(default=list)  # List of option objects
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'group_id')
        indexes = [
            models.Index(fields=['user', 'group_id']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.group_name}"


class UserSavedJob(models.Model):
    """Store user saved job states"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_jobs")
    name = models.CharField(max_length=255)
    state_id = models.CharField(max_length=1024)  # base64url encoded state
    state_json = models.JSONField(default=dict)  # {choices: {...}, rows: [...]}
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.name}"
