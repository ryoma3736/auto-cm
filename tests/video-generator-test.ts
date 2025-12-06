import 'dotenv/config';
import { VideoGenerator } from '../src/modules/video-generator/index.js';

async function test() {
  console.log('=== VideoGenerator Test ===');
  const key = process.env.OPENAI_API_KEY;
  console.log('OPENAI_API_KEY:', key ? 'SET (' + key.slice(0, 10) + '...)' : 'NOT SET');

  const generator = new VideoGenerator({
    useMock: false,
  });

  try {
    console.log('\nCalling generate()...');
    const result = await generator.generate({
      firstFrameImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==',
      prompt: 'A beautiful product showcase video',
      duration: 5,
      aspectRatio: '9:16',
    });
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

test();
