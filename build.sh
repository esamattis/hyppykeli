#!/bin/bash

set -eu

esbuild vendor/preact.js --outdir=vendor/build --format=esm --minify --bundle
esbuild vendor/{htm.js,preact-hooks.js,preact-signals.js,chart.js} --outdir=vendor/build --format=esm --minify --bundle --external:preact
