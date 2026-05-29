#!/usr/bin/env node

/**
 * auto-cm - CLI Entry Point
 * Sora2 Automatic Advertisement Generation System
 *
 * Powered by Miyabi - Autonomous AI Development Framework
 */

import 'dotenv/config';
import { Command } from 'commander';
import { AdGenerationPipeline } from './pipeline/index.js';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('auto-cm')
  .description('Sora2 Automatic Advertisement Generation System')
  .version('1.0.0');

// ========== Generate Command ==========

program
  .command('generate <image>')
  .description('Generate advertisement video from product image')
  .option('--mock', 'Run in mock mode (no real API calls)')
  .option('--verbose', 'Enable detailed logging')
  .option('--output-folder <folderId>', 'Google Drive folder ID for output')
  .option('--no-upload', 'Skip Google Drive upload')
  .option('--private', 'Make uploaded video private (default: public)')
  .action(async (imagePath: string, options) => {
    try {
      console.log('🎬 Auto-CM - Sora2 Advertisement Generator');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Validate image path
      const isUrl = imagePath.startsWith('http://') || imagePath.startsWith('https://');
      if (!isUrl && !fs.existsSync(imagePath)) {
        console.error(`❌ Error: Image file not found: ${imagePath}`);
        process.exit(1);
      }

      // Create pipeline instance
      const pipeline = new AdGenerationPipeline({
        useMock: options.mock ?? false,
        verbose: options.verbose ?? false,
        googleDriveCredentialsPath: options.upload !== false
          ? process.env.GOOGLE_DRIVE_CREDENTIALS_PATH
          : undefined,
      });

      console.log('📋 Configuration:');
      console.log(`  Image: ${imagePath}`);
      console.log(`  Mode: ${options.mock ? 'Mock' : 'Production'}`);
      console.log(`  Upload: ${options.upload !== false ? 'Enabled' : 'Disabled'}`);
      console.log(`  Verbose: ${options.verbose ? 'Yes' : 'No'}`);
      console.log('');

      // Execute pipeline
      console.log('🚀 Starting pipeline...\n');

      const result = await pipeline.generate({
        imagePath: isUrl ? undefined : imagePath,
        imageUrl: isUrl ? imagePath : undefined,
        outputFolderId: options.outputFolder,
        makePublic: !options.private,
      });

      // Display results
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (result.success) {
        console.log('✅ Pipeline completed successfully!\n');

        console.log('📊 Results:');
        console.log(`  Video URL: ${result.videoUrl || 'N/A'}`);
        if (result.driveLink) {
          console.log(`  Drive Link: ${result.driveLink}`);
        }
        console.log(`  Processing Time: ${(result.metadata.processingTime / 1000).toFixed(2)}s`);
        console.log('');

        console.log('📦 Product Analysis:');
        console.log(`  Type: ${result.metadata.productAnalysis.productType}`);
        console.log(`  Name: ${result.metadata.productAnalysis.productName}`);
        console.log(`  Colors: ${result.metadata.productAnalysis.colors.join(', ')}`);
        console.log(`  Target: ${result.metadata.productAnalysis.targetAudience}`);
        console.log('');

        console.log('👤 Generated Persona:');
        console.log(`  Name: ${result.metadata.persona.name}`);
        console.log(`  Age: ${result.metadata.persona.age}`);
        console.log(`  Occupation: ${result.metadata.persona.occupation}`);
        console.log('');

        console.log('🎬 Script:');
        console.log(`  Scenes: ${result.metadata.script.scenes.length}`);
        console.log(`  Duration: ${result.metadata.script.totalDuration}s`);
        console.log('');

        console.log('⏱️  Stage Breakdown:');
        result.metadata.stages.forEach((stage) => {
          const status = stage.status === 'success' ? '✅' : stage.status === 'failed' ? '❌' : '⏭️';
          const duration = (stage.duration / 1000).toFixed(2);
          console.log(`  ${status} ${stage.name}: ${duration}s`);
        });
      } else {
        console.log('❌ Pipeline failed!\n');
        console.log(`Error: ${result.error}`);
        console.log('');

        console.log('⏱️  Stage Breakdown:');
        result.metadata.stages.forEach((stage) => {
          const status = stage.status === 'success' ? '✅' : stage.status === 'failed' ? '❌' : '⏭️';
          const duration = (stage.duration / 1000).toFixed(2);
          console.log(`  ${status} ${stage.name}: ${duration}s`);
          if (stage.error) {
            console.log(`      Error: ${stage.error}`);
          }
        });

        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Unexpected error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ========== Test Command ==========

program
  .command('test')
  .description('Run pipeline test with mock data')
  .action(async () => {
    console.log('🧪 Running pipeline test in mock mode...\n');

    // Create a test image (1x1 white pixel)
    const testImageBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    const pipeline = new AdGenerationPipeline({
      useMock: true,
      verbose: true,
    });

    try {
      const result = await pipeline.generate({
        imageBase64: testImageBase64,
      });

      if (result.success) {
        console.log('\n✅ Test passed! Pipeline is working correctly.');
        console.log(`Processing time: ${(result.metadata.processingTime / 1000).toFixed(2)}s`);
      } else {
        console.error('\n❌ Test failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Test error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ========== Info Command ==========

program
  .command('info')
  .description('Display system information and configuration')
  .action(() => {
    console.log('🎬 Auto-CM System Information');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📦 Project:');
    console.log('  Name: auto-cm');
    console.log('  Version: 1.0.0');
    console.log('  Description: Sora2 Automatic Advertisement Generation');
    console.log('');

    console.log('🔧 Configuration:');
    console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`  SORA2_API_KEY: ${process.env.SORA2_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`  GOOGLE_DRIVE_CREDENTIALS_PATH: ${process.env.GOOGLE_DRIVE_CREDENTIALS_PATH ? '✅ Set' : '❌ Not set'}`);
    console.log('');

    console.log('🌸 Framework:');
    console.log('  Miyabi - Autonomous AI Development Framework');
    console.log('  - 7 AI Agents');
    console.log('  - Automatic Issue → PR pipeline');
    console.log('  - CI/CD automation');
    console.log('');

    console.log('📚 Documentation:');
    console.log('  - README.md: Project overview');
    console.log('  - CLAUDE.md: Claude Code integration');
    console.log('  - .claude/: Agent definitions and commands');
    console.log('');

    console.log('💡 Quick Start:');
    console.log('  1. Set environment variables (see .env.example)');
    console.log('  2. Run: npx auto-cm generate ./product.jpg');
    console.log('  3. Check the generated video URL');
  });

// Parse CLI arguments
program.parse();

// ========== Exports (for programmatic use) ==========

export { AdGenerationPipeline, createPipeline } from './pipeline/index.js';
export type {
  PipelineInput,
  PipelineResult,
  PipelineOptions,
  StageResult,
} from './pipeline/index.js';
