#!/bin/sh

set -eu


cd "$(git rev-parse --show-toplevel)"
# SVG palette declarations are generated from the shared dark theme.
# Resolve CSS variables for GraphicsMagick, which does not support them.
resolved_logo=$(mktemp --suffix=.svg)
trap 'rm -f "$resolved_logo"' EXIT HUP INT TERM
python3 - "$resolved_logo" <<'PY'
from pathlib import Path
import re
import sys

styles = Path("styles.css").read_text()
dark = re.search(r':root\[data-theme="dark"\]\s*\{([^}]+)', styles).group(1)
logo_path = Path("assets/logo.svg")
logo = logo_path.read_text()
tokens = dict(re.findall(r"(--color-[\w-]+):\s*(#[\da-fA-F]+);", dark))
used = list(dict.fromkeys(re.findall(r"var\((--color-[\w-]+)\)", logo)))
palette = "\n".join(f"            {name}: {tokens[name]};" for name in used)
logo = re.sub(r"<style>.*?</style>", "<style>\n        :root {\n" + palette + "\n        }\n    </style>", logo, flags=re.S)
logo_path.write_text(logo)
resolved = re.sub(r"var\((--color-[\w-]+)\)", lambda match: tokens[match[1]], logo)
Path(sys.argv[1]).write_text(resolved)
PY

gm convert -background none "$resolved_logo" -depth 8 assets/original.png
gm convert assets/original.png -resize 128x128 assets/icon.png
gm convert assets/original.png -resize 72x72 assets/apple-72x72.png
gm convert assets/original.png -resize 144x144 assets/apple-144x144.png
gm convert assets/original.png -resize 192x192 assets/pwa-192x192.png
gm convert assets/original.png -resize 512x512 assets/pwa-512x512.png
