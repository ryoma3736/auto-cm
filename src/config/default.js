/**
 * Default Configuration for auto-cm
 */
export const defaultConfig = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4-vision-preview',
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: 'claude-3-7-sonnet-20250219',
    },
    nanoBanana: {
        apiKey: process.env.NANOBANANA_API_KEY || '',
        endpoint: 'https://api.nanobanana.ai/v1',
    },
    sora2: {
        apiKey: process.env.SORA2_API_KEY || '',
        endpoint: 'https://api.sora2.ai/v1',
    },
    googleDrive: {
        credentialsPath: process.env.GOOGLE_DRIVE_CREDENTIALS || './config/google-drive-credentials.json',
    },
    storage: {
        outputDirectory: process.env.OUTPUT_DIRECTORY || './output',
        tempDirectory: process.env.TEMP_DIRECTORY || './temp',
    },
};
