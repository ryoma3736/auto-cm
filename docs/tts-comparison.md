# TTS比較調査・選定レポート

Issue #27: [Sub] TTS比較調査・選定 (#26)
親Issue: #26 [Master] 日本語音声品質改善
調査日: 2025-12-07
調査者: CodeGenAgent (源)

## エグゼクティブサマリー

現在のEdge TTS（Microsoft）による日本語ナレーションが不自然なため、より自然で人間らしい日本語音声を生成できるTTSサービスを調査しました。

**推奨結論**: **OpenAI TTS (GPT-4o mini TTS)** を第一候補として推奨します。

**理由**:
1. 日本語品質が高く、自然なイントネーション
2. API実装が容易（claude-sdkと同様の統合パターン）
3. コスト効率が良い（生成音声1分あたり約$0.015）
4. 話し方の指示が可能（感情表現やトーン制御）
5. 既存のOpenAI APIエコシステムとの統合性

---

## 比較対象サービス

### 1. VOICEVOX（無料・ローカル）

#### 特徴
- 無料、オープンソース、キャラクター音声
- ヒロシバ氏による開発、完全無料で商用利用可能
- Windows/Mac/Linux対応のクロスプラットフォーム
- AIによるディープラーニング技術を活用

#### 音声品質
- **評価**: 中〜高品質（★★★☆☆ 3/5）
- **特性**:
  - 「四国めたん」「ずんだもん」などキャラクターボイス
  - 各キャラクターに複数スタイル（ノーマル・甘々・ツンツン・セクシー・泣き等）
  - アニメ声寄りの音質
  - イントネーション不自然な場合あり、ノイズ発生の可能性

#### 料金
- **無料**: 完全無料
- **商用利用**: 可能（適切なクレジット表記必要）
- **クレジット例**: "VOICEVOX Nemo"

#### 実装難易度
- **難易度**: 中（★★★☆☆）
- **要件**:
  - ローカルサーバーの立ち上げが必要
  - Docker対応あり
  - REST API提供（他ソフトウェアから呼び出し可能）

#### 適合性
- **ビジネス向け**: △（キャラクター声質がカジュアル過ぎる可能性）
- **用途**: ゲーム、VTuber、エンタメコンテンツ

#### 出典
- [VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)
- [日本語対応の最先端TTS・音声変換サービスを徹底比較](https://note.com/vitaactiva/n/n0539245a72b1)
- [音声合成サービス比較検証 | フューチャー技術ブログ](https://future-architect.github.io/articles/20230620a/)

---

### 2. Style-Bert-VITS2（無料・ローカル）

#### 特徴
- オープンソース、日本語特化
- 感情制御可能、自然な日本語
- GNU Affero General Public License v3.0 (AGPLv3)
- BERTとVITS2の組み合わせ

#### 音声品質
- **評価**: 非常に高品質（★★★★★ 5/5）
- **特性**:
  - 日本語TTSで最も品質が高いとの評価
  - 発話が滑らか
  - 感情豊かな音声生成（楽しそうな文章は楽しそうに、悲しそうな文章は悲しそうに）
  - JP-Extraバージョン: 日本語性能に全振り（800時間の学習データ）

#### 料金
- **無料**: 完全無料
- **商用利用**: 可能（AGPLv3ライセンス下）

#### 実装難易度
- **難易度**: 高（★★★★☆）
- **要件**:
  - GPUとモデル設定必要
  - Python環境必須
  - Google Colabでの学習サポートあり
  - CPU動作可能（音声合成のみの場合）
  - `pip install style-bert-vits2`で推論可能

#### 適合性
- **ビジネス向け**: ◎（最も自然な日本語、技術力あれば最適）
- **用途**: 高品質な日本語ナレーション、オーディオブック、教育コンテンツ

#### 出典
- [【Style-Bert-VITS2 JP-Extra】日本語の発音・イントネーションが完璧な次世代音声AI](https://weel.co.jp/media/tech/style-bert-vits2-jp-extra/)
- [GitHub - litagin02/Style-Bert-VITS2](https://github.com/litagin02/Style-Bert-VITS2)
- [Bert-VITS2 JP-Extra (日本語特化版)について](https://zenn.dev/litagin/articles/034819a5256ff4)

---

### 3. OpenAI TTS（有料API）

#### 特徴
- GPT-4o mini TTS（2025年3月リリース）
- 話し方の指示が可能
- 多言語対応（60言語以上）
- GPT-4連携、自然な音声

#### 音声品質
- **評価**: 高品質（★★★★☆ 4/5）
- **特性**:
  - 日本語イントネーションが自然
  - 感情表現・トーン制御可能
  - "共感してくれるカスタマーサポートのように話をして"等の指示が可能
  - tts-1-hd（品質優先モデル）はtts-1（スピード優先）より自然
  - 英語に最適化されているが、日本語も実用レベル

#### 料金
- **GPT-4o mini TTS**:
  - 入力: 100万トークンあたり$0.60
  - 出力: 100万トークンあたり$12.00
  - **目安**: 生成音声1分あたり約$0.015
- **従来モデル（tts-1）**: 100万文字あたり$15.00
- **従来モデル（tts-1-hd）**: 100万文字あたり$30.00

#### 実装難易度
- **難易度**: 低（★☆☆☆☆）
- **要件**:
  - API呼び出しのみ
  - Anthropic SDK同様の統合パターン
  - 11の事前定義ボイスから選択

#### 適合性
- **ビジネス向け**: ◎（実装容易、コスパ良好、品質高い）
- **用途**: カスタマーサポート、教育コンテンツ、ビジネスナレーション

#### 出典
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [OpenAIの新音声合成モデル「GPT-4o Mini TTS」とは？](https://weel.co.jp/media/tech/gpt-4o-mini-tts/)
- [GPT-4o mini TTSとは？新音声合成モデルの使い方！](https://miralab.co.jp/media/gpt-4o-mini-tts/)

---

### 4. ElevenLabs（有料API）

#### 特徴
- Voice Cloning、多言語対応
- Eleven v3（2025年6月リリース）で日本語対応強化
- 70以上の言語対応（世界人口カバー率90%）
- 感情表現AI

#### 音声品質
- **評価**: 英語◎、日本語○（★★★★☆ 4/5）
- **特性**:
  - v3で日本語精度向上（v2/v2.5から大幅改善）
  - 感情を読み取り幅広い感情表現
  - 「関西弁」等の方言自動変換可能
  - 「ささやき」「笑い」「皮肉なトーン」などボイスタグサポート
  - G2評価: 4.8/5

#### 料金
- **無料プラン**: 月間20,000文字（商用利用不可、帰属表示必要）
- **スタータープラン**: $5/月（約720円）
- **クリエイタープラン**: $22/月（約3,000円）
- **プロプラン**: $99/月（約14,000円）

#### 実装難易度
- **難易度**: 低（★☆☆☆☆）
- **要件**:
  - API呼び出しのみ
  - WebサイトおよびAPI提供
  - Eleven v3（Alpha）公開API近日リリース予定

#### 適合性
- **ビジネス向け**: ○（日本語品質向上中、感情表現豊か）
- **用途**: ボイスクローニング、感情豊かなナレーション、多言語展開

#### 出典
- [Free AI Voice Generator & Voice Agents Platform | ElevenLabs](https://elevenlabs.io/)
- [ElevenLabs v3が日本語対応！感情も関西弁も再現できる次世代AI音声](https://dis-media.com/20250825_1931.html)
- [ElevenLabsのボイスクローンから合成音声API活用まで実践！](https://note.com/yuki_tech/n/ndfa3669945ac)

---

### 5. Google Cloud Text-to-Speech（有料API）

#### 特徴
- WaveNet技術、安定した品質
- Neural2音声（最新）
- Gemini AI技術活用
- 多言語対応

#### 音声品質
- **評価**: 高品質（★★★★☆ 4/5）
- **特性**:
  - ja-JP-Wavenet-B等の日本語ボイス
  - リアルで自然な音声生成
  - イントネーションや表現力向上
  - 実際の人間音声サンプルでトレーニング

#### 料金
- **無料枠**:
  - WaveNet音声: 月100万文字まで無料
  - Standard音声: 月400万文字まで無料
- **有料**: 無料枠超過後、100万文字ごとに課金
- **新規ユーザー**: $300の無料クレジット
- **日本語**: UTF-8で複数バイトでも1文字としてカウント

#### 実装難易度
- **難易度**: 低（★☆☆☆☆）
- **要件**:
  - API呼び出しのみ
  - SDK提供（Python、Node.js等）
  - Standard、WaveNet、Neural2から選択

#### 適合性
- **ビジネス向け**: ○（安定品質、無料枠大きい）
- **用途**: 対話型AI、アクセシビリティ、大量テキスト読み上げ

#### 出典
- [Text-to-Speech AI: Lifelike Speech Synthesis | Google Cloud](https://cloud.google.com/text-to-speech)
- [Review pricing for Text-to-Speech | Google Cloud](https://cloud.google.com/text-to-speech/pricing)
- [日本語対応の最先端TTS・音声変換サービスを徹底比較](https://note.com/vitaactiva/n/n0539245a72b1)

---

### 6. Amazon Polly（有料API）

#### 特徴
- Neural TTS（NTTS）対応
- 多言語対応
- AWS統合
- SSML対応

#### 音声品質
- **評価**: 高品質（★★★★☆ 4/5）
- **特性**:
  - 日本語NTTS音声: Takumi（男性）+ 女性音声2種
  - 標準音声: Mizuki等
  - 深層学習技術
  - サンプリングレート: 標準22kHz、Neural24kHz

#### 料金
- **Standard voices**: 100万文字あたり$4.00
- **Neural voices**: 100万文字あたり$16.00
- **Long-Form voices**: 100万文字あたり$100.00
- **Generative voices**: 100万文字あたり$30.00
- **無料枠**: Neural voices月100万文字（最初の12ヶ月）

#### 実装難易度
- **難易度**: 低（★☆☆☆☆）
- **要件**:
  - API呼び出しのみ
  - AWS SDK統合
  - MP3、OGG、PCM形式サポート

#### 適合性
- **ビジネス向け**: ○（AWS環境なら最適、安定品質）
- **用途**: ニュース記事読み上げ、アクセシビリティ、AWS統合システム

#### 制約
- 日本語はロングフォーム音声に非対応
- ペルソナやSSMLの日本語対応が遅れている

#### 出典
- [Amazon Polly Pricing](https://aws.amazon.com/polly/pricing/)
- [Amazon PollyのNeural TTSで日本語を選択出来るようになりました](https://dev.classmethod.jp/articles/polly-japanese-takumi-ntts/)
- [Amazon Pollyに2つの新しい日本語NTTS音声が追加されました](https://www.d-make.co.jp/blog/2023/02/18/amazon-polly-new-japanese-ntts/)

---

### 7. その他の注目サービス

#### Microsoft Azure TTS
- **品質**: 業界最高レベル（Azure TTS > Polly > GCP TTS > VOICEVOXの順）
- **特性**: アクセント、イントネーション調整で自然な音声
- **用途**: エンタープライズ、大規模システム

#### AITalk
- **品質**: 日本製、自然な音声生成
- **導入実績**: 2,000社以上、音声制作実績400以上
- **提供形態**: SaaS型 AITalk WebAPI（AICloud）
- **用途**: 日本企業向け、カスタマイズ重視

#### CoeFont
- **品質**: 10,000種以上のボイス登録
- **商用利用**: クレジット不要（スタンダードプラン以上）
- **用途**: ナレーション、動画、ゲーム、大量セリフ生成

---

## 総合比較表

| サービス | 品質 | 価格 | 実装難易度 | 日本語適合性 | 商用利用 | 推奨度 |
|---------|------|------|-----------|------------|---------|-------|
| **OpenAI TTS** | ★★★★☆ | $0.015/分 | ★☆☆☆☆ | ◎ | 可 | ⭐⭐⭐⭐⭐ |
| **Style-Bert-VITS2** | ★★★★★ | 無料 | ★★★★☆ | ◎ | 可 | ⭐⭐⭐⭐☆ |
| **Google Cloud TTS** | ★★★★☆ | 月100万字無料 | ★☆☆☆☆ | ○ | 可 | ⭐⭐⭐⭐☆ |
| **ElevenLabs** | ★★★★☆ | $5/月〜 | ★☆☆☆☆ | ○ | 可 | ⭐⭐⭐☆☆ |
| **Amazon Polly** | ★★★★☆ | $16/100万字 | ★☆☆☆☆ | ○ | 可 | ⭐⭐⭐☆☆ |
| **VOICEVOX** | ★★★☆☆ | 無料 | ★★★☆☆ | △ | 可 | ⭐⭐☆☆☆ |
| **Azure TTS** | ★★★★★ | 要確認 | ★☆☆☆☆ | ◎ | 可 | ⭐⭐⭐⭐☆ |

---

## 推奨選定

### 第一候補: OpenAI TTS (GPT-4o mini TTS) ⭐⭐⭐⭐⭐

#### 選定理由

1. **品質とコストのバランスが最適**
   - 日本語品質: ★★★★☆（実用レベル）
   - コスト: 生成音声1分あたり約$0.015（非常に安価）
   - 品質対コスト比が最も優れている

2. **実装容易性**
   - API統合がシンプル（Anthropic SDK同様のパターン）
   - 既存のOpenAIエコシステムと統合可能
   - 11の事前定義ボイスから選択可能

3. **話し方の指示が可能**
   - "共感してくれるカスタマーサポートのように"等の指示
   - 感情表現、トーン制御
   - ビジネスシーン向けのカスタマイズ性

4. **多言語対応**
   - 60言語以上対応
   - 将来的な多言語展開に対応可能

5. **スケーラビリティ**
   - クラウドAPI（インフラ管理不要）
   - 従量課金で柔軟

#### 実装例

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateSpeech(text: string) {
  const response = await openai.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: 'alloy', // または 'shimmer', 'nova' 等
    input: text,
    // 話し方の指示（オプション）
    instructions: '共感的で親しみやすいカスタマーサポートのように話してください'
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
}
```

#### 注意点
- 英語に最適化されているため、日本語品質は英語より若干劣る
- 感情表現は英語ほど細かく制御できない場合がある

---

### 第二候補: Google Cloud Text-to-Speech (WaveNet/Neural2) ⭐⭐⭐⭐☆

#### 選定理由

1. **無料枠が大きい**
   - WaveNet: 月100万文字無料
   - 開発・テスト段階でコスト削減

2. **安定した品質**
   - 実績豊富、企業利用多数
   - 日本語イントネーション良好

3. **実装容易**
   - SDKが充実
   - ドキュメントが豊富

#### 推奨条件
- 予算を極力抑えたい場合
- Google Cloud環境を既に利用している場合
- 大量の音声生成が必要な場合（無料枠活用）

---

### 第三候補: Style-Bert-VITS2（技術力がある場合） ⭐⭐⭐⭐☆

#### 選定理由

1. **日本語品質が最高**
   - ★★★★★の評価
   - 最も自然な日本語音声

2. **完全無料**
   - ランニングコスト0円
   - 商用利用可能（AGPLv3）

3. **カスタマイズ性**
   - 独自モデル学習可能
   - 感情制御が豊か

#### 推奨条件
- 技術リソースがある場合（GPU環境、機械学習知識）
- 長期的にコストを抑えたい場合
- 最高品質の日本語が必要な場合

#### 注意点
- 実装難易度が高い（★★★★☆）
- インフラ管理が必要（ローカルサーバーまたはGPUサーバー）
- 運用コスト（サーバー維持費）が発生

---

## 実装ロードマップ（推奨: OpenAI TTS）

### Phase 1: プロトタイプ実装（1-2日）
1. OpenAI SDK統合
2. 基本的な音声生成機能実装
3. 複数ボイスのテスト（alloy, shimmer, nova等）

### Phase 2: 品質検証（1-2日）
1. 実際の日本語スクリプトで音声サンプル生成
2. Edge TTSとの比較評価
3. ステークホルダーレビュー

### Phase 3: 本番実装（2-3日）
1. エラーハンドリング強化
2. キャッシング戦略（同一テキストの再利用）
3. コスト監視ダッシュボード

### Phase 4: 最適化（継続的）
1. 話し方指示の最適化
2. ボイス選定の最終調整
3. パフォーマンス改善

---

## コスト試算

### OpenAI TTS (GPT-4o mini TTS)

**想定使用量**:
- 1動画あたり平均ナレーション: 2分
- 月間動画生成数: 100本

**月間コスト**:
```
2分/動画 × 100本 × $0.015/分 = $3.00/月
```

**年間コスト**: 約$36（約5,000円）

### 比較: Google Cloud TTS (WaveNet)

**想定使用量**:
- 1動画あたり平均文字数: 500文字
- 月間動画生成数: 100本

**月間文字数**: 500文字 × 100本 = 50,000文字

**月間コスト**: 無料枠内（100万文字まで無料）

**結論**: 初期はGoogle Cloud TTSでコスト削減も選択肢

---

## 次のアクション

1. ✅ TTS調査完了
2. ⬜ OpenAI TTS プロトタイプ実装（Issue #XX作成予定）
3. ⬜ 音声サンプル生成・品質比較（Issue #XX作成予定）
4. ⬜ ステークホルダーレビュー
5. ⬜ 本番実装（Issue #XX作成予定）

---

## 参考文献

### VOICEVOX
- [VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)
- [日本語対応の最先端TTS・音声変換サービスを徹底比較](https://note.com/vitaactiva/n/n0539245a72b1)
- [音声合成サービス比較検証 | フューチャー技術ブログ](https://future-architect.github.io/articles/20230620a/)

### Style-Bert-VITS2
- [【Style-Bert-VITS2 JP-Extra】日本語の発音・イントネーションが完璧な次世代音声AI](https://weel.co.jp/media/tech/style-bert-vits2-jp-extra/)
- [GitHub - litagin02/Style-Bert-VITS2](https://github.com/litagin02/Style-Bert-VITS2)
- [Bert-VITS2 JP-Extra (日本語特化版)について](https://zenn.dev/litagin/articles/034819a5256ff4)

### OpenAI TTS
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [OpenAIの新音声合成モデル「GPT-4o Mini TTS」とは？](https://weel.co.jp/media/tech/gpt-4o-mini-tts/)
- [GPT-4o mini TTSとは？新音声合成モデルの使い方！](https://miralab.co.jp/media/gpt-4o-mini-tts/)

### ElevenLabs
- [Free AI Voice Generator & Voice Agents Platform | ElevenLabs](https://elevenlabs.io/)
- [ElevenLabs v3が日本語対応！感情も関西弁も再現できる次世代AI音声](https://dis-media.com/20250825_1931.html)
- [ElevenLabsのボイスクローンから合成音声API活用まで実践！](https://note.com/yuki_tech/n/ndfa3669945ac)

### Google Cloud TTS
- [Text-to-Speech AI: Lifelike Speech Synthesis | Google Cloud](https://cloud.google.com/text-to-speech)
- [Review pricing for Text-to-Speech | Google Cloud](https://cloud.google.com/text-to-speech/pricing)

### Amazon Polly
- [Amazon Polly Pricing](https://aws.amazon.com/polly/pricing/)
- [Amazon PollyのNeural TTSで日本語を選択出来るようになりました](https://dev.classmethod.jp/articles/polly-japanese-takumi-ntts/)
- [Amazon Pollyに2つの新しい日本語NTTS音声が追加されました](https://www.d-make.co.jp/blog/2023/02/18/amazon-polly-new-japanese-ntts/)

### 総合比較
- [日本語対応の最先端TTS・音声変換サービスを徹底比較](https://note.com/vitaactiva/n/n0539245a72b1)
- [OpenAIのAny-to-Any APIでTTSサービスの音声品質を比較してみた](https://tech-blog.abeja.asia/entry/openai-any-to-any-tts-202505)
- [【2025年最新】日本語対応AI音声合成サーバー完全ガイド](https://www.quicca-plus.com/svnavi/japanese-ai-tts-server-guide-model-selection-gpu-api-2025/)

---

**調査完了日**: 2025-12-07
**次回レビュー予定**: プロトタイプ実装後
