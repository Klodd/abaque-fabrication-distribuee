Django + HTMX demo

Quick start

1. Create a virtualenv and activate it.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Run migrations and start server

```bash
python manage.py migrate
python manage.py runserver
```

Open http://127.0.0.1:8000/ to see the HTMX single-page with many single-select choices.
