/**
 * TalentProfiler Test Script
 * Quick test for talent profile generation
 *
 * Usage:
 *   tsx src/modules/talent-profiler/test-talent-profiler.ts
 */

import { TalentProfiler, createTalentProfiler } from './index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testTalentProfiler() {
  console.log('=== TalentProfiler Test ===\n');

  // Test 1: Mock mode
  console.log('Test 1: Mock mode (新垣結衣)');
  const mockProfiler = createTalentProfiler({ useMock: true });
  const mockProfile = await mockProfiler.generateProfile('新垣結衣', 'ja');
  console.log(JSON.stringify(mockProfile, null, 2));
  console.log('\n---\n');

  // Test 2: Real API mode (if API key is available)
  if (process.env.GEMINI_API_KEY) {
    console.log('Test 2: Real API mode (新垣結衣)');
    const realProfiler = createTalentProfiler({
      geminiApiKey: process.env.GEMINI_API_KEY,
    });

    try {
      const realProfile = await realProfiler.generateProfile('新垣結衣', 'ja');
      console.log(JSON.stringify(realProfile, null, 2));

      // Test cache
      console.log('\nTest 3: Cache hit (should be instant)');
      const cachedProfile = await realProfiler.generateProfile('新垣結衣', 'ja');
      console.log('Cache works:', cachedProfile.name === realProfile.name);

      // Test cache stats
      console.log('\nCache stats:', realProfiler.getCacheStats());
    } catch (error) {
      console.error('Real API test failed:', error instanceof Error ? error.message : String(error));
    }
  } else {
    console.log('Test 2: Skipped (GEMINI_API_KEY not set)');
  }

  console.log('\n=== Test Complete ===');
}

// Run tests
testTalentProfiler().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
