from django.db import migrations

ACCESS_GROUP_NAME = "Utilisateurs actifs"


def create_access_group(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.get_or_create(name=ACCESS_GROUP_NAME)


def remove_access_group(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name=ACCESS_GROUP_NAME).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("abaque", "0003_auto_20260706_1655"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(create_access_group, remove_access_group),
    ]
