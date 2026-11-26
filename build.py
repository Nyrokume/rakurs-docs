#!/usr/bin/env python3
"""Генератор документации «Ясность». Markdown → статический HTML в site/."""
import html, json, os, re, shutil
from pathlib import Path
import markdown
from markdown.extensions.toc import slugify

TR = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
    ["a","b","v","g","d","e","e","zh","z","i","i","k","l","m","n","o","p","r","s","t","u","f","kh","ts","ch","sh","shch","","y","","e","iu","ia"]))

def slug_ru(value, separator):
    value = "".join(TR.get(c, c) for c in value.lower())
    return slugify(value, separator)
from pygments import highlight
from pygments.lexers import get_lexer_by_name, TextLexer
from pygments.formatters import HtmlFormatter

ROOT = Path(__file__).parent
SRC, OUT, ASSETS = ROOT / "content", ROOT / "site", ROOT / "assets"
REPO = "Nyrokume/yasnost-docs"

NAV = [
    ("Начало", ["index", "build"]),
    ("Продукт и рынок", ["pitch", "market", "teramind", "risks", "roadmap"]),
    ("Проектирование", ["architecture", "agent", "capture", "telemetry", "policy",
                         "data-model", "protocol", "console", "security"]),
    ("ТЗ и приёмка", ["tz", "performance", "acceptance", "milestones", "deployment"]),
    ("Решения", ["stack", "adr"]),
    ("Право и приватность", ["legal", "privacy"]),
    ("Справка", ["glossary", "questions", "sources"]),
]

GROUP_ICONS = {
    'Начало': '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></g></svg>',
    'Продукт и рынок': '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76l-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/></g></svg>',
    'Проектирование': '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m12.99 6.74l1.93 3.44M19.136 12a10 10 0 0 1-14.271 0M21 21l-2.16-3.84M3 21l8.02-14.26"/><circle cx="12" cy="5" r="2"/></g></svg>',
    'ТЗ и приёмка': '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14l2 2l4-4"/></g></svg>',
    'Решения': '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M15 6a9 9 0 0 0-9 9V3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/></g></svg>',
    'Право и приватность': '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 3v18m7-13l3 8a5 5 0 0 1-6 0zV7"/><path d="M3 7h1a17 17 0 0 0 8-2a17 17 0 0 0 8 2h1M5 8l3 8a5 5 0 0 1-6 0zV7m2 14h10"/></g></svg>',
    'Справка': '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v16m8.001-2A2 2 0 0 0 22 17V5a2 2 0 0 0-1.999-2L16 3.002A5 5 0 0 0 12 5a5 5 0 0 0-4-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 1.999 2H8a5 5 0 0 1 4 2a5 5 0 0 1 4-2z"/></svg>',
}

def parse(path):
    raw = path.read_text(encoding="utf-8")
    meta, body = {}, raw
    if raw.startswith("---"):
        _, fm, body = raw.split("---", 2)
        for line in fm.strip().splitlines():
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, body.strip() + "\n"

FENCE = re.compile(r"^```([\w+-]*)[ \t]*([^\n]*)\n(.*?)^```[ \t]*$", re.M | re.S)
LABELS = {"text": "", "bash": "bash", "sh": "bash", "powershell": "PowerShell", "yaml": "YAML", "json": "JSON",
          "sql": "SQL", "go": "Go", "rust": "Rust", "proto": "Protobuf", "toml": "TOML", "http": "HTTP"}

def stash_blocks(body, store):
    def repl(m):
        lang, title, code = m.group(1) or "text", m.group(2).strip(), m.group(3)
        key = f"XBLOCKX{len(store)}X"
        if lang == "mermaid":
            store[key] = (f'<figure class="diagram"><pre class="mermaid" data-src="{html.escape(code, quote=True)}">'
                          f'{html.escape(code)}</pre>' + (f'<figcaption>{html.escape(title)}</figcaption>' if title else "") + "</figure>")
        else:
            try:
                lexer = get_lexer_by_name(lang)
            except Exception:
                lexer = TextLexer()
            hl = highlight(code, lexer, HtmlFormatter(nowrap=True))
            label = title or LABELS.get(lang, lang)
            head = (f'<div class="code-h"><span>{html.escape(label)}</span>'
                    f'<button class="copy" type="button" aria-label="Скопировать код" data-tip="Скопировать код"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M15.5 8.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v6.6a2.2 2.2 0 0 0 2.2 2.2h1.8" fill="none" stroke="currentColor" stroke-width="1.7"/></svg><svg class="i-ok" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>')
            store[key] = f'<div class="code">{head}<pre><code class="language-{lang}">{hl}</code></pre></div>'
        return f"\n\n{key}\n\n"
    return FENCE.sub(repl, body)

def strip_tags(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()

def href_of(s):
    return "./" if s == "index" else f"{s}.html"

def build():
    pages, order = {}, [s for _, slugs in NAV for s in slugs]
    for slug in order:
        meta, body = parse(SRC / f"{slug}.md")
        pages[slug] = {"meta": meta, "body": body}
    group_of = {s: g for g, slugs in NAV for s in slugs}

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "md").mkdir(parents=True)
    shutil.copytree(ASSETS, OUT / "assets")
    tpl = (ROOT / "templates" / "page.html").read_text(encoding="utf-8")
    index = []

    for i, slug in enumerate(order):
        p = pages[slug]; meta = p["meta"]
        store = {}
        body = stash_blocks(p["body"], store)
        md = markdown.Markdown(extensions=["tables", "toc", "attr_list", "admonition", "md_in_html", "sane_lists", "def_list"],
                               extension_configs={"toc": {"slugify": slug_ru, "toc_depth": "2-3", "permalink": "#", "permalink_class": "hlink", "permalink_title": "Ссылка на раздел"}})
        out = md.convert(body)
        for k, v in store.items():
            out = out.replace(f"<p>{k}</p>", v).replace(k, v)
        out = re.sub(r"<table>(.*?)</table>", lambda m: ('<div class="table wide">' if m.group(1).split("</tr>")[0].count("<th") > 6 else '<div class="table">') + "<table>" + m.group(1) + "</table></div>", out, flags=re.S)
        out = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" target="_blank" rel="noopener"', out)

        toc_items = []
        for t in md.toc_tokens:
            toc_items.append(f'<li><a href="#{t["id"]}">{t["name"]}</a></li>')
            for c in t.get("children", []):
                toc_items.append(f'<li class="l3"><a href="#{c["id"]}">{c["name"]}</a></li>')
        toc = ('<nav class="toc" aria-label="На этой странице"><p class="toc-t">На этой странице</p><ul>'
               + "".join(toc_items) + "</ul></nav>") if toc_items else ""
        toc_m = ('<details class="toc-m"><summary>На этой странице</summary><ul>' + "".join(toc_items) + "</ul></details>") if toc_items else ""
        toc_items_clean = None

        side = []
        for g, slugs in NAV:
            side.append(f'<div class="nav-g"><p class="nav-gt">{GROUP_ICONS.get(g,"")}{g}</p><ul>')
            for s in slugs:
                cur = ' aria-current="page"' if s == slug else ""
                side.append(f'<li><a href="{href_of(s)}"{cur}>{pages[s]["meta"].get("nav", pages[s]["meta"]["title"])}</a></li>')
            side.append("</ul></div>")

        def first_sentence(t):
            mm = re.match(r"(.+?[.!?])(\s|$)", t)
            return mm.group(1) if mm else t
        def link(s, cls, label, desc=None):
            if not s:
                return "<span></span>"
            m = pages[s]["meta"]
            arrow = '<svg class="pg-a" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="' + ("M10 3 5 8l5 5" if cls == "prev" else "M6 3l5 5-5 5") + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            return (f'<a class="pg {cls}" href="{href_of(s)}" data-ab-ev="pagination_click"><span class="pg-l">{arrow if cls=="prev" else ""}{label}{arrow if cls=="next" else ""}</span>'
                    f'<span class="pg-t">{m.get("nav", m["title"])}</span><span class="pg-d">{desc or first_sentence(m.get("description",""))}</span></a>')
        g = group_of[slug]
        first = next(sl for gg, sls in NAV if gg == g for sl in sls[:1])
        crumbs = (f'<nav class="crumbs" aria-label="Путь"><a href="{href_of(first)}">{g}</a>'
                  f'<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                  f'<span aria-current="page">{meta.get("nav", meta["title"])}</span></nav>')
        hero = ""
        if slug == "index":
            hero = ((ROOT / "templates" / "hero.html").read_text(encoding="utf-8")
                    .replace("{{title}}", html.escape(meta["title"])).replace("{{description}}", html.escape(meta.get("description", ""))))
        prev_s = order[i-1] if i > 0 else None
        next_s = order[i+1] if i < len(order)-1 else None
        pager = f'<nav class="pager" aria-label="Соседние страницы">{link(prev_s,"prev","Назад")}{link(next_s or "index","next","Дальше", None if next_s else "Вернуться к началу документации")}</nav>'

        html_out = (tpl.replace("{{title}} · Ясность", html.escape(meta["title"])) if slug == "index" else tpl)
        html_out = (html_out.replace("{{title}}", html.escape(meta["title"]))
                    .replace("{{description}}", html.escape(meta.get("description", "")))
                    .replace("{{crumbs}}", crumbs)
                    .replace("{{toc_m}}", toc_m)
                    .replace("{{hero}}", hero)
                    .replace("{{bodyclass}}", "is-home" if slug == "index" else "")
                    .replace("{{sidebar}}", "".join(side))
                    .replace("{{toc}}", toc)
                    .replace("{{pager}}", pager)
                    .replace("{{slug}}", slug)
                    .replace("{{repo}}", REPO)
                    .replace("{{content}}", out))
        if slug == "index":
            html_out = re.sub(r"<!--top-->.*?<!--/top-->", "", html_out, flags=re.S)
        fname = "index.html" if slug == "index" else f"{slug}.html"
        (OUT / fname).write_text(html_out, encoding="utf-8")
        (OUT / "md" / f"{slug}.md").write_text(f"# {meta['title']}\n\n> {meta.get('description','')}\n\n" + p["body"], encoding="utf-8")

        url = href_of(slug)
        parts = re.split(r'(<h[23] id="[^"]+">.*?</h[23]>)', out)
        state = {"id": "", "head": meta["title"], "buf": []}
        def flush():
            text = strip_tags(" ".join(state["buf"]))
            if text:
                index.append({"p": meta.get("nav", meta["title"]), "h": strip_tags(state["head"]),
                              "u": url + (f"#{state['id']}" if state["id"] else ""), "t": text[:1500]})
        for part in parts:
            m = re.match(r'<h[23] id="([^"]+)">(.*?)</h[23]>', part)
            if m:
                flush(); state.update(id=m.group(1), head=re.sub(r'<a class="hlink".*?</a>', "", m.group(2)), buf=[])
            else:
                state["buf"].append(part)
        flush()

    (OUT / "assets" / "search.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    for sp in ["404.html", "error.html"]:
        (OUT / sp).write_text((ROOT / "templates" / sp).read_text(encoding="utf-8").replace("{{base}}", os.environ.get("YASNOST_BASE", "/")), encoding="utf-8")
    llms = ["# Ясность — документация до вёрстки", "",
            "> Питч, сравнение стеков и техническое задание системы открытого мониторинга рабочих ПК.", ""]
    for g, slugs in NAV:
        llms.append(f"## {g}")
        for s in slugs:
            m = pages[s]["meta"]
            llms.append(f"- [{m['title']}](md/{s}.md): {m.get('description','')}")
        llms.append("")
    (OUT / "llms.txt").write_text("\n".join(llms), encoding="utf-8")
    (OUT / ".nojekyll").write_text("")
    print(f"ok: {len(order)} pages, {len(index)} search records")

if __name__ == "__main__":
    build()
