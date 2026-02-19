from django.contrib import admin
from .models import UserConfiguration, UserSavedJob


@admin.register(UserConfiguration)
class UserConfigurationAdmin(admin.ModelAdmin):
    list_display = ('user', 'group_name', 'updated_at')
    list_filter = ('group_name', 'user')
    search_fields = ('user__username', 'group_name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(UserSavedJob)
class UserSavedJobAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'created_at')
    list_filter = ('user', 'created_at')
    search_fields = ('user__username', 'name')
    readonly_fields = ('created_at', 'updated_at')
