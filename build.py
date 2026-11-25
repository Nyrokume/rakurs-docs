#!/usr/bin/env python3
"""Генератор документации «Ракурс». Markdown → статический HTML в site/."""
import html, json, re, shutil
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
REPO = "Nyrokume/rakurs-docs"

NAV = [
    ("Начало", ["index", "pitch", "market", "risks", "roadmap"]),
    ("Технологии", ["stack", "capture", "telemetry", "adr"]),
    ("Техническое задание", ["tz", "architecture", "agent", "policy", "data-model",
                              "protocol", "console", "security", "performance",
                              "deployment", "acceptance", "milestones"]),
    ("Право и этика", ["legal", "privacy"]),
    ("Справка", ["glossary", "questions", "sources"]),
]

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
                    f'<button class="copy" type="button" aria-label="Скопировать код">Копировать</button></div>')
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
                               extension_configs={"toc": {"slugify": slug_ru, "toc_depth": "2-3"}})
        out = md.convert(body)
        for k, v in store.items():
            out = out.replace(f"<p>{k}</p>", v).replace(k, v)
        out = out.replace("<table>", '<div class="table"><table>').replace("</table>", "</table></div>")
        out = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" target="_blank" rel="noopener"', out)

        toc_items = []
        for t in md.toc_tokens:
            toc_items.append(f'<li><a href="#{t["id"]}">{t["name"]}</a></li>')
            for c in t.get("children", []):
                toc_items.append(f'<li class="l3"><a href="#{c["id"]}">{c["name"]}</a></li>')
        toc = ('<nav class="toc" aria-label="На этой странице"><p class="toc-t">На этой странице</p><ul>'
               + "".join(toc_items) + "</ul></nav>") if toc_items else ""

        side = []
        for g, slugs in NAV:
            side.append(f'<div class="nav-g"><p class="nav-gt">{g}</p><ul>')
            for s in slugs:
                cur = ' aria-current="page"' if s == slug else ""
                side.append(f'<li><a href="{href_of(s)}"{cur}>{pages[s]["meta"].get("nav", pages[s]["meta"]["title"])}</a></li>')
            side.append("</ul></div>")

        def link(s, cls, label):
            if not s:
                return "<span></span>"
            m = pages[s]["meta"]
            return (f'<a class="pg {cls}" href="{href_of(s)}" data-ab-ev="pagination_click"><span class="pg-l">{label}</span>'
                    f'<span class="pg-t">{m.get("nav", m["title"])}</span><span class="pg-d">{m.get("description","")}</span></a>')
        prev_s = order[i-1] if i > 0 else None
        next_s = order[i+1] if i < len(order)-1 else None
        pager = f'<nav class="pager" aria-label="Соседние страницы">{link(prev_s,"prev","Назад")}{link(next_s,"next","Дальше")}</nav>'

        html_out = (tpl.replace("{{title}}", html.escape(meta["title"]))
                    .replace("{{description}}", html.escape(meta.get("description", "")))
                    .replace("{{eyebrow}}", group_of[slug])
                    .replace("{{sidebar}}", "".join(side))
                    .replace("{{toc}}", toc)
                    .replace("{{pager}}", pager)
                    .replace("{{slug}}", slug)
                    .replace("{{repo}}", REPO)
                    .replace("{{content}}", out))
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
                flush(); state.update(id=m.group(1), head=m.group(2), buf=[])
            else:
                state["buf"].append(part)
        flush()

    (OUT / "assets" / "search.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    for sp in ["404.html", "error.html"]:
        (OUT / sp).write_text((ROOT / "templates" / sp).read_text(encoding="utf-8"), encoding="utf-8")
    llms = ["# Ракурс — документация до вёрстки", "",
            "> Питч, сравнение стеков и техническое задание агента прозрачного мониторинга рабочих ПК.", ""]
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
