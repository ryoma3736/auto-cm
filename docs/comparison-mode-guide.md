# Issue #51: 2エンジン比較モード実装ガイド

## 実装状況

### ✅ 完了
- **Backend API** (`src/pipeline/v2.ts`): `generateComparison()` メソッド追加
- **Server Endpoint** (`src/server.ts`): `/api/generate-v2` に比較モードサポート追加

### 📝 API使用方法

#### リクエスト例 (cURL)

```bash
curl -X POST http://localhost:8888/api/generate-v2 \
  -F "image=@product.jpg" \
  -F "compareMode=true" \
  -F "engineA=heygen" \
  -F "engineB=kling" \
  -F "duration=5" \
  -F "language=ja"
```

#### リクエストパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `image` | File | Yes | 商品画像 (JPG/PNG) |
| `compareMode` | Boolean | No | 比較モード有効化 (default: false) |
| `engineA` | String | No | エンジンA選択 (`kling`, `heygen`, `seedance`, `veo3`) |
| `engineB` | String | No | エンジンB選択 |
| `duration` | Number | No | 動画秒数 (default: 10) |
| `language` | String | No | 言語 (`ja`, `en`, `zh`) |

#### レスポンス例

```json
{
  "success": true,
  "videos": {
    "heygen": {
      "engine": "heygen",
      "success": true,
      "videoUrl": "https://...",
      "processingTime": 92000
    },
    "kling": {
      "engine": "kling",
      "success": true,
      "videoUrl": "https://...",
      "processingTime": 65000
    }
  },
  "recommended": {
    "engine": "kling",
    "videoUrl": "https://...",
    "processingTime": 65000
  },
  "metadata": {
    "totalProcessingTime": 95000
  }
}
```

## Frontend UI実装 (オプション)

`public/v2.html` への追加が推奨されます:

### 1. CSS追加

```css
.compare-toggle {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  border-radius: 10px;
  margin: 15px 0;
  cursor: pointer;
}
.compare-selector {
  display: none;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin: 15px 0;
}
.compare-selector.show {
  display: grid;
}
```

### 2. HTML追加 (Settingsセクションの前)

```html
<!-- Compare Mode -->
<label class="compare-toggle">
  <input type="checkbox" id="enableCompare">
  <span>🆚 2つのエンジンで比較生成</span>
</label>

<div class="compare-selector" id="compareSelector">
  <div>
    <h4>エンジン A</h4>
    <select id="engineA">
      <option value="heygen">HeyGen</option>
      <option value="kling">Kling</option>
      <option value="seedance">Seedance</option>
      <option value="veo3">Veo3</option>
    </select>
  </div>
  <div>
    <h4>エンジン B</h4>
    <select id="engineB">
      <option value="kling">Kling</option>
      <option value="heygen">HeyGen</option>
    </select>
  </div>
</div>
```

### 3. JavaScript追加

```javascript
// Toggle compare selector
const enableCompare = document.getElementById('enableCompare');
const compareSelector = document.getElementById('compareSelector');

enableCompare.addEventListener('change', () => {
  compareSelector.classList.toggle('show', enableCompare.checked);
});

// Modify generate function
generateBtn.addEventListener('click', async () => {
  const formData = new FormData();
  formData.append('image', productFile);
  
  // Add comparison mode params
  if (enableCompare.checked) {
    formData.append('compareMode', 'true');
    formData.append('engineA', document.getElementById('engineA').value);
    formData.append('engineB', document.getElementById('engineB').value);
  }
  
  const response = await fetch('/api/generate-v2', { method: 'POST', body: formData });
  const data = await response.json();
  
  // Handle comparison results
  if (data.videos) {
    // Display side-by-side results
    Object.entries(data.videos).forEach(([engine, result]) => {
      console.log(`${engine}: ${result.videoUrl}`);
    });
  }
});
```

## テスト手順

```bash
# 1. サーバー起動
npm run dev

# 2. ブラウザで http://localhost:8888/v2 を開く

# 3. 比較モードチェックボックスをON

# 4. エンジンA / Bを選択

# 5. 商品画像をアップロード

# 6. 生成ボタンをクリック
```

## 成功基準

- ✅ 2つのエンジンを選択できる
- ✅ 並列で生成が実行される
- ✅ 結果が横並びで比較表示される
- ✅ 処理時間・コストが比較できる

---

**実装者**: Claude CodeGenAgent  
**Issue**: #51  
**完了日**: 2025-12-07
