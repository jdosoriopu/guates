"""Regenerate the CSS from tokens.json, the single source of truth.

Writes tokens.css and the generated token block at the top of components/bundle.css.
Run from anywhere: python3 guates-design-system/scripts/build_tokens.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOCK_START = '/* Guates tokens, generated from tokens.json.'
BLOCK_END = '/* Components */'


def css_value(value):
    match = re.fullmatch(r'\{(.+)\}', value) if isinstance(value, str) else None
    return f'var(--{match.group(1)})' if match else value


def build(tokens, font_prefix):
    light, dark, static = [], [], []
    for family in ('color', 'shadow'):
        for token in tokens.get(family, {}).get('tokens', []):
            value = token['value']
            if isinstance(value, dict):
                light.append(f"  --{token['name']}: {css_value(value['light'])};")
                if 'dark' in value:
                    dark.append(f"  --{token['name']}: {css_value(value['dark'])};")
            else:
                light.append(f"  --{token['name']}: {css_value(value)};")
    for family in ('spacing', 'radius'):
        for token in tokens[family]['tokens']:
            static.append(f"  --{token['name']}: {token['value']};")
    for name, stack in tokens['type']['families'].items():
        static.append(f'  --font-{name}: {stack};')

    out = [f'{BLOCK_START} Edit tokens.json, not this block. */']
    for font in tokens['type']['fonts']:
        out.append(
            f"@font-face {{ font-family: '{font['family']}'; src: url('{font_prefix}{font['file']}') format('truetype'); "
            f"font-weight: {font['weight']}; font-style: {font['style']}; font-display: swap; }}"
        )
    out += [':root, [data-theme="light"] {', *light, '}']
    out += ['[data-theme="dark"] {', '  color-scheme: dark;', *dark, '}']
    out += [':root {', *static, '}']
    out.append('/* A themed container re-applies its ink, so text follows the theme it sits in. */')
    out.append('[data-theme] { color: var(--ink); }')
    for group in tokens['type']['groups']:
        for style in group['styles']:
            decl = [
                f"font-family: var(--font-{group['family']})",
                f"font-size: {style['fontSize']}",
                f"line-height: {style['lineHeight']}",
                f"font-weight: {style['fontWeight']}",
            ]
            if 'letterSpacing' in style:
                decl.append(f"letter-spacing: {style['letterSpacing']}")
            if style['name'] in ('slab-title', 'overline'):
                decl.append('text-transform: uppercase')
            out.append(f".{style['name']} {{ {'; '.join(decl)}; }}")
    return '\n'.join(out)


def main():
    tokens = json.loads((ROOT / 'tokens.json').read_text())
    (ROOT / 'tokens.css').write_text(build(tokens, '') + '\n')

    bundle_path = ROOT / 'components' / 'bundle.css'
    bundle = bundle_path.read_text()
    start, end = bundle.index(BLOCK_START), bundle.index(BLOCK_END)
    bundle_path.write_text(bundle[:start] + build(tokens, '../') + '\n\n' + bundle[end:])
    print('tokens.css and components/bundle.css regenerated from tokens.json')


if __name__ == '__main__':
    main()
