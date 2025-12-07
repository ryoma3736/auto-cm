import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { AdGenerationPipeline } from './pipeline/index.js';
import { PipelineV2, type VideoEngine } from './pipeline/v2.js';

const app = express();
const PORT = 8888;

// Multer設定（メモリストレージ）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// HTML UI (static file)
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

/* OLD inline HTML removed
app.get('/old', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auto-CM - Sora2自動広告生成</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      text-align: center;
      margin-bottom: 10px;
      font-size: 2em;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
    }
    .upload-area {
      border: 3px dashed #ddd;
      border-radius: 15px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      margin-bottom: 20px;
    }
    .upload-area:hover { border-color: #667eea; background: #f8f9ff; }
    .upload-area.dragover { border-color: #667eea; background: #f0f2ff; }
    .upload-area img { max-width: 100%; max-height: 200px; border-radius: 10px; }
    #file-input { display: none; }
    .btn {
      width: 100%;
      padding: 15px;
      font-size: 18px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102,126,234,0.4); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .progress {
      margin-top: 20px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 10px;
      display: none;
    }
    .progress.show { display: block; }
    .progress-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .progress-item:last-child { border-bottom: none; }
    .progress-icon { margin-right: 10px; font-size: 18px; }
    .result {
      margin-top: 20px;
      padding: 20px;
      background: #d4edda;
      border-radius: 10px;
      display: none;
    }
    .result.show { display: block; }
    .result.error { background: #f8d7da; }
    .result h3 { margin-bottom: 10px; }
    .result a { color: #667eea; }
    .mock-badge {
      background: #ffc107;
      color: #000;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 12px;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎬 Auto-CM</h1>
    <p class="subtitle">商品画像から12秒広告動画を自動生成</p>

    <div class="upload-area" id="upload-area">
      <div id="upload-prompt">
        <p style="font-size: 48px; margin-bottom: 10px;">📸</p>
        <p>商品画像をドロップ または クリックして選択</p>
        <p style="color: #999; font-size: 12px; margin-top: 10px;">PNG, JPG (最大10MB)</p>
      </div>
      <img id="preview" style="display: none;">
    </div>
    <input type="file" id="file-input" accept="image/png,image/jpeg">

    <button class="btn btn-primary" id="generate-btn" disabled>
      🚀 広告動画を生成
    </button>

    <div class="progress" id="progress">
      <div class="progress-item" data-stage="load">
        <span class="progress-icon">⏳</span>
        <span>画像読み込み中...</span>
      </div>
      <div class="progress-item" data-stage="analyze">
        <span class="progress-icon">⏳</span>
        <span>商品分析中...</span>
      </div>
      <div class="progress-item" data-stage="script">
        <span class="progress-icon">⏳</span>
        <span>スクリプト生成中...</span>
      </div>
      <div class="progress-item" data-stage="process">
        <span class="progress-icon">⏳</span>
        <span>画像処理中...</span>
      </div>
      <div class="progress-item" data-stage="video">
        <span class="progress-icon">⏳</span>
        <span>動画生成中...</span>
      </div>
    </div>

    <div class="result" id="result">
      <h3>✅ 生成完了！</h3>
      <div id="result-content"></div>
    </div>
  </div>

  <script>
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const preview = document.getElementById('preview');
    const uploadPrompt = document.getElementById('upload-prompt');
    const generateBtn = document.getElementById('generate-btn');
    const progress = document.getElementById('progress');
    const result = document.getElementById('result');
    const resultContent = document.getElementById('result-content');

    let selectedFile = null;

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
      if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
        alert('PNG または JPG 画像を選択してください');
        return;
      }
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
        uploadPrompt.style.display = 'none';
        generateBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    }

    generateBtn.addEventListener('click', async () => {
      if (!selectedFile) return;

      generateBtn.disabled = true;
      progress.classList.add('show');
      result.classList.remove('show');

      // Reset progress
      document.querySelectorAll('.progress-item').forEach(item => {
        item.querySelector('.progress-icon').textContent = '⏳';
      });

      const formData = new FormData();
      formData.append('image', selectedFile);

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          // Update progress
          document.querySelectorAll('.progress-item').forEach(item => {
            item.querySelector('.progress-icon').textContent = '✅';
          });

          result.classList.remove('error');
          result.classList.add('show');
          resultContent.innerHTML = \`
            <p><strong>商品タイプ:</strong> \${data.metadata?.productAnalysis?.productType || 'N/A'}</p>
            <p><strong>ペルソナ:</strong> \${data.metadata?.persona?.name || 'N/A'}, \${data.metadata?.persona?.age || ''}歳</p>
            <p><strong>シーン数:</strong> \${data.metadata?.script?.scenes?.length || 0}</p>
            <p><strong>処理時間:</strong> \${(data.metadata?.processingTime / 1000).toFixed(1)}秒</p>
            <p><strong>動画URL:</strong> <a href="\${data.videoUrl}" target="_blank">\${data.videoUrl}</a>
              \${data.videoUrl?.includes('mock') ? '<span class="mock-badge">MOCK</span>' : ''}
            </p>
          \`;
        } else {
          throw new Error(data.error || '生成に失敗しました');
        }
      } catch (error) {
        result.classList.add('error');
        result.classList.add('show');
        resultContent.innerHTML = '<p>❌ エラー: ' + error.message + '</p>';
      } finally {
        generateBtn.disabled = false;
      }
    });
  </script>
</body>
</html>
  `);
});
*/

// API: 動画生成
app.post('/api/generate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '画像がアップロードされていません' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const duration = parseInt(req.body.duration) || 12;
    const language = req.body.language || 'ja';

    console.log(`📋 [API] Duration: ${duration}s, Language: ${language}`);

    const pipeline = new AdGenerationPipeline({
      useMock: false, // 本番APIを使用（Gemini Vision + Nano Banana Pro）
      mockVideoOnly: !process.env.REPLICATE_API_TOKEN, // Replicate APIトークンがあればSora 2使用
      verbose: true,
      duration,
      language,
    });

    const result = await pipeline.generate({
      imageBase64,
    });

    res.json(result);
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API: V2 動画生成（単一エンジン最適化）
app.post('/api/generate-v2', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '画像がアップロードされていません' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const videoEngine = (req.body.videoEngine || 'both') as VideoEngine;
    const narrationText = req.body.narrationText;
    const personImageBase64 = req.body.personImageBase64;
    const audioUrl = req.body.audioUrl;

    // Comparison mode (Issue #51)
    const compareMode = req.body.compareMode === 'true' || req.body.compareMode === true;
    const engineA = req.body.engineA as VideoEngine | undefined;
    const engineB = req.body.engineB as VideoEngine | undefined;

    console.log(`📋 [API V2] Engine: ${videoEngine}, CompareMode: ${compareMode}`);
    if (compareMode) {
      console.log(`   🆚 Comparing: ${engineA} vs ${engineB}`);
    }

    const pipeline = new PipelineV2({
      useMock: false,
      verbose: true,
      duration: 10,
      language: 'ja',
    });

    // Check if requested engine is available
    const availableEngines = pipeline.getAvailableEngines();
    const singleEngines: VideoEngine[] = ['kling', 'heygen', 'seedance', 'veo3'];

    if (singleEngines.includes(videoEngine) && !availableEngines.includes(videoEngine)) {
      return res.status(400).json({
        success: false,
        error: `${videoEngine} engine is not available (API key not configured)`,
        availableEngines,
      });
    }

    // Handle comparison mode
    let result;
    if (compareMode && engineA && engineB) {
      result = await pipeline.generateComparison(
        {
          imageBase64,
          narrationText,
          personImageBase64,
          audioUrl,
        },
        engineA,
        engineB
      );
    } else {
      result = await pipeline.generate({
        imageBase64,
        videoEngine,
        narrationText,
        personImageBase64,
        audioUrl,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API: ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apis: {
      vision: process.env.GEMINI_API_KEY ? 'Gemini Vision' : (process.env.OPENAI_API_KEY ? 'OpenAI GPT-5' : 'Mock'),
      imageExtension: process.env.GEMINI_API_KEY ? 'Nano Banana Pro (Gemini)' : 'Sharp (Padding)',
      videoGeneration: process.env.REPLICATE_API_TOKEN ? 'Sora 2 (via Replicate)' : 'Mock',
    },
    keys: {
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      replicate: !!process.env.REPLICATE_API_TOKEN,
      heygen: !!process.env.HEYGEN_API_KEY,
      ark: !!process.env.ARK_API_KEY,
    },
    videoEngines: {
      available: new PipelineV2().getAvailableEngines(),
    },
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('🎬 Auto-CM Web Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 URL: http://localhost:' + PORT);
  console.log('📡 API: http://localhost:' + PORT + '/api/generate');
  console.log('');
  console.log('API Status:');
  console.log('  👁️  Vision:', process.env.GEMINI_API_KEY ? '✅ Gemini Vision' : (process.env.OPENAI_API_KEY ? '✅ OpenAI GPT-5' : '❌ Mock'));
  console.log('  📸 Image:', process.env.GEMINI_API_KEY ? '✅ Nano Banana Pro' : '⚠️ Sharp (Padding)');
  console.log('  🎥 Video:', process.env.REPLICATE_API_TOKEN ? '✅ Sora 2 (Replicate)' : '⚠️ Mock');
  console.log('');
  console.log('Ctrl+C で停止');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
