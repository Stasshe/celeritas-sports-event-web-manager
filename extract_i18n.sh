#!/bin/bash

# 出力ファイル
output_file="translation.txt"

# translation.txtを空にする（既存の内容を削除）
> "$output_file"

# src/ディレクトリ内のすべてのファイルをループ
find src/ -type f | while read file; do
  # 各ファイルの中身からt()の中身を抽出
  # 抽出した文字列が'を含み、かつ4文字以上の場合のみ、一時ファイルに追加
  grep -oP 't\(\K[^\)]+' "$file" | grep "'" | awk 'length($0) >= 4' >> temp.txt
done

# 重複を削除して、結果をtranslation.txtに保存
sort temp.txt | uniq > "$output_file"

# 一時ファイルを削除
rm temp.txt

echo "抽出が完了しました。結果は $output_file に保存されました。"
