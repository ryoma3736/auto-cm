import { AdGenerationPipeline } from './dist/pipeline/index.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// 画像をbase64に変換
const imagePath = '/Users/satoryouma/genie_0.1/auto-cm/yakiniku_ootsuka.jpg';
const imageBuffer = fs.readFileSync(imagePath);
const imageBase64 = imageBuffer.toString('base64');

const customPrompt = `
焼肉店「おおつか」の8秒CM。シズル感と店名を強調。

【シーン構成】
1. (0-2秒) 店の外観 - 夕暮れ時、「焼肉 おおつか」の看板がライトアップされている
2. (2-5秒) 炭火の上で上質なロース肉がジュワッと焼ける瞬間、脂が溶けて光る
3. (5-7秒) 若いカップルがテーブルで肉を頬張り、幸せそうな笑顔
4. (7-8秒) 「焼肉 おおつか」ロゴ表示

【演出】
- 暖色系の照明（オレンジ・琥珀色）
- 煙と湯気を強調
- 肉の質感をスローモーションで
- 高級感と親しみやすさの両立

【ナレーション】
「おおつかのロース、とろける...」
「焼肉 おおつか」
`;

async function main() {
  console.log('🥩 CM生成開始: 焼肉おおつか');
  console.log('尺: 8秒');
  console.log('スタイル: シズル重視');
  console.log('');

  const pipeline = new AdGenerationPipeline({
    useMock: false,
    verbose: true,
    duration: 8,
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

      fs.writeFileSync('/tmp/yakiniku_cm_result.txt', result.videoUrl);
      console.log('URLを /tmp/yakiniku_cm_result.txt に保存しました');
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
