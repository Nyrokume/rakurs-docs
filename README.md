# Ракурс — документация до вёрстки

Питч, анализ аналогов, сравнение Go и Rust и техническое задание системы открытого мониторинга рабочих ПК.

Репозиторий приватный, публичного сайта нет. Смотреть локально (см. ниже) или скачать собранный сайт артефактом `site` из вкладки Actions.

## Как устроено

- `content/*.md` — страницы (frontmatter: `title`, `nav`, `description`).
- `build.py` — генератор: Markdown → `site/`, оглавление, поиск (`assets/search.json`), `llms.txt`, исходники страниц в `md/`.
- `templates/` — шаблон страницы, 404 и страница ошибки.
- `assets/` — стили, скрипты (тема, поиск, A/B-модуль, Mermaid).
- Сборка — GitHub Actions (`.github/workflows/pages.yml`) при пуше в `main`, результат лежит артефактом `site`.
- Тексты сверены по `COPY-FRIRZ.md` (голос, глоссарий, аудит подписей).

## Локально

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python build.py
cd site && python3 -m http.server 4190 --bind 127.0.0.1
```

Для хостинга не в корне домена задайте путь для 404 и страницы ошибки: `RAKURS_BASE=/rakurs-docs/ .venv/bin/python build.py`.

Правки текста — через пулреквест в `content/`.
