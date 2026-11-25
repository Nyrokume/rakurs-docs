# Ракурс — документация до вёрстки

Питч, анализ аналогов, сравнение Go и Rust и техническое задание агента прозрачного мониторинга рабочих ПК.

Сайт: https://nyrokume.github.io/rakurs-docs/

## Как устроено

- `content/*.md` — страницы (frontmatter: `title`, `nav`, `description`).
- `build.py` — генератор: Markdown → `site/`, оглавление, поиск (`assets/search.json`), `llms.txt`, исходники страниц в `md/`.
- `templates/` — шаблон страницы, 404 и страница ошибки.
- `assets/` — стили, скрипты (тема, поиск, A/B-модуль, Mermaid).
- Сборка и публикация — GitHub Actions (`.github/workflows/pages.yml`) при пуше в `main`.

## Локально

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python build.py
cd site && python3 -m http.server 4190
```

Правки текста — через пулреквест в `content/`.
