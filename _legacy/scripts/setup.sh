#!/bin/bash
# auto-cm セットアップスクリプト

set -e

echo "=== auto-cm セットアップ ==="

# .env確認
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ .env作成 (APIキーを設定してください)"
else
  echo "✓ .env存在"
fi

# 依存関係インストール
echo "→ npm install..."
npm install --silent

# ビルド
echo "→ npm run build..."
npm run build --silent

# テスト
echo "→ テスト実行..."
npm test -- --run 2>/dev/null && echo "✓ テスト成功" || echo "⚠ テスト失敗"

# 環境変数チェック
echo ""
echo "=== 環境変数チェック ==="
[ -n "$GEMINI_API_KEY" ] && echo "✓ GEMINI_API_KEY" || echo "✗ GEMINI_API_KEY (必須)"
[ -n "$REPLICATE_API_TOKEN" ] && echo "✓ REPLICATE_API_TOKEN" || echo "✗ REPLICATE_API_TOKEN (必須)"
[ -n "$OPENAI_API_KEY" ] && echo "✓ OPENAI_API_KEY" || echo "- OPENAI_API_KEY (オプション)"

echo ""
echo "=== 完了 ==="
echo "npm run dev で起動"
