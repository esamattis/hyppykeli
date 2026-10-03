#!/bin/bash

set -eu

esbuild vendor/preact.js --outdir=vendor/build --format=esm --minify --bundle
esbuild vendor/{htm.js,preact-hooks.js,preact-signals.js,chart.js} --outdir=vendor/build --format=esm --minify --bundle --external:preact
esbuild vendor/leaflet.js --outdir=vendor/build --format=esm --minify --bundle
cp node_modules/leaflet/dist/leaflet.css vendor/build/leaflet.css
cp -R node_modules/leaflet/dist/images vendor/build/
