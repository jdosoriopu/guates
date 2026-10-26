"""Import only the carousel animal animations from a self-contained canvas export.
Usage: python3 scripts/import_animations.py /path/to/export.html
No bundled JavaScript is executed and no fonts or editor runtime are copied.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('export', type=Path)
args = parser.parse_args()
app = Path(__file__).resolve().parents[1]
source = app.parent / 'canvas/project/Main.dc.html'
packed = args.export.read_text()
match = re.search(r'<script type="__bundler/template">(.*?)</script>', packed, re.S)
if not match:
    raise ValueError('Expected a self-contained canvas export with a template.')
template = json.loads(match[1])
original = source.read_text()

# Limit the markup to the animated animal branches, excluding surrounding UI.
start = template.index('<sc-if value="{{car.isColibri}}"')
fallback = template.index('<sc-if value="{{car.isOther}}"', start)
end = template.index('</sc-if>', fallback) + len('</sc-if>')
markup = template[start:end]
markup = markup.replace('sc-camel-view-box=', 'viewBox=').replace('sc-camel-clip-path-units=', 'clipPathUnits=')
if 'sc-camel-' in markup:
    raise ValueError('Unknown export attribute needs explicit conversion.')
carousel = original.index('aria-roledescription="carrusel"')
old_start = original.find('<sc-if value="{{car.isColibri}}"', carousel)
if old_start < 0:
    old_start = original.index('<div class="gq-in-{{car.parity}}"', carousel)
progress = original.index('<div aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 0; height: 6px;', old_start)
updated = original[:old_start] + markup + '\n' + original[progress:]

# Import only the new animal keyframes, including their reduced-motion rules.
styles = re.findall(r'<style[^>]*>(.*?)</style>', template, re.S)
latest = next(style for style in styles if '.gq .gqc-w{' in style)
css_start = latest.index('.gq .gqc-w{')
css_end = latest.index('@media (prefers-reduced-motion: reduce){.gq *{transition:none', css_start)
css = latest[css_start:css_end]
style_end = updated.index('</style>')
existing = updated.find('.gq .gqc-w{', 0, style_end)
marker = updated.index('@media (prefers-reduced-motion: reduce){.gq *{transition:none', 0, style_end)
updated = updated[:existing if existing >= 0 else marker] + css + updated[marker:]

flags = re.search(r'^\s*isColibri: cp\.bagArt.*$', template, re.M)[0].strip()
car = updated.index('    const car = {') + len('    const car = {')
flag_end = updated.find('\n', car + 1)
if updated[car:flag_end].strip().startswith('isColibri:'):
    updated = updated[:car] + '\n      ' + flags + updated[flag_end:]
else:
    updated = updated[:car] + '\n      ' + flags + updated[car:]

source.write_text(updated)
metadata = {
    'export': args.export.name,
    'sha256': hashlib.sha256(packed.encode()).hexdigest(),
    'scope': 'Five carousel animals, matching keyframes, reduced-motion styles and selection flags.',
    'markupSha256': hashlib.sha256(markup.encode()).hexdigest(),
    'cssSha256': hashlib.sha256(css.encode()).hexdigest(),
    'excluded': ['navigation changes', 'footer changes', 'bundled fonts', 'editor runtime', 'unchanged Canvas scenes'],
}
(app / 'animation-import.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
print('Imported carousel animations for colibrí, chigüiro, nutria, perezoso and garza.')
