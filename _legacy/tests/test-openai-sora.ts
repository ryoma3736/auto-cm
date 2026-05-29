import 'dotenv/config';

async function testOpenAISora() {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('Testing OpenAI Sora API...');
  console.log('API Key:', apiKey ? apiKey.slice(0, 15) + '...' : 'NOT SET');

  const response = await fetch('https://api.openai.com/v1/videos/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'sora-1',
      prompt: 'A product showcase video',
      duration: '5s',
    }),
  });

  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text);
}

testOpenAISora().catch(console.error);
