import { AdGenerationPipeline } from './dist/pipeline/index.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const imageBase64 = fs.readFileSync('/tmp/shampoo_base64.txt', 'utf-8').trim();

const customPrompt = `
新垣結衣風の清楚で透明感のある日本人女性（30代前半）が出演する奇抜なシャンプーCM。

【シーン構成】
1. 冒頭: 女性が真っ白な空間で髪を振り乱す（スローモーション）
2. 中盤: シャンプーボトルが宙に浮き、女性の周りを回転
3. クライマックス: 髪から光の粒子が飛び散り、画面全体が輝く
4. ラスト: 女性が振り返り微笑む「SILK THE RICH」ロゴ

【演出】
- 全体的に幻想的・非現実的な映像
- 白とゴールドの配色
- 髪の毛の動きを強調
- 高級感と清潔感
`;

async function main() {
  console.log('🎬 CM生成開始: SILK THE RICH シャンプー');
  console.log('モデル: 新垣結衣風');
  console.log('スタイル: 奇抜・幻想的');
  console.log('');

  const pipeline = new AdGenerationPipeline({
    useMock: false,
    verbose: true,
    duration: 12,
    language: 'ja',
    customPrompt: customPrompt
  });

  try {
    const result = await pipeline.generate({
      imageBase64: imageBase64
    });

    console.log('');
    console.log('========================================');
    console.log('結果:', result.success ? '✅ 成功' : '❌ 失敗');

    if (result.success) {
      console.log('動画URL:', result.videoUrl);
      console.log('処理時間:', Math.round(result.metadata.processingTime / 1000), '秒');

      // URLをファイルに保存
      fs.writeFileSync('/tmp/cm_result.txt', result.videoUrl);
      console.log('URLを /tmp/cm_result.txt に保存しました');
    } else {
      console.log('エラー:', result.error);
    }

    console.log('========================================');

  } catch (err) {
    console.error('❌ 致命的エラー:', err.message);
    process.exit(1);
  }
}

main();
