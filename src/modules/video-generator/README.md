# Video Generator Module

Sora2 API (OpenAI) を使用した動画生成モジュール

## 概要

このモジュールは、静止画（first frame）とプロンプトから動画を生成する機能を提供します。実際のSora2 APIが利用できない場合は、自動的にモック実装にフォールバックします。

## 主な機能

- **非同期動画生成**: APIリクエスト → ポーリング → 完了待機
- **ステータス確認**: 生成進捗の確認（0-100%）
- **自動リトライ**: エラー発生時の適切なハンドリング
- **モック実装**: API未公開時の開発用モック（15秒で完了シミュレーション）
- **Type-Safe**: TypeScript strict mode完全対応

## インストール

```bash
npm install
```

## 環境変数

```bash
# Sora2/OpenAI APIキー（どちらか必須、モード使用時は不要）
SORA2_API_KEY=your_sora2_api_key
# または
OPENAI_API_KEY=your_openai_api_key
```

## 基本的な使い方

### 1. インスタンス作成

```typescript
import { VideoGenerator, createVideoGenerator } from './modules/video-generator';

// 環境変数から自動取得
const generator = new VideoGenerator();

// または明示的に指定
const generator = createVideoGenerator({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.openai.com/v1',
  useMock: false, // 本番API使用
});

// モック使用（開発用）
const mockGenerator = new VideoGenerator({ useMock: true });
```

### 2. 動画生成（generateAndWait）

最もシンプルな方法：生成リクエスト → 完了まで自動待機

```typescript
import type { VideoRequest, VideoResult } from './modules/video-generator';

const request: VideoRequest = {
  firstFrameImage: 'base64-encoded-image-data', // 720x1280推奨
  prompt: 'A beautiful sunset over the ocean with gentle waves',
  duration: 12, // 秒数（デフォルト: 12）
  aspectRatio: '9:16', // '9:16' | '16:9' | '1:1'
};

try {
  const video: VideoResult = await generator.generateAndWait(request);

  console.log('Video generated successfully!');
  console.log('Video URL:', video.videoUrl);
  console.log('Duration:', video.duration, 'seconds');
  console.log('Resolution:', video.resolution);
  console.log('Created at:', video.createdAt);
} catch (error) {
  console.error('Generation failed:', error.message);
}
```

### 3. 段階的な動画生成（generate → checkStatus → getVideo）

より細かい制御が必要な場合：

```typescript
// Step 1: 生成開始
const generation = await generator.generate(request);
console.log('Generation started:', generation.id);
console.log('Estimated time:', generation.estimatedTimeSeconds, 'seconds');

// Step 2: ステータス確認（ポーリング）
let status = await generator.checkStatus(generation.id);

while (status.status !== 'completed' && status.status !== 'failed') {
  console.log(`Status: ${status.status}, Progress: ${status.progress}%`);

  // 5秒待機
  await new Promise(resolve => setTimeout(resolve, 5000));

  status = await generator.checkStatus(generation.id);
}

// Step 3: 動画取得
if (status.status === 'completed') {
  const video = await generator.getVideo(generation.id);
  console.log('Video URL:', video.videoUrl);
} else {
  console.error('Generation failed:', status.error);
}
```

## API リファレンス

### VideoRequest

```typescript
interface VideoRequest {
  firstFrameImage: string;     // Base64画像（data URI可）
  prompt: string;               // 動画生成プロンプト
  duration?: number;            // 秒数（デフォルト: 12）
  aspectRatio?: '9:16' | '16:9' | '1:1'; // デフォルト: '9:16'
}
```

### VideoGeneration

```typescript
interface VideoGeneration {
  id: string;                   // 生成ジョブID
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedTimeSeconds: number; // 推定完了時間
}
```

### GenerationStatus

```typescript
interface GenerationStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;            // 0-100
  error?: string;               // エラーメッセージ（失敗時）
}
```

### VideoResult

```typescript
interface VideoResult {
  id: string;
  videoUrl: string;             // 動画URL
  videoBase64?: string;         // Base64動画データ（オプション）
  duration: number;             // 動画の長さ（秒）
  resolution: { width: number; height: number };
  createdAt: string;            // ISO 8601形式
}
```

### VideoGeneratorOptions

```typescript
interface VideoGeneratorOptions {
  apiKey?: string;              // APIキー（env varから自動取得）
  baseUrl?: string;             // APIエンドポイント
  maxWaitTime?: number;         // タイムアウト（ms、デフォルト: 5分）
  pollInterval?: number;        // ポーリング間隔（ms、デフォルト: 5秒）
  useMock?: boolean;            // モック使用フラグ
}
```

## メソッド

### `generate(request: VideoRequest): Promise<VideoGeneration>`

動画生成ジョブを開始します。

- **引数**: VideoRequest
- **戻り値**: VideoGeneration（ジョブID含む）
- **エラー**: API通信エラー時にスロー

### `checkStatus(generationId: string): Promise<GenerationStatus>`

生成ジョブのステータスを確認します。

- **引数**: generationId（ジョブID）
- **戻り値**: GenerationStatus（進捗含む）
- **エラー**: 不正なジョブID時にエラーステータス返却

### `getVideo(generationId: string): Promise<VideoResult>`

完了した動画を取得します。

- **引数**: generationId（ジョブID）
- **戻り値**: VideoResult（URL、メタデータ含む）
- **エラー**: 未完了時またはジョブ不存在時にスロー

### `generateAndWait(request: VideoRequest): Promise<VideoResult>`

動画生成開始 → 完了まで自動待機 → 結果取得を一括で行います。

- **引数**: VideoRequest
- **戻り値**: VideoResult
- **エラー**: タイムアウト、生成失敗時にスロー

## モック実装

Sora2 APIが未公開または開発環境で使用する場合、自動的にモック実装が使用されます。

### モックの動作

- **生成時間**: 15秒でシミュレーション
- **進捗**: 0% → 99% → 100%で推移
- **動画URL**: `https://example.com/mock-videos/{id}.mp4`
- **解像度**: aspectRatioに応じた正しい解像度

### モックの有効化

```typescript
// 明示的にモックを使用
const generator = new VideoGenerator({ useMock: true });

// APIキーがない場合は自動的にモックにフォールバック
const generator = new VideoGenerator(); // 環境変数なし → モック
```

## エラーハンドリング

### タイムアウト

```typescript
const generator = new VideoGenerator({
  maxWaitTime: 3 * 60 * 1000, // 3分でタイムアウト
});

try {
  const video = await generator.generateAndWait(request);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Generation timeout. Try again later.');
  }
}
```

### API エラー

```typescript
try {
  const generation = await generator.generate(request);
} catch (error) {
  if (error.message.includes('Sora2 API error')) {
    console.error('API returned error:', error.message);
    // リトライロジックなど
  }
}
```

### 生成失敗

```typescript
const status = await generator.checkStatus(generationId);

if (status.status === 'failed') {
  console.error('Generation failed:', status.error);
  // エラー処理
}
```

## テスト

```bash
# 全テスト実行
npm test tests/video-generator.test.ts

# Watch mode
npm test -- --watch tests/video-generator.test.ts

# カバレッジ
npm test -- --coverage tests/video-generator.test.ts
```

### テストカバレッジ

- 31テスト、全テストパス
- モック実装: 15テスト
- 実API（fetchモック）: 6テスト
- 型安全性: 4テスト
- エッジケース: 6テスト

## パフォーマンス

### モック実装

- 生成開始: < 1ms
- ステータス確認: < 1ms
- 動画取得: < 1ms（15秒経過後）
- generateAndWait: 約15秒

### 実API（予想）

- 生成開始: 500-2000ms
- ステータス確認: 300-1000ms
- 生成完了: 60-180秒（プロンプト複雑度による）

## 制約事項

- **Sora2 API未公開**: 現時点でSora2 APIは一般公開されていないため、実装は推測ベース
- **画像サイズ**: 720x1280 (9:16) を推奨、他の解像度も対応予定
- **動画時長**: デフォルト12秒、APIの制限に依存
- **同時実行**: 複数の生成ジョブを並列実行可能だが、APIレート制限に注意

## 今後の拡張予定

- [ ] 動画のBase64ダウンロード対応
- [ ] プログレスコールバック機能
- [ ] 生成ジョブのキャンセル機能
- [ ] バッチ生成（複数動画を一度に生成）
- [ ] カスタムスタイル設定（例: アニメ調、リアル調）
- [ ] 音声追加機能

## ライセンス

MIT

## 関連モジュール

- **ImageAnalyzer**: 画像分析（first frameの生成に使用）
- **ScriptGenerator**: UGCスクリプト生成（promptの生成に使用）
- **Storage**: 生成動画のGoogle Drive保存
- **Pipeline**: 全体のワークフロー統合

---

**作成日**: 2024-12-06
**バージョン**: 1.0.0
**メンテナ**: CodeGenAgent (源 💻)
