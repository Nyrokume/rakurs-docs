# Ясность — документация

Краткое структурированное описание ПО «Ясность» — системы открытого мониторинга рабочих ПК — для заказчика.

Сайт: https://nyrokume.github.io/yasnost-docs/

## Как устроено

- `content/*.md` — страницы (frontmatter: `title`, `nav`, `description`).
- `build.py` — генератор: Markdown → `site/`, поиск (`assets/search.json`).
- `templates/` — шаблон страницы, 404 и страница ошибки.
- `assets/` — стили, скрипты (тема, поиск, A/B-модуль, Mermaid).
- Сборка и публикация на GitHub Pages — GitHub Actions (`.github/workflows/pages.yml`) при пуше в `main`.
- Тексты сверены по `COPY-FRIRZ.md` (голос, глоссарий, аудит подписей).

## Локально

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python build.py
cd site && python3 -m http.server 4190 --bind 127.0.0.1
```

Для хостинга не в корне домена задайте путь для 404 и страницы ошибки: `YASNOST_BASE=/yasnost-docs/ .venv/bin/python build.py`.

Правки текста — через пулреквест в `content/`.
