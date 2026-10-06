import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Initialize Gemini AI Client (Server-side only)
  const apiKey = process.env.GEMINI_API_KEY || '';
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  // Endpoint: AI Quiz Generation with gemini-3.1-pro-preview and ThinkingLevel.HIGH
  app.post('/api/ai/generate-quiz', async (req: Request, res: Response) => {
    const { topic, count = 5, difficulty = 'medium', language = 'Uzbek' } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'Topic is required' });
      return;
    }

    if (!ai) {
      // Fallback structured generation when GEMINI_API_KEY is not configured
      const fallbackText = `Q: What is the significance of ${topic}?
Type: quiz
A) It represents a fundamental milestone in the field
B) It has no recognized importance
C) It was only discussed once in antiquity
D) It is an unverified hypothesis
Answer: A
Time: 20
Points: standard

Q: True or False: ${topic} continues to be researched and taught worldwide.
Type: truefalse
Answer: True
Time: 15
Points: standard

Q: Which of the following is most closely connected to ${topic}?
Type: quiz
A) Comprehensive principles and applied methods
B) Unrelated historical occurrences
C) Mythological narratives
D) Random coincidences
Answer: A
Time: 20
Points: standard`;

      res.json({
        title: `${topic} Quiz`,
        rawText: fallbackText,
      });
      return;
    }

    try {
      const prompt = `You are an expert curriculum developer. Generate a ${count}-question educational quiz about "${topic}".
Difficulty level: ${difficulty}.
Output language: ${language}.

Format your response in plain text using EXACTLY this structure for each question:

Q: [Question text here]
Type: quiz
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [A, B, C, or D]
Time: 20
Points: standard

Or for True/False questions:
Q: [Statement here]
Type: truefalse
Answer: [True or False]
Time: 15
Points: standard

Ensure questions are factually accurate, clear, and engaging. Do NOT include markdown code blocks or extra conversational commentary outside the questions.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      const generatedText = response.text || '';

      res.json({
        title: `${topic} Quiz`,
        rawText: generatedText,
      });
    } catch (err: unknown) {
      console.error('Gemini Generation Error:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate quiz';
      res.status(500).json({ error: message });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  if (!isProd) {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
