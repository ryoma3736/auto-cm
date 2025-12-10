import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { AdGenerationPipeline } from './pipeline/index.js';
import { TalentProfiler } from './modules/talent-profiler/index.js';

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

// Product details interface for V2 mode
interface ProductDetails {
  productName: string;
  features?: string;
  targetAudience?: string;
  sellingPoints?: string;
}

// API: 動画生成
app.post('/api/generate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '画像がアップロードされていません' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const duration = parseInt(req.body.duration) || 12;
    const language = req.body.language || 'ja';
    const customPrompt = req.body.customPrompt || undefined;
    const mode = (req.body.mode as 'v1' | 'v2') || 'v1';

    // V2 mode: Parse product details
    let productDetails: ProductDetails | undefined;
    if (mode === 'v2') {
      const productName = req.body.productName;
      if (!productName) {
        return res.status(400).json({ success: false, error: 'V2モードでは商品名が必須です' });
      }
      productDetails = {
        productName,
        features: req.body.productFeatures || undefined,
        targetAudience: req.body.targetAudience || undefined,
        sellingPoints: req.body.sellingPoints || undefined,
      };
    }

    const useMock = process.env.USE_MOCK === 'true';
    console.log(`📋 [API] Mode: ${mode}, Duration: ${duration}s, Language: ${language}, Mock: ${useMock}`);
    if (customPrompt) {
      console.log(`📝 [API] Custom Prompt: ${customPrompt.substring(0, 50)}...`);
    }
    if (productDetails) {
      console.log(`📦 [API] V2 Product: ${productDetails.productName}`);
    }

    const pipeline = new AdGenerationPipeline({
      useMock, // USE_MOCK=true で全APIをモック
      mockVideoOnly: !useMock && !process.env.REPLICATE_API_TOKEN, // モックでなくReplicate APIトークンがなければ動画のみモック
      verbose: true,
      duration,
      language,
      customPrompt,
      mode,
      productDetails,
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

// API: V2 タレント起用対応 (JSON mode)
app.post('/api/v2/generate', async (req, res) => {
  try {
    const { imageBase64, talentName, duration, language } = req.body;

    // Validate required fields
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: '画像データ (imageBase64) が必要です'
      });
    }

    // Validate talentName format
    if (talentName && typeof talentName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'タレント名が不正です。文字列を指定してください'
      });
    }

    const finalDuration = parseInt(duration as string) || 12;
    const finalLanguage = (language as string) || 'ja';

    const useMock = process.env.USE_MOCK === 'true';
    console.log(`📋 [API V2] Duration: ${finalDuration}s, Language: ${finalLanguage}, Mock: ${useMock}`);

    // Generate talent profile if talentName is provided
    let talentProfile;
    if (talentName) {
      console.log(`🎭 [API V2] Generating profile for talent: ${talentName}`);
      try {
        const profiler = new TalentProfiler({
          geminiApiKey: process.env.GEMINI_API_KEY,
          useMock
        });
        talentProfile = await profiler.generateProfile(talentName, finalLanguage);
        console.log(`✅ [API V2] Talent profile generated: ${talentProfile.name}`);
      } catch (error) {
        console.error(`❌ [API V2] Talent profile generation failed:`, error);
        return res.status(500).json({
          success: false,
          error: `タレントプロフィール生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // Initialize pipeline with talent mode
    const pipeline = new AdGenerationPipeline({
      useMock,
      mockVideoOnly: !useMock && !process.env.REPLICATE_API_TOKEN,
      verbose: true,
      duration: finalDuration,
      language: finalLanguage as 'ja' | 'en' | 'zh',
      useTalent: !!talentName,
    });

    // Execute pipeline
    const result = await pipeline.generate({
      imageBase64,
      talentName,
    });

    res.json(result);
  } catch (error) {
    console.error('[API V2] Generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API: V2動画生成（複数エンジン対応）
app.post('/api/generate-v2', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'personImage', maxCount: 1 },
  { name: 'voiceSample', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.image || !files.image[0]) {
      return res.status(400).json({ success: false, error: '画像がアップロードされていません' });
    }

    const imageBase64 = files.image[0].buffer.toString('base64');
    const personImageBase64 = files.personImage?.[0]?.buffer.toString('base64');
    const voiceSampleBase64 = files.voiceSample?.[0]?.buffer.toString('base64');

    const duration = parseInt(req.body.duration) || 5;
    const language = req.body.language || 'ja';
    const customPrompt = req.body.customPrompt || undefined;

    // Parse selected engines (comma-separated string)
    const videoEnginesStr = req.body.videoEngines || 'kling';
    const selectedEngines = videoEnginesStr.split(',').filter((e: string) => e.trim());

    const useMock = process.env.USE_MOCK === 'true';
    console.log(`📋 [API V2] Duration: ${duration}s, Language: ${language}, Mock: ${useMock}`);
    console.log(`🎬 [API V2] Selected Engines: ${selectedEngines.join(', ')}`);
    if (customPrompt) {
      console.log(`📝 [API V2] Custom Prompt: ${customPrompt.substring(0, 50)}...`);
    }

    // Import PipelineV2 dynamically
    const { PipelineV2 } = await import('./pipeline/v2.js');
    const pipeline = new PipelineV2({
      language: language as 'ja' | 'en' | 'zh',
      duration,
      useMock, // USE_MOCK=true で全APIをモック
      verbose: true,
      customPrompt,
    });

    // Generate videos for each selected engine in parallel
    const enginePromises = selectedEngines.map(async (engine: string) => {
      try {
        const result = await pipeline.generate({
          imageBase64,
          personImageBase64,
          voiceSampleBase64,
          videoEngine: engine as 'kling' | 'heygen' | 'seedance' | 'veo3',
        });
        return { engine, result };
      } catch (error) {
        return {
          engine,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            videos: {}
          }
        };
      }
    });

    const results = await Promise.all(enginePromises);

    // Aggregate results
    const videos: Record<string, unknown> = {};
    let metadata = {};
    let compositeImage;

    results.forEach(({ engine, result }) => {
      if (result.videos && Object.keys(result.videos).length > 0) {
        Object.assign(videos, result.videos);
      } else if (result.success) {
        videos[engine] = {
          engine,
          success: true,
          videoUrl: result.videoUrl || result.videos?.[engine]?.videoUrl,
          processingTime: result.metadata?.totalProcessingTime || 0,
        };
      } else {
        videos[engine] = {
          engine,
          success: false,
          error: result.error,
          processingTime: 0,
        };
      }

      if (result.metadata) {
        metadata = result.metadata;
      }
      if (result.compositeImage) {
        compositeImage = result.compositeImage;
      }
    });

    // Find recommended engine (first successful)
    const recommended = Object.values(videos).find((v: unknown) => (v as { success: boolean }).success);

    res.json({
      success: Object.values(videos).some((v: unknown) => (v as { success: boolean }).success),
      videos,
      compositeImage,
      recommended,
      metadata: {
        ...metadata,
        processingTime: (metadata as { totalProcessingTime?: number }).totalProcessingTime || 0,
      },
    });
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
