const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const GEMINI_API_KEY = process.env.GEMINI_FLASH_API;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Prompt for scoring (overall + 4 criteria)
function buildScoringPrompt({ band, part, question, answer }) {
  return `You are an IELTS Writing examiner and expert English teacher. The user wants to achieve Band ${band} in IELTS Writing Part ${part}.

    For each of the following criteria, give a band score (0-9, one decimal) and a 1-2 sentence justification:
      - Task Response (TR): Fully addresses all parts of the task with well-developed ideas
      - Coherence & Cohesion (CC): Sequences information logically, uses a wide range of cohesive devices
      - Lexical Resource (LR): Uses uncommon vocabulary naturally, with few errors
      - Grammatical Range and Accuracy (GR): Uses a wide range of complex structures with mostly accurate control

    Return JSON with keys: TR, CC, LR, GR, TR_reason, CC_reason, LR_reason, GR_reason. Example:
    {
      "TR": 7.0,
      "CC": 8.0,
      "LR": 7.5,
      "GR": 7.0,
      "TR_reason": "Addresses all parts but some ideas lack development.",
      "CC_reason": "Logical flow, but some repetition of linking words.",
      "LR_reason": "Good range of vocabulary, a few awkward phrases.",
      "GR_reason": "Complex structures attempted, some errors present."
    }

    ---

    Question: ${question}

    User's Answer:
    ${answer}
    `;
}

// Prompt for correction/model answer
function buildCorrectionPrompt({ band, part, question, answer }) {
  return `You are an IELTS Writing examiner and expert English teacher. The user wants to achieve Band ${band} in IELTS Writing Part ${part}.

    1. Provide a correction of the user's answer in Markdown, using ~~...~~ for errors and **...** for fixes (show both in context, not just a rewrite).
    2. Generate a model answer at the target band, and explain what the user should do to reach that level.

    Return your response as a single, valid JSON object with the following keys:
    - correction (string, Markdown with ~~...~~ and **...** as described)
    - modelAnswer (string, a model answer at the target band)

    IMPORTANT:
    - Do NOT include any text, explanation, or markdown code block markers outside the JSON object.
    - Do NOT wrap the JSON in triple backticks or any other formatting.
    - Only output the JSON object, nothing else.

    Example:
    {
      "correction": "Your ~~answr~~ **answer** is well structured.",
      "modelAnswer": "Here is a model answer at Band ${band}..."
    }

    ---

    Question: ${question}

    User's Answer:
    ${answer}
    `;
}

// Attempt to fix/beautify malformed JSON from LLM
function tryFixJson(str) {
  // Remove any code block markers
  str = str.replace(/```(json)?/g, '');
  // Try to find the first {...} block
  const match = str.match(/\{[\s\S]*\}/);
  if (match) str = match[0];
  // Try to fix missing commas between fields
  str = str.replace(/"\s*([a-zA-Z_]+)\s*"\s*:/g, '"$1":'); // fix key spacing
  str = str.replace(/([0-9\]\}"])(\s*\n\s*")/g, '$1,\n"'); // add missing commas between lines
  // Remove trailing commas
  str = str.replace(/,\s*([}\]])/g, '$1');
  // Try to parse
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
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

    // 1. Scoring call
    const scoringPrompt = buildScoringPrompt({ band, part, question, answer });
    const scoringRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...geminiContents, { text: scoringPrompt }],
    });
    let scoring = tryFixJson(scoringRes.text);
    if (!scoring) {
      // fallback: try to extract fields manually
      scoring = { TR: null, CC: null, LR: null, GR: null, TR_reason: '', CC_reason: '', LR_reason: '', GR_reason: '' };
    }

    // Calculate average score from 4 criteria, rounded to nearest 0.5
    function safeNum(val) {
      const n = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(n) ? 0 : n;
      }
      const tr = safeNum(scoring.TR);
      const cc = safeNum(scoring.CC);
      const lr = safeNum(scoring.LR);
      const gr = safeNum(scoring.GR);
      let avg = (tr + cc + lr + gr) / 4;
      // Round to nearest 0.5 (can be 0.5 or 1 but not 0.25)
      avg = Math.round(avg * 2) / 2;

    // 2. Correction/model answer call
    const correctionPrompt = buildCorrectionPrompt({ band, part, question, answer });
    const correctionRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...geminiContents, { text: correctionPrompt }],
    });
    let correctionData = tryFixJson(correctionRes.text);
    if (!correctionData) {
      correctionData = { correction: correctionRes.text, modelAnswer: '' };
    }

    res.json({
      score: avg,
      TR: scoring.TR,
      CC: scoring.CC,
      LR: scoring.LR,
      GR: scoring.GR,
      TR_reason: scoring.TR_reason,
      CC_reason: scoring.CC_reason,
      LR_reason: scoring.LR_reason,
      GR_reason: scoring.GR_reason,
      correction: correctionData.correction,
      modelAnswer: correctionData.modelAnswer,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to evaluate answer', details: err.message });
  }
});

app.post('/chat-assist', async (req, res) => {
  try {
    const { message } = req.body;
    const prompt = `You are an expert IELTS Writing assistant. Help the user with any questions, brainstorming, or clarifications about IELTS writing. Be concise, supportive, and creative.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: prompt },
        { text: message }
      ],
    });
    res.json({ reply: response.text });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get chat response', details: err.message });
  }
});

module.exports = app; 