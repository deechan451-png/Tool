/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import JSZip from "jszip";
import dotenv from "dotenv";
import { pythonWorkspaceFiles } from "./src/python_template.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Parse json payloads
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Lazy initialize OpenAI client
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY is missing from environment variables. Configure it in the Settings panel.");
    }
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

// Logs simulation cache
const systemLogs: string[] = [
  "[2026-07-14 09:00:00] INFO [logger:15] - Logging initialized. Writing logs to logs/translator.log",
  "[2026-07-14 09:00:01] INFO [main:45] - Khmer AI Movie Translator Pro - Phase 1 CLI Started",
  "[2026-07-14 09:00:02] INFO [ffmpeg_helper:22] - FFmpeg binary validation: ffmpeg=True, ffprobe=True",
  "[2026-07-14 09:00:03] INFO [config:55] - Configuration settings loaded successfully from config.yaml",
];

function addSystemLog(level: string, message: string) {
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  systemLogs.push(`[${now}] ${level.toUpperCase()} - ${message}`);
  if (systemLogs.length > 100) {
    systemLogs.shift();
  }
}

// 1. Core API: Translation proxy endpoint using Gemini or OpenAI
app.post("/api/translate-subtitle", async (req, res) => {
  const { srtText, targetLanguage = "Khmer", systemInstruction, temperature = 0.3, apiProvider = "gemini", modelName } = req.body;

  if (!srtText) {
    return res.status(400).json({ error: "Missing srtText in request body" });
  }

  addSystemLog("INFO", `Submitting subtitle segment to translation pipeline. Provider: ${apiProvider}, Target: ${targetLanguage}`);

  const defaultInstruction =
    "You are an expert film localizer and subtitle translator. Convert subtitles accurately into the target language. Keep the original formatting, indexes, and timing lines (timestamps) exactly. Output ONLY the translated subtitles without introductory notes or footnotes.";

  try {
    const prompt = `Please translate the following subtitle sequence into ${targetLanguage}. Maintain indices and exact timestamps intact. Keep layout formatting. Subtitle Text:\n\n${srtText}`;
    let translatedText = "";

    if (apiProvider === "openai") {
      const oai = getOpenAI();
      const model = modelName || "gpt-4o-mini";
      addSystemLog("INFO", `Calling OpenAI model ${model} for translation.`);
      const response = await oai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemInstruction || defaultInstruction },
          { role: "user", content: prompt }
        ],
        temperature: temperature,
      });
      translatedText = response.choices[0]?.message?.content || "";
    } else {
      const model = modelName || "gemini-3.5-flash";
      addSystemLog("INFO", `Calling Gemini model ${model} for translation.`);
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || defaultInstruction,
          temperature: temperature,
        },
      });
      translatedText = response.text || "";
    }

    addSystemLog("INFO", `Subtitle batch translated successfully by ${apiProvider.toUpperCase()} API.`);
    res.json({ translatedText });
  } catch (err: any) {
    addSystemLog("ERROR", `Subtitle translation failure using ${apiProvider.toUpperCase()}: ${err.message}`);
    res.status(500).json({ error: err.message || `Failed to translate subtitles using ${apiProvider}` });
  }
});

// 2. Core API: Text-to-speech voice generation using Gemini TTS
app.post("/api/synthesize-speech", async (req, res) => {
  const { text, voiceName = "Kore" } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Missing text to synthesize" });
  }

  addSystemLog("INFO", `Generating Khmer voice synthesis for sequence using voice model ${voiceName}`);

  try {
    // Call Gemini 3.1 TTS model as guided by the gemini-api skill
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say naturally and clearly in Khmer: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      addSystemLog("WARNING", "Gemini TTS returned empty audio payload. Falling back to simulated text speech.");
      return res.status(200).json({ audio: null });
    }

    addSystemLog("INFO", "Speech audio sequence successfully synthesized.");
    res.json({ audio: base64Audio });
  } catch (err: any) {
    addSystemLog("WARNING", `Gemini TTS failed: ${err.message}. Custom synthetic fallback will be applied.`);
    // Since some free keys may limit TTS access, return null to let the frontend fall back gracefully to Web Speech Synthesis API
    res.json({ audio: null, warning: err.message });
  }
});

// 3. Core API: Download Python Project Archive (.zip)
app.get("/api/download-python-project", async (req, res) => {
  addSystemLog("INFO", "Packaging Python 3.12 workspace foundation ZIP archive.");
  try {
    const zip = new JSZip();

    // Loop and add files to ZIP
    for (const file of pythonWorkspaceFiles) {
      // Ensure clean directories if needed
      zip.file(file.path, file.content);
    }

    // Generate buffer
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    res.setHeader("Content-Disposition", "attachment; filename=khmer_ai_movie_translator_pro_phase1.zip");
    res.setHeader("Content-Type", "application/zip");
    res.send(buffer);
    addSystemLog("INFO", "Python workspace ZIP bundle downloaded successfully.");
  } catch (err: any) {
    addSystemLog("ERROR", `Failed to generate ZIP bundle: ${err.message}`);
    res.status(500).json({ error: "Could not bundle Python project. Please inspect individual workspace file blocks instead." });
  }
});

// 3.5 Core API: Get raw Python workspace files JSON
app.get("/api/python-files", (req, res) => {
  res.json({ files: pythonWorkspaceFiles });
});

// 4. Auxiliary API: Query Simulator logs
app.get("/api/system-logs", (req, res) => {
  res.json({ logs: systemLogs });
});

// 5. Auxiliary API: Trigger test logger action
app.post("/api/trigger-log", (req, res) => {
  const { level = "info", message } = req.body;
  if (message) {
    addSystemLog(level, message);
  }
  res.json({ success: true });
});

// 6. Auxiliary API: Simulate FFmpeg/FFprobe binary detection
app.post("/api/verify-ffmpeg", (req, res) => {
  const { ffmpegPath, ffprobePath } = req.body;
  addSystemLog("INFO", `Executing FFmpeg diagnostics on target directories: [${ffmpegPath || "DEFAULT PATH"}]`);

  const ffmpegOk = true;
  const ffprobeOk = true;

  addSystemLog("INFO", `FFmpeg check outcome: ffmpeg_ok=${ffmpegOk}, ffprobe_ok=${ffprobeOk}`);
  res.json({
    ffmpegOk,
    ffprobeOk,
    version: "ffmpeg version 7.0.1-essentials_build-www.gyan.dev Copyright (c) 2000-2026 the FFmpeg developers",
    codecSupport: ["libmp3lame", "libx264", "aac", "opus", "subrip"],
  });
});

// Integrate Express + Vite Middleware
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Khmer AI Movie Translator Pro running on http://localhost:${PORT}`);
  });
}

startServer();
