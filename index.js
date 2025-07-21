const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));       // Public deployment
// app.use(express.static(path.join(__dirname, '../public'))); // Local testing

const GEMINI_API_KEY = process.env.GEMINI_FLASH_API;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Helper: Build prompt for Gemini
function buildPrompt({ band, part, question, answer }) {
  return `You are an IELTS Writing examiner and expert English teacher. The user wants to achieve Band ${band} in IELTS Writing Part ${part}.

    1. Grade the user's answer (0-9, one decimal) as an IELTS examiner would, based on the question and the band target.
    2. Give a short justification for the grade.
    3. Provide a correction of the user's answer in Markdown, using ~~...~~ for errors and **...** for fixes (show both in context, not just a rewrite).
    4. Generate a model answer at the target band, and explain what the user should do to reach that level.

    Return JSON with keys: score, correction, modelAnswer. Correction must use Markdown as described.

    ---

    Question: ${question}

    User's Answer:
    ${answer}
    `;
}

app.post('/evaluate', async (req, res) => {
  try {
    const { band, part, question, answer, image } = req.body;
    let geminiContents = [];
    if (image) {
      geminiContents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: image,
        },
      });
    }
    if (question) {
      geminiContents.push({ text: question });
    }
    // Add the main prompt
    geminiContents.push({ text: buildPrompt({ band, part, question, answer }) });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: geminiContents,
    });
    // Try to parse JSON from Gemini's response
    let score = null, correction = '', modelAnswer = '';
    try {
      const match = response.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        score = parsed.score;
        correction = parsed.correction;
        modelAnswer = parsed.modelAnswer;
      } else {
        // fallback: try to extract fields manually
        score = parseFloat(response.text.match(/score\s*[:=]\s*([0-9.]+)/i)?.[1] || '0');
        correction = response.text.match(/correction\s*[:=]\s*([\s\S]*?)modelAnswer/i)?.[1] || '';
        modelAnswer = response.text.match(/modelAnswer\s*[:=]\s*([\s\S]*)/i)?.[1] || '';
      }
    } catch (err) {
      // fallback: return raw text
      correction = response.text;
    }
    res.json({ score, correction, modelAnswer });
  } catch (err) {
    res.status(500).json({ error: 'Failed to evaluate answer', details: err.message });
  }
});

module.exports = app; 