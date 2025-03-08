const fs = require('fs');
const path = require('path');

// 1x1ピクセルの透明なPNGのバイナリデータ（Base64形式）
const transparentPixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Base64をバイナリに変換
const transparentPixelBuffer = Buffer.from(transparentPixelBase64, 'base64');

// ファイルを作成
fs.writeFileSync(path.join(__dirname, 'logo192.png'), transparentPixelBuffer);
fs.writeFileSync(path.join(__dirname, 'logo512.png'), transparentPixelBuffer);
fs.writeFileSync(path.join(__dirname, 'favicon.ico'), transparentPixelBuffer);

console.log('ダミーのロゴファイルが作成されました');
