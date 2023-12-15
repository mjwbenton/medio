#!/bin/sh

set -e

# Download ffmpeg
mkdir -p ./dist
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz | tar xJ -C ./dist --strip-components=1