#!/usr/bin/env bash

set -euo pipefail

tree -I 'node_modules|.next|out|dist' > tree.txt

total_lines=0
total_chars=0
total_bytes=0

while IFS= read -r -d '' file; do
  lines=$(wc -l < "$file")
  chars=$(wc -m < "$file")
  bytes=$(wc -c < "$file")
  total_lines=$((total_lines + lines))
  total_chars=$((total_chars + chars))
  total_bytes=$((total_bytes + bytes))
done < <(find src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0)

printf '\nTypeScript source statistics:\n' >> tree.txt
printf 'Total lines: %s\n' "$total_lines" >> tree.txt
printf 'Total characters: %s\n' "$total_chars" >> tree.txt
printf 'Total size (bytes): %s\n' "$total_bytes" >> tree.txt
