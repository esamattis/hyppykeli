#!/bin/sh

set -eu


cd "$(git rev-parse --show-toplevel)"

orig=assets/original.png

gm convert "$orig" -resize 128x128 assets/icon.png
gm convert "$orig" -resize 72x72 assets/apple-72x72.png
gm convert "$orig" -resize 144x144 assets/apple-144x144.png
gm convert "$orig" -resize 192x192 assets/pwa-192x192.png
gm convert "$orig" -resize 512x512 assets/pwa-512x512.png
