#!/bin/bash

# 出力ファイル
output_file="translation.txt"

# translation.txtを空にする（既存の内容を削除）
> "$output_file"

# src/ディレクトリ内のすべてのファイルをループ
find src/ -type f | while read file; do
  # 各ファイルの中身からt()の中身を抽出
  # 抽出した文字列が'を含み、かつ4文字以上の場合のみ、translation.txtに追加
  grep -oP 't\(\K[^\)]+' "$file" | grep "'" | awk 'length($0) >= 4' >> "$output_file"
done

echo "抽出が完了しました。結果は $output_file に保存されました。"
