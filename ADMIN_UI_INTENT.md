# Admin UI intent

管理画面、長時間編集する作業場。装飾より情報密度と位置の安定を優先する。

サイドバー、header、本文の寸法依存を分離しない。同じlayout treeで領域を確保し、重なりをoffset計算で避けない。狭幅だけnavigation表現を変え、機能階層は変えない。

page固有の箱と余白を増やさない。共通layoutが外周を決め、pageは内容の区切りだけ持つ。
