#!/usr/bin/env

if command -v gsed >/dev/null 2>&1; then
  for filename in "$(pwd)/docs/*.md"; do
    gsed -i 's/v0.0.0/master/g' $filename
  done
else
  for filename in "$(pwd)/docs/*.md"; do
    sed -i 's/v0.0.0/master/g' $filename
  done
fi
