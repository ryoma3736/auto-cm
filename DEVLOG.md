# auto-cm 開発ログ

## 2025-12-10

### V2 タレント起用機能 完了
- Master Issue #82 + Sub Issues #83-#89 全クローズ
- 全194テストパス

### 実CM生成テスト

#### SILK THE RICH シャンプー (成功)
- 新垣結衣風モデル
- 12秒尺
- 処理時間: 247秒
- URL: `~/Desktop/SILK_THE_RICH_CM.mp4`

#### 焼肉おおつか (部分成功)
- 8秒尺
- 処理時間: 177秒
- URL: `~/Desktop/焼肉おおつか_CM.mp4`

**問題点:**
1. 肉を食べるシーンがない → `firstFrameImage`が店外観のため
2. 「おおつか」と喋らない → sora2Promptにセリフ内容が含まれていない
3. TTS失敗 → OpenAI quota超過（429エラー）

**原因:**
- Sora2は`input_reference`画像を最初のフレームとして使う
- sora2Promptに「speaking in Japanese」はあるが具体的セリフ指示なし

**TODO:**
- [ ] sora2Promptにnarration内容を含める修正
- [ ] 肉のアップ画像で再テスト
- [ ] TTS代替検討（VOICEVOX等）

---

## テスト結果サマリー
```
Test Files  9 passed (9)
Tests       194 passed | 7 skipped (201)
```
