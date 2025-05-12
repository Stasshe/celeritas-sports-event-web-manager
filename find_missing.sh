#!/bin/bash

# 入力ファイル
translation_file="translation.txt"
json_file="src/i18n/locales/fr.json"
output_file="missing_translations.txt"

# 一時ファイル作成
tmp_keys="tmp_json_keys.txt"

# JSONファイルからすべてのキーを抽出（ネストされたキーも含む）
jq -r 'paths(scalars) | join(".")' "$json_file" > "$tmp_keys"

# missing_translations.txtを空にする
> "$output_file"

# translation.txtの各行をチェック
while IFS= read -r line; do
    # シングルクォートを除去
    clean_line=$(echo "$line" | tr -d "'")
    
    # キーがJSONファイルに存在するかチェック
    if ! grep -q "^${clean_line}$" "$tmp_keys"; then
        echo "$clean_line" >> "$output_file"
    fi
done < "$translation_file"

# 一時ファイルを削除
rm "$tmp_keys"

# 結果を表示
if [ -s "$output_file" ]; then
    echo "以下の翻訳キーがja.jsonに存在しません:"
    cat "$output_file"
else
    echo "すべての翻訳キーがja.jsonに存在します。"
fi
