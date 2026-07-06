import json

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .models import UserConfiguration, UserSavedJob


class AuthRequiredTests(TestCase):
    """Unauthenticated requests should be redirected to the login page."""

    def test_index_redirects_to_login(self):
        response = self.client.get(reverse("choices:index"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login/", response.url)

    def test_configurations_redirects_to_login(self):
        response = self.client.get(reverse("choices:api_configurations"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login/", response.url)

    def test_saved_jobs_redirects_to_login(self):
        response = self.client.get(reverse("choices:api_get_saved_jobs"))
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login/", response.url)

    def test_apply_job_redirects_to_login(self):
        response = self.client.post(reverse("choices:apply_job", args=[1]))
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login/", response.url)

    def test_delete_job_redirects_to_login(self):
        response = self.client.delete(reverse("choices:api_delete_job", args=[1]))
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login/", response.url)


class IndexViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw12345")
        self.client.force_login(self.user)

    def test_index_returns_200_for_logged_in_user(self):
        response = self.client.get(reverse("choices:index"))
        self.assertEqual(response.status_code, 200)


class ConfigurationsApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="bob", password="pw12345")
        self.client.force_login(self.user)

    def test_post_then_get_round_trip(self):
        payload = {"1": [{"name": "Oui"}, {"name": "Non"}]}
        response = self.client.post(
            reverse("choices:api_configurations"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])

        get_response = self.client.get(reverse("choices:api_configurations"))
        self.assertEqual(get_response.status_code, 200)
        data = get_response.json()
        self.assertEqual(data["1"], payload["1"])

        config = UserConfiguration.objects.get(user=self.user, group_id=1)
        self.assertEqual(config.options_json, payload["1"])

    def test_non_dict_body_rejected(self):
        response = self.client.post(
            reverse("choices:api_configurations"),
            data=json.dumps([1, 2, 3]),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_options_not_a_list_rejected(self):
        payload = {"1": {"name": "Oui"}}
        response = self.client.post(
            reverse("choices:api_configurations"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_option_missing_name_rejected(self):
        payload = {"1": [{"foo": "bar"}]}
        response = self.client.post(
            reverse("choices:api_configurations"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_json_rejected(self):
        response = self.client.post(
            reverse("choices:api_configurations"),
            data="not json",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)


class SavedJobsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="carol", password="pw12345")
        self.other_user = User.objects.create_user(username="dave", password="pw12345")
        self.client.force_login(self.user)

    def test_save_job_form_encoded_stores_dict(self):
        state = {"choices": {"1": "Oui"}, "rows": [], "numberOfCopies": "1"}
        response = self.client.post(
            reverse("choices:api_get_saved_jobs"),
            data={"name": "My Job", "state": json.dumps(state)},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "My Job")

        job = UserSavedJob.objects.get(id=data["id"])
        self.assertIsInstance(job.state_json, dict)
        self.assertEqual(job.state_json, state)

    def test_apply_job_returns_state_as_object(self):
        state = {"choices": {"2": "Non"}, "rows": [1, 2], "numberOfCopies": "3"}
        job = UserSavedJob.objects.create(user=self.user, name="Job A", state_json=state)

        response = self.client.post(reverse("choices:apply_job", args=[job.id]))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data["state"], dict)
        self.assertEqual(data["state"], state)

    def test_apply_job_on_legacy_string_row_returns_object(self):
        state = {"choices": {"3": "Yes"}, "rows": [], "numberOfCopies": "2"}
        job = UserSavedJob.objects.create(user=self.user, name="Legacy Job", state_json=json.dumps(state))
        # Confirm the row really was stored as a raw string (legacy bug reproduction).
        job.refresh_from_db()
        self.assertIsInstance(job.state_json, str)

        response = self.client.post(reverse("choices:apply_job", args=[job.id]))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data["state"], dict)
        self.assertEqual(data["state"], state)

    def test_delete_job_works(self):
        job = UserSavedJob.objects.create(user=self.user, name="To Delete", state_json={})
        response = self.client.delete(reverse("choices:api_delete_job", args=[job.id]))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(UserSavedJob.objects.filter(id=job.id).exists())

    def test_other_users_job_returns_404_on_apply(self):
        job = UserSavedJob.objects.create(user=self.other_user, name="Not Yours", state_json={})
        response = self.client.post(reverse("choices:apply_job", args=[job.id]))
        self.assertEqual(response.status_code, 404)

    def test_other_users_job_returns_404_on_delete(self):
        job = UserSavedJob.objects.create(user=self.other_user, name="Not Yours", state_json={})
        response = self.client.delete(reverse("choices:api_delete_job", args=[job.id]))
        self.assertEqual(response.status_code, 404)
