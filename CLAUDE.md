# CLAUDE.md

Fabrication cost calculator for a fablab ("Abaque de la Fabrication Distribuée"). Users pick a machine, material, consumable, etc., enter task times/quantities, and get a live cost breakdown. Per-user option overrides and saved projects are stored server-side.

Stack: Django 5.2 (plain function views, no DRF — don't introduce it) + HTMX 2 + vanilla JS + Tailwind CSS v4. App code lives in `abaque/`, Django project config in `project/`.

**The UI is entirely in French.** Keep all user-facing strings (templates, JS alerts, form labels) in French; code and comments stay in English.

## Commands

```bash
.venv/bin/python manage.py test        # 31 tests, must stay green
.venv/bin/python manage.py runserver   # port 8000 is often taken by Docker on this machine; pass another port
npm run build:css                      # rebuild static/css/output.css (committed) from assets/tailwind.css —
                                       # required after adding/removing Tailwind classes in templates OR JS strings

```

- There is no JS build step: the three files in `abaque/static/js/` are served as-is.
- `db.sqlite3` is real local data (gitignored). Never delete, reset, or bulk-edit it without asking.
- `create_users.py` is a gitignored local helper with dev credentials.
- `.claude/launch.json` defines a `django` preview server on port 8642.

## Access model

Anyone can register at `/register/` (`RegistrationForm` in `abaque/forms.py`), but every app view is wrapped in `@access_required` (`abaque/views.py`): login **plus** membership in the Django group `"Utilisateurs actifs"` (created by migration `0004_access_group`). Non-members get the `auth/pending_approval.html` page with status 403. Admins grant access via the Django admin. Tests must add users to this group explicitly before exercising app views.

## Data model — read this before touching options or state

- **`DEFAULT_GROUPS`** (`abaque/views.py`): the 9 option groups with default pricing. Group ids 1–9 are **stable identifiers**, duplicated in `GROUP_IDS` in `app.js` — never renumber them, and keep the two in sync.
- **Option and group *names* are also identifiers.** `UserConfiguration` overrides and `UserSavedJob` states reference options by name. Renaming anything in `DEFAULT_GROUPS` silently breaks existing users' saved data — don't do it without an explicit decision and a data migration.
- **`UserConfiguration`**: per-user, per-group JSON list of options. Absent → server defaults apply. The modal saves **one group at a time** (`POST /api/configurations/` with `{"<gid>": [options]}`); the endpoint merges per group, it does not replace everything.
- **`UserSavedJob.state_json`**: dict `{choices, rows, numberOfCopies}` stored as a real JSON object. Legacy rows may contain a double-encoded JSON *string*; `apply_job` normalizes them and the client accepts both — preserve that compatibility (covered by tests).
- API validation limits (keep enforcing): 256 KB body, ≤200 options per group, every option needs a non-empty string `name`. Error responses are generic 400s — never return `str(e)`.

## Frontend conventions

Script load order in `index.html` matters (`app.js` → `modal.js` → `table.js`); they share functions via global scope.

- `app.js` — cost math (`updateSummary`), `GROUP_IDS`, `escapeHtml`, state build/apply, HTMX response handling.
- `modal.js` — options editor logic only; its markup lives in `index.html` (`#options-modal` + `#modal-row-template`).
- `table.js` — the task-rows table.

Hard rules, each learned from a real bug:

1. **Never key JS logic off translatable display strings.** A `placeholder="Nom"` vs `'Name'` selector mismatch once broke the whole modal. Use the stable hooks: `data-field="name"` / `data-field="remove"`, `data-key="<property>"`, `.modal-option-row`, `.choice-form[data-group-id="N"]`. Look up groups by id, never by French name.
2. **Units**: machine prices (`prix_normal`/`prix_adherent`) and `taux_horaire` are €/**hour**; the time inputs (`col-tps`, `col-sup`) are **minutes**. Conversions happen in `updateSummary()` — check them when touching any cost formula.
3. **Escape anything interpolated into `innerHTML`** with `escapeHtml()` — option names and property values are user-editable.
4. Default property keys of a group (`data-default-keys` on the form) are **locked**: the modal must not allow removing or renaming them.
5. `select` elements: the first option may be a real option (server-rendered) or a `-- choose --` placeholder with empty value (after JS repopulation). When iterating options, skip on `value === ''`, never by index.

## Settings

`SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` come from environment variables (dev defaults in `project/settings.py`; `SECRET_KEY` is mandatory when `DEBUG=false`). Production flags (secure cookies, `SECURE_SSL_REDIRECT`, proxy SSL header) switch on automatically when `DEBUG=false`. Don't hardcode secrets.

Deployment (VPS, gunicorn on 127.0.0.1:8642 behind nginx, WhiteNoise for statics, SQLite): see `DEPLOY.md`. The Tailwind *source* lives in `assets/tailwind.css`, outside `static/`, because collectstatic's manifest storage would choke on its `@import "tailwindcss"` line — don't move it back.
