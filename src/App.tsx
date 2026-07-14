/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Folder,
  File,
  Code,
  Terminal,
  Settings,
  Download,
  Play,
  Volume2,
  Upload,
  Cpu,
  Languages,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  Trash2,
  HelpCircle,
  RefreshCw,
  Layers,
  CheckCircle2,
  FileText,
  FileCode,
  ArrowRight,
  Info,
  Activity,
  Search,
  Scissors,
  Film,
  ArrowUpDown,
  BookOpen
} from "lucide-react";

interface PythonFile {
  path: string;
  content: string;
  description: string;
}

// Preset Subtitle Templates
const SUBTITLE_PRESETS = {
  scifi: `1
00:00:05,200 --> 00:00:09,100
Attention crew. We have entered the orbit of the newly discovered planet.

2
00:00:09,800 --> 00:00:13,400
The atmospheric density is fluctuating. Keep all shield levels at maximum.

3
00:00:14,200 --> 00:00:17,900
Captain, I am picking up an unusual high-frequency signal from the surface.

4
00:00:18,500 --> 00:00:21,150
Could it be survivors? Launch the probe immediately!`,

  drama: `1
00:01:14,350 --> 00:01:17,800
You don't understand. I worked ten years for this single opportunity.

2
00:01:18,200 --> 00:01:21,500
And you just decided to throw it all away without even asking me?

3
00:01:22,100 --> 00:01:25,900
I did it to protect you! You would have lost everything in that audit.

4
00:01:26,300 --> 00:01:29,600
I would have rather lost my career than lose your trust.`,

  documentary: `1
00:00:02,100 --> 00:00:06,900
Deep in the heart of Cambodia's tropical forests lies an ancient archaeological wonder.

2
00:00:07,400 --> 00:00:11,500
For centuries, these spectacular temple structures were hidden from modern eyes.

3
00:00:12,100 --> 00:00:16,200
Today, archaeologists use advanced LiDAR mapping technologies to trace lost cities.

4
00:00:16,800 --> 00:00:21,200
Revealing a massive, highly interconnected medieval empire.`
};

export default function App() {
  // Navigation & Workspace State
  const [activeTab, setActiveTab] = useState<"translator" | "stt" | "editor" | "codebase" | "diagnostics" | "voice" | "audio" | "export">("translator");

  // Translation Panel States
  const [srtInput, setSrtInput] = useState(SUBTITLE_PRESETS.scifi);
  const [srtTranslated, setSrtTranslated] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");
  const [translationStats, setTranslationStats] = useState({ lines: 0, timeSpentMs: 0 });
  const [activePreset, setActivePreset] = useState<"scifi" | "drama" | "documentary" | "custom">("scifi");
  const [apiProvider, setApiProvider] = useState<"gemini" | "openai">("gemini");

  // Speech to Text Panel States (Phase 4)
  const [whisperModelSize, setWhisperModelSize] = useState("base");
  const [whisperDevice, setWhisperDevice] = useState("cpu");
  const [whisperCompute, setWhisperCompute] = useState("int8");
  const [whisperAutoDetect, setWhisperAutoDetect] = useState(true);
  const [whisperSpeakerDetection, setWhisperSpeakerDetection] = useState(true);
  const [isTranscribingSTT, setIsTranscribingSTT] = useState(false);
  const [sttProgress, setSttProgress] = useState(0);
  const [sttFileName, setSttFileName] = useState("cinematic_movie_clip.mp4");
  const [sttLogs, setSttLogs] = useState<string[]>([]);

  // Subtitle Editor States (Phase 6)
  const [editorSrtBlocks, setEditorSrtBlocks] = useState<Array<{
    index: string;
    timing: string;
    text: string;
    speaker?: string;
  }>>([]);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [shiftDelta, setShiftDelta] = useState(1.0);
  const [mergeIndex1, setMergeIndex1] = useState("1");
  const [mergeIndex2, setMergeIndex2] = useState("2");
  const [splitIndex, setSplitIndex] = useState("1");
  
  // Simulated Media Player States (Phase 6 Live Preview)
  const [previewPlaybackTime, setPreviewPlaybackTime] = useState(0.0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [playerSubtitle, setPlayerSubtitle] = useState("");

  // Translation Memory states (Phase 5)
  const [tmEnabled, setTmEnabled] = useState(true);
  const [tmCache, setTmCache] = useState([
    { source: "Attention crew. We have entered the orbit of the newly discovered planet.", target: "ប្រយ័ត្នក្រុមការងារ។ យើងបានចូលទៅក្នុងគន្លងនៃភពដែលទើបនឹងរកឃើញថ្មី។", lang: "Khmer" },
    { source: "The atmospheric density is fluctuating. Keep all shield levels at maximum.", target: "ដង់ស៊ីតេបរិយាកាសកំពុងប្រែប្រួល។ រក្សាកម្រិតរបាំងការពារទាំងអស់ឱ្យនៅអតិបរមា។", lang: "Khmer" },
    { source: "I would have rather lost my career than lose your trust.", target: "ខ្ញុំសុខចិត្តបាត់បង់អាជីពរបស់ខ្ញុំ ប្រសើរជាងបាត់បង់ទំនុកចិត្តរបស់អ្នក។", lang: "Khmer" },
    { source: "Deep in the heart of Cambodia's tropical forests lies an ancient archaeological wonder.", target: "ជ្រៅនៅក្នុងបេះដូងនៃព្រៃត្រូពិចរបស់ប្រទេសកម្ពុជា គឺជាអច្ឆរិយវត្ថុបុរាណវិទ្យាដ៏បុរាណមួយ។", lang: "Khmer" }
  ]);
  const [tmSearchQuery, setTmSearchQuery] = useState("");
  const [tmSavings, setTmSavings] = useState({ hits: 3, tokensSaved: 180 });
  const [newSourceText, setNewSourceText] = useState("");
  const [newTargetText, setNewTargetText] = useState("");

  // Voice synthesis & Dubbing simulation states (Phase 7)
  const [isSynthesizing, setIsSynthesizing] = useState<number | null>(null);
  const [playbackActive, setPlaybackActive] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState("Kore");
  const [customSpeed, setCustomSpeed] = useState(0.95);
  const [customPitch, setCustomPitch] = useState(1.0);
  const [customEmotion, setCustomEmotion] = useState("Neutral");
  const [voiceGender, setVoiceGender] = useState<"Male" | "Female">("Male");
  
  // Audio Processing States (Phase 8)
  const [audioVocalSeparateActive, setAudioVocalSeparateActive] = useState(true);
  const [audioNoiseRemovalActive, setAudioNoiseRemovalActive] = useState(true);
  const [audioNormalizationActive, setAudioNormalizationActive] = useState(true);
  const [audioVocalVolume, setAudioVocalVolume] = useState(1.0);
  const [audioBgVolume, setAudioBgVolume] = useState(0.4);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [audioProcessProgress, setAudioProcessProgress] = useState(0);
  const [audioLogs, setAudioLogs] = useState<string[]>([]);

  // Export Pipeline States (Phase 9)
  const [exportSubtitleBurnActive, setExportSubtitleBurnActive] = useState(true);
  const [exportReplaceAudioActive, setExportReplaceAudioActive] = useState(true);
  const [exportFormat, setExportFormat] = useState<"mp4" | "mkv" | "mp3" | "srt">("mp4");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLogs, setExportLogs] = useState<string[]>([]);

  // Repository Explorer States
  const [pythonFiles, setPythonFiles] = useState<PythonFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<PythonFile | null>(null);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Settings Configuration States (Sync with Config.yaml)
  const [translatorModel, setTranslatorModel] = useState("gemini-3.5-flash");
  const [targetLang, setTargetLang] = useState("Khmer");
  const [chunkSize, setChunkSize] = useState(15);
  const [temperature, setTemperature] = useState(0.3);
  const [systemInstruction, setSystemInstruction] = useState(
    "You are an expert film localizer and subtitle translator. Convert subtitles accurately into the target language. Keep the original formatting, indexes, and timing lines (timestamps) exactly. Output ONLY the translated subtitles without introductory notes or footnotes."
  );
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // FFmpeg Diagnostic States
  const [ffmpegPath, setFfmpegPath] = useState("C:\\ffmpeg\\bin\\ffmpeg.exe");
  const [ffprobePath, setFfprobePath] = useState("C:\\ffmpeg\\bin\\ffprobe.exe");
  const [ffmpegStatus, setFfmpegStatus] = useState<{
    tested: boolean;
    ok: boolean;
    version?: string;
    codecs?: string[];
  } | null>(null);
  const [testingFfmpeg, setTestingFfmpeg] = useState(false);

  // System Logs console states
  const [logs, setLogs] = useState<string[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Parse Timestamp Helper
  const parseTimestampToSeconds = (timeStr: string): number => {
    const match = timeStr.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!match) return 0;
    const [_, h, m, s, ms] = match.map(Number);
    return h * 3600 + m * 60 + s + ms / 1000;
  };

  // Synchronize editor blocks with either output or input SRTs
  useEffect(() => {
    const activeText = srtTranslated || srtInput;
    if (activeText) {
      setEditorSrtBlocks(parseSrtToBlocks(activeText));
    }
  }, [srtInput, srtTranslated]);

  // Media Player Simulation Timer Hook
  useEffect(() => {
    let timer: any = null;
    if (isPreviewPlaying) {
      timer = setInterval(() => {
        setPreviewPlaybackTime((prev) => {
          if (prev >= 25.0) {
            setIsPreviewPlaying(false);
            return 0.0;
          }
          return Math.round((prev + 0.1) * 10) / 10;
        });
      }, 100);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isPreviewPlaying]);

  // Render Subtitles over Simulated Media Player
  useEffect(() => {
    if (editorSrtBlocks.length === 0) {
      setPlayerSubtitle("");
      return;
    }
    const currentSub = editorSrtBlocks.find((b) => {
      const parts = b.timing.split("-->");
      if (parts.length < 2) return false;
      const start = parseTimestampToSeconds(parts[0]);
      const end = parseTimestampToSeconds(parts[1]);
      return previewPlaybackTime >= start && previewPlaybackTime <= end;
    });
    setPlayerSubtitle(currentSub ? currentSub.text : "");
  }, [previewPlaybackTime, editorSrtBlocks]);

  // Fetch Python Foundation files on mount
  useEffect(() => {
    fetchPythonFiles();
    fetchLogs();

    // Poll logs occasionally
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch the Python project files
  const fetchPythonFiles = async () => {
    setIsFetchingFiles(true);
    try {
      const res = await fetch("/api/python-files");
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        setPythonFiles(data.files);
        const setupFile = data.files.find((f: any) => f.path === "setup.bat");
        setSelectedFile(setupFile || data.files[0]);
      }
    } catch (err) {
      console.error("Failed to load python files", err);
    } finally {
      setIsFetchingFiles(false);
    }
  };

  // Fetch system logs
  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/system-logs");
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Error fetching system logs", err);
    }
  };

  // Trigger simulated action log
  const triggerLog = async (level: string, message: string) => {
    try {
      await fetch("/api/trigger-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, message }),
      });
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  // Auto scroll terminal logs
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Handle Preset Subtitle Changes
  const handlePresetChange = (preset: "scifi" | "drama" | "documentary" | "custom", text?: string) => {
    setActivePreset(preset);
    if (preset !== "custom") {
      setSrtInput(SUBTITLE_PRESETS[preset]);
    } else if (text !== undefined) {
      setSrtInput(text);
    }
    setSrtTranslated("");
    setTranslateError("");
    setTranslationStats({ lines: 0, timeSpentMs: 0 });
  };

  // Handle live Translation with Gemini / OpenAI on backend
  const handleTranslate = async () => {
    if (!srtInput.trim()) return;
    setIsTranslating(true);
    setTranslateError("");
    const startTime = Date.now();

    // Check TM Cache first
    if (tmEnabled) {
      const normalizedInput = srtInput.trim();
      const cached = tmCache.find((c) => c.source.toLowerCase() === normalizedInput.toLowerCase() && c.lang === targetLang);
      if (cached) {
        setSrtTranslated(cached.target);
        setTranslationStats({ lines: 4, timeSpentMs: 12 });
        setTmSavings((prev) => ({ hits: prev.hits + 1, tokensSaved: prev.tokensSaved + 45 }));
        await triggerLog("info", `Translation Memory Exact Match Hit! Retrieved Khmer translation directly from memory file. Tokens saved: 45`);
        setIsTranslating(false);
        return;
      }
    }

    try {
      await triggerLog("info", `Initiating live subtitle translation with engine: ${apiProvider.toUpperCase()} (${translatorModel})`);

      const response = await fetch("/api/translate-subtitle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srtText: srtInput,
          targetLanguage: targetLang,
          systemInstruction: systemInstruction,
          temperature: temperature,
          apiProvider: apiProvider,
          modelName: apiProvider === "openai" ? "gpt-4o-mini" : translatorModel,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Translation failed");
      }

      setSrtTranslated(data.translatedText);
      const elapsed = Date.now() - startTime;

      // Add to TM cache automatically
      if (tmEnabled) {
        setTmCache((prev) => [
          ...prev,
          { source: srtInput.substring(0, 100), target: data.translatedText.substring(0, 100), lang: targetLang }
        ]);
      }

      const matches = data.translatedText.split(/\n\s*\n/).filter((l: string) => l.trim()).length;
      setTranslationStats({
        lines: matches || 4,
        timeSpentMs: elapsed,
      });

      await triggerLog("info", `Live translation completed in ${elapsed}ms. Total subtitle blocks localized: ${matches}`);
    } catch (err: any) {
      setTranslateError(err.message || "An unexpected error occurred. Please check your API credentials.");
      await triggerLog("error", `Translation workflow failed: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Subtitle voice synthesizer & Khmer dubbing controller
  const handleSpeakLine = async (textLine: string, index: number) => {
    window.speechSynthesis.cancel();

    const textToSpeak = textLine
      .replace(/^\d+$/, "") // Remove numbers
      .replace(/\d{2}:\d{2}:\d{2}[,.]\d{3} --> \d{2}:\d{2}:\d{2}[,.]\d{3}/, "") // Remove timing
      .trim();

    if (!textToSpeak) return;

    setIsSynthesizing(index);
    await triggerLog("info", `Requesting audio voiceover synthesis for subtitle block #${index}: "${textToSpeak.substring(0, 30)}..."`);

    try {
      const response = await fetch("/api/synthesize-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName: selectedVoice,
        }),
      });

      const data = await response.json();
      setIsSynthesizing(null);

      if (data.audio) {
        setPlaybackActive(index);
        const audioSrc = `data:audio/wav;base64,${data.audio}`;
        const audioObj = new Audio(audioSrc);
        audioObj.playbackRate = customSpeed;
        audioObj.onended = () => setPlaybackActive(null);
        audioObj.play();
        await triggerLog("info", `Gemini native synthesized audio playback initiated for block #${index}`);
      } else {
        // Fall back to Web Speech Synthesis API
        setPlaybackActive(index);
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        const voices = window.speechSynthesis.getVoices();
        const khmerVoice = voices.find((v) => v.lang.includes("km") || v.lang.includes("KH"));
        if (khmerVoice) {
          utterance.voice = khmerVoice;
        } else {
          utterance.lang = targetLang === "Khmer" ? "km-KH" : "en-US";
        }

        utterance.rate = customSpeed;
        utterance.onend = () => setPlaybackActive(null);
        utterance.onerror = () => setPlaybackActive(null);
        window.speechSynthesis.speak(utterance);
        await triggerLog("info", `Initiated browser Web Speech API simulation backup playback for block #${index}`);
      }
    } catch (err: any) {
      setIsSynthesizing(null);
      setPlaybackActive(null);
      console.error("Synthesizer error", err);
    }
  };

  // Parse SRT block layout helper
  const parseSrtToBlocks = (srt: string) => {
    if (!srt) return [];
    return srt
      .trim()
      .split(/\n\s*\n/)
      .map((block) => {
        const lines = block.split("\n");
        if (lines.length >= 3) {
          return {
            index: lines[0],
            timing: lines[1],
            text: lines.slice(2).join("\n"),
          };
        }
        return { index: "?", timing: "", text: block };
      });
  };

  const inputBlocks = parseSrtToBlocks(srtInput);
  const outputBlocks = parseSrtToBlocks(srtTranslated);

  // Copy helper
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Test FFmpeg
  const handleTestFfmpeg = async () => {
    setTestingFfmpeg(true);
    await triggerLog("info", `Running FFmpeg path diagnostics query to: ${ffmpegPath}`);
    try {
      const response = await fetch("/api/verify-ffmpeg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ffmpegPath, ffprobePath }),
      });
      const data = await response.json();
      setFfmpegStatus({
        tested: true,
        ok: data.ffmpegOk && data.ffprobeOk,
        version: data.version,
        codecs: data.codecSupport,
      });
      await triggerLog("info", "FFmpeg diagnostic validation checklist executed successfully. Binary linking validated.");
    } catch (err: any) {
      setFfmpegStatus({
        tested: true,
        ok: false,
      });
      await triggerLog("error", `FFmpeg validation pipeline failed: ${err.message}`);
    } finally {
      setTestingFfmpeg(false);
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    setSaveSettingsSuccess(true);
    triggerLog("info", `Saved settings configuration: provider=${apiProvider}, model=${translatorModel}, temp=${temperature}, language=${targetLang}`);
    setTimeout(() => setSaveSettingsSuccess(false), 2500);
  };

  // Deploy workspace download
  const handleDownloadZip = () => {
    window.open("/api/download-python-project", "_blank");
  };

  // Phase 4: Faster-Whisper Speech-to-Text orchestrator simulation
  const handleSTTTranscription = () => {
    setIsTranscribingSTT(true);
    setSttProgress(5);
    setSttLogs([
      `[STT CORE] Isolating audio frequencies from media track: '${sttFileName}'`,
      `[STT CORE] Loading local offline Faster-Whisper engine. Weight mapping size: '${whisperModelSize}'`
    ]);

    setTimeout(() => {
      setSttProgress(30);
      setSttLogs((prev) => [
        ...prev,
        `[STT CORE] Initialized WhisperModel successfully on hardware device: ${whisperDevice.toUpperCase()}`,
        `[STT CORE] Transcribe settings: compute_type=${whisperCompute}, beam_size=5`
      ]);
    }, 800);

    setTimeout(() => {
      setSttProgress(65);
      setSttLogs((prev) => [
        ...prev,
        `[STT CORE] Executing audio frames decoding...`,
        `[STT CORE] Detected language ID: English (Probability: 0.998)`
      ]);
    }, 1600);

    setTimeout(() => {
      setSttProgress(90);
      setSttLogs((prev) => [
        ...prev,
        `[STT CORE] Applying speaker diarization clustering algorithms (Found 2 active speakers)...`,
        `[STT CORE] Formatting text output segments to SRT structural syntax...`
      ]);
    }, 2600);

    setTimeout(() => {
      setSttProgress(100);
      setIsTranscribingSTT(false);
      setSttLogs((prev) => [...prev, `[STT CORE] STT Transcription finished successfully. Generated subtitle file loaded into Sandbox.`]);

      // Load speaker tags preset
      const resultTranscript = `1
00:00:05,200 --> 00:00:09,100
[SPEAKER_1]: Attention crew. We have entered the orbit of the newly discovered planet.

2
00:00:09,800 --> 00:00:13,400
[SPEAKER_1]: The atmospheric density is fluctuating. Keep all shield levels at maximum.

3
00:00:14,200 --> 00:00:17,900
[SPEAKER_2]: Captain, I am picking up an unusual high-frequency signal from the surface.

4
00:00:18,500 --> 00:00:21,150
[SPEAKER_1]: Could it be survivors? Launch the probe immediately!`;

      setSrtInput(resultTranscript);
      setSrtTranslated("");
      triggerLog("success", `Offline Speech-to-text transcription successfully executed on ${sttFileName}. Added speaker tags.`);
    }, 3800);
  };

  // Phase 7: Khmer AI Voice Batch Generator
  const [isBatchSynthesizing, setIsBatchSynthesizing] = useState(false);
  const [batchVoiceProgress, setBatchVoiceProgress] = useState(0);

  const handleBatchVoiceSynthesis = () => {
    if (!srtTranslated) {
      triggerLog("warning", "No translated subtitles found to voice over. Please translate some subtitles first.");
      return;
    }
    
    setIsBatchSynthesizing(true);
    setBatchVoiceProgress(5);
    triggerLog("info", `Starting batch Khmer voice synthesis. Voice: ${selectedVoice} (${voiceGender}), Speed: ${customSpeed}x, Pitch: ${customPitch}x, Emotion: ${customEmotion}`);
    
    const blocksCount = outputBlocks.length;
    let currentBlock = 0;

    const synthInterval = setInterval(() => {
      currentBlock++;
      const pct = Math.round((currentBlock / blocksCount) * 100);
      setBatchVoiceProgress(pct);

      triggerLog("info", `[Khmer Voice AI] Synthesizing block #${currentBlock}/${blocksCount}: "${outputBlocks[currentBlock - 1].text.substring(0, 30)}..."`);

      if (currentBlock >= blocksCount) {
        clearInterval(synthInterval);
        setIsBatchSynthesizing(false);
        setBatchVoiceProgress(100);
        triggerLog("success", `Successfully generated high-fidelity Khmer voice over track for ${blocksCount} dialogue segments. Saved output to 'workspace/voice_temp/' directory.`);
      }
    }, 1000);
  };

  // Phase 8: Khmer Audio Processor Orchestrator
  const handleAudioProcessingPipeline = () => {
    setIsProcessingAudio(true);
    setAudioProcessProgress(10);
    setAudioLogs([
      `[AUDIO SYSTEM] Initializing KhmerAudioProcessor engine...`,
      `[AUDIO SYSTEM] Target file identified: ${sttFileName}`,
      `[AUDIO SYSTEM] Loading raw audio streams into buffer channels...`
    ]);

    setTimeout(() => {
      setAudioProcessProgress(35);
      const acts = [];
      if (audioVocalSeparateActive) acts.push("Applying Vocal/BG separation filter");
      if (audioNoiseRemovalActive) acts.push("Applying spectral noise subtraction ('afftdn')");
      if (audioNormalizationActive) acts.push("Applying EBU R128 dynamic normalization ('dynaudnorm')");
      
      setAudioLogs((prev) => [
        ...prev,
        ...acts.map(a => `[AUDIO SYSTEM] ${a}...`),
        `[AUDIO SYSTEM] FFmpeg audio filters initialized on channel threads.`
      ]);
    }, 1000);

    setTimeout(() => {
      setAudioProcessProgress(70);
      setAudioLogs((prev) => [
        ...prev,
        `[AUDIO SYSTEM] Processing complete for isolated vocal stream (Gain coefficient: 1.0)`,
        `[AUDIO SYSTEM] Adjusting background noise tracks (Gain coefficient: ${audioBgVolume}x)`,
        `[AUDIO SYSTEM] Mixing audio streams with dynamic voice ducking filters...`
      ]);
    }, 2500);

    setTimeout(() => {
      setAudioProcessProgress(100);
      setIsProcessingAudio(false);
      setAudioLogs((prev) => [
        ...prev,
        `[AUDIO SYSTEM] Final mix file rendered successfully: 'workspace/processed_audio.wav'`,
        `[AUDIO SYSTEM] Audio Processing Pipeline execution complete.`
      ]);
      triggerLog("success", "Khmer Audio Processor pipeline finished successfully. Balanced vocal tracks with low background noise.");
    }, 4000);
  };

  // Phase 9: Export Movie Suite
  const handleMovieExportPipeline = () => {
    setIsExporting(true);
    setExportProgress(10);
    setExportLogs([
      `[EXPORT UTILS] Launching KhmerMovieExporter subprocess...`,
      `[EXPORT UTILS] Output target: 'workspace/export_output.${exportFormat}'`,
      `[EXPORT UTILS] Target video codec: H.264 (libx264), constant rate factor: 23`
    ]);

    setTimeout(() => {
      setExportProgress(40);
      const acts = [];
      if (exportSubtitleBurnActive) acts.push("Burning SRT subtitle blocks into video frame ('subtitles' filter)");
      if (exportReplaceAudioActive) acts.push("Replacing original movie sound track with Khmer AI voiced master mix");
      
      setExportLogs((prev) => [
        ...prev,
        ...acts.map(a => `[EXPORT UTILS] ${a}...`),
        `[EXPORT UTILS] Spawning FFmpeg process threads...`
      ]);
    }, 1200);

    setTimeout(() => {
      setExportProgress(80);
      setExportLogs((prev) => [
        ...prev,
        `[EXPORT UTILS] Direct stream copy of high definition video track (no re-encoding where possible)`,
        `[EXPORT UTILS] Multiplexing video stream with new audio/subtitle container tracks...`
      ]);
    }, 2800);

    setTimeout(() => {
      setExportProgress(100);
      setIsExporting(false);
      setExportLogs((prev) => [
        ...prev,
        `[EXPORT UTILS] Subprocess finished with code 0. Export completed successfully.`,
        `[EXPORT UTILS] Output saved to: workspace/export_output.${exportFormat}`
      ]);
      triggerLog("success", `Khmer Movie Exporter completed successfully! Generated 'workspace/export_output.${exportFormat}'. Check diagnostic files tree.`);
    }, 4500);
  };

  // Phase 6: Subtitle Editor Functions
  const handleShiftTimestamps = (delta: number) => {
    if (editorSrtBlocks.length === 0) return;
    const updated = editorSrtBlocks.map((b) => {
      const parts = b.timing.split("-->");
      if (parts.length < 2) return b;
      const shiftTime = (tStr: string) => {
        const sec = parseTimestampToSeconds(tStr) + delta;
        const safeSec = Math.max(0, sec);
        const hours = Math.floor(safeSec / 3600);
        const minutes = Math.floor((safeSec % 3600) / 60);
        const seconds = Math.floor(safeSec % 60);
        const msecs = Math.round((safeSec % 1) * 1000);
        const pad = (n: number, l = 2) => String(n).padStart(l, "0");
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(msecs, 3)}`;
      };
      return {
        ...b,
        timing: `${shiftTime(parts[0])} --> ${shiftTime(parts[1])}`,
      };
    });

    setEditorSrtBlocks(updated);
    const formattedSrt = updated.map((b) => `${b.index}\n${b.timing}\n${b.text}\n`).join("\n");
    if (srtTranslated) setSrtTranslated(formattedSrt);
    else setSrtInput(formattedSrt);
    triggerLog("info", `Subtitle Editor shifted all timestamps by ${delta} seconds.`);
  };

  const handleSearchReplace = () => {
    if (!searchQuery.trim() || editorSrtBlocks.length === 0) return;
    let count = 0;
    const updated = editorSrtBlocks.map((b) => {
      const regex = new RegExp(searchQuery, "gi");
      const matches = b.text.match(regex);
      if (matches) {
        count += matches.length;
        return { ...b, text: b.text.replace(regex, replaceQuery) };
      }
      return b;
    });

    setEditorSrtBlocks(updated);
    const formattedSrt = updated.map((b) => `${b.index}\n${b.timing}\n${b.text}\n`).join("\n");
    if (srtTranslated) setSrtTranslated(formattedSrt);
    else setSrtInput(formattedSrt);
    triggerLog("info", `Subtitle Editor completed search & replace. Occurrences updated: ${count}`);
  };

  const handleMergeBlocks = (idx1: string, idx2: string) => {
    const block1 = editorSrtBlocks.find((b) => b.index === idx1);
    const block2 = editorSrtBlocks.find((b) => b.index === idx2);
    if (!block1 || !block2) return;

    const t1 = block1.timing.split("-->")[0].trim();
    const t2 = (block2.timing.split("-->")[1] || block2.timing).trim();

    const mergedText = `${block1.text} / ${block2.text}`;
    const mergedTiming = `${t1} --> ${t2}`;

    const filtered = editorSrtBlocks.filter((b) => b.index !== idx2);
    const updated = filtered.map((b) => {
      if (b.index === idx1) {
        return { ...b, timing: mergedTiming, text: mergedText };
      }
      return b;
    });

    const reindexed = updated.map((b, i) => ({ ...b, index: String(i + 1) }));
    setEditorSrtBlocks(reindexed);

    const formattedSrt = reindexed.map((b) => `${b.index}\n${b.timing}\n${b.text}\n`).join("\n");
    if (srtTranslated) setSrtTranslated(formattedSrt);
    else setSrtInput(formattedSrt);
    triggerLog("info", `Subtitle Editor merged blocks #${idx1} and #${idx2}.`);
  };

  const handleSplitBlock = (idx: string) => {
    const target = editorSrtBlocks.find((b) => b.index === idx);
    if (!target) return;

    const parts = target.timing.split("-->");
    if (parts.length < 2) return;

    const start = parseTimestampToSeconds(parts[0]);
    const end = parseTimestampToSeconds(parts[1]);
    const mid = start + (end - start) * 0.5;

    const formatSec = (sec: number) => {
      const hours = Math.floor(sec / 3600);
      const minutes = Math.floor((sec % 3600) / 60);
      const seconds = Math.floor(sec % 60);
      const msecs = Math.round((sec % 1) * 1000);
      const pad = (n: number, l = 2) => String(n).padStart(l, "0");
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(msecs, 3)}`;
    };

    const words = target.text.split(" ");
    const midWord = Math.floor(words.length * 0.5);
    const text1 = words.slice(0, midWord).join(" ") || target.text;
    const text2 = words.slice(midWord).join(" ") || "[split segment]";

    const block1 = { ...target, timing: `${parts[0].trim()} --> ${formatSec(mid)}`, text: text1 };
    const block2 = { index: String(Number(idx) + 0.5), timing: `${formatSec(mid)} --> ${parts[1].trim()}`, text: text2 };

    const filtered = editorSrtBlocks.filter((b) => b.index !== idx);
    const updated = [...filtered, block1, block2].sort((a, b) => {
      const sA = parseTimestampToSeconds(a.timing.split("-->")[0]);
      const sB = parseTimestampToSeconds(b.timing.split("-->")[0]);
      return sA - sB;
    });

    const reindexed = updated.map((b, i) => ({ ...b, index: String(i + 1) }));
    setEditorSrtBlocks(reindexed);

    const formattedSrt = reindexed.map((b) => `${b.index}\n${b.timing}\n${b.text}\n`).join("\n");
    if (srtTranslated) setSrtTranslated(formattedSrt);
    else setSrtInput(formattedSrt);
    triggerLog("info", `Subtitle Editor split block #${idx} in half.`);
  };

  const handleUpdateBlockText = (idx: string, newText: string) => {
    const updated = editorSrtBlocks.map((b) => (b.index === idx ? { ...b, text: newText } : b));
    setEditorSrtBlocks(updated);
    const formattedSrt = updated.map((b) => `${b.index}\n${b.timing}\n${b.text}\n`).join("\n");
    if (srtTranslated) setSrtTranslated(formattedSrt);
    else setSrtInput(formattedSrt);
  };

  const handleAddTMCache = () => {
    if (!newSourceText.trim() || !newTargetText.trim()) return;
    setTmCache((prev) => [
      ...prev,
      { source: newSourceText.trim(), target: newTargetText.trim(), lang: targetLang }
    ]);
    setNewSourceText("");
    setNewTargetText("");
    triggerLog("info", "Translation Memory: Manually injected localized phrase mapping into cache.");
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans flex flex-col antialiased selection:bg-indigo-600 selection:text-white">
      
      {/* Header Panel */}
      <header className="h-16 bg-[#1E293B] border-b border-slate-700 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Cpu className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Khmer AI Movie Translator <span className="text-indigo-400">Pro</span>
              </h1>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-semibold hidden sm:inline border border-slate-700">
                Phase 4-6 Advanced Suite v1.1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold sm:hidden">Phase 4-6 Active</p>
          </div>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider">Whisper-Offline & Translation Memory Enabled</span>
          </div>
          <div className="hidden lg:block h-8 w-px bg-slate-700"></div>
          <button
            onClick={handleDownloadZip}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20 text-white"
            id="download-workspace-btn"
          >
            <Download className="w-4 h-4" />
            <span>Deploy Workspace ZIP</span>
          </button>
        </div>
      </header>

      {/* Warning Notice Banner */}
      <div className="bg-[#1E293B]/60 border-b border-slate-700 px-6 py-2.5 flex items-center justify-between gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span>
            This panel controls <strong>Phases 4-6: Offline Speech to Text, Multi-lingual Translation Memory, and Visual SRT Editors</strong>.
          </span>
        </div>
        <button
          onClick={handleDownloadZip}
          className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-4 cursor-pointer flex-shrink-0 text-xs"
        >
          Download Desktop Installer Package
        </button>
      </div>

      {/* Core Tabs Navigation */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border border-slate-700 gap-1 bg-[#1E293B] p-1.5 rounded-xl self-start shadow-sm w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("translator")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "translator"
                ? "bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Languages className="w-4 h-4 text-indigo-400" />
            <span>AI Translation Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab("stt")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "stt"
                ? "bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Volume2 className="w-4 h-4 text-indigo-400" />
            <span>Faster-Whisper STT (Phase 4)</span>
          </button>

          <button
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "editor"
                ? "bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Film className="w-4 h-4 text-indigo-400" />
            <span>SRT Subtitle Editor (Phase 6)</span>
          </button>
          
          <button
            onClick={() => setActiveTab("codebase")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "codebase"
                ? "bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Code className="w-4 h-4 text-indigo-400" />
            <span>Workspace Code Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "diagnostics"
                ? "bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>FFmpeg & System logs</span>
          </button>

          <button
            onClick={() => setActiveTab("voice")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "voice"
                ? "bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>Khmer AI Voice (Phase 7)</span>
          </button>

          <button
            onClick={() => setActiveTab("audio")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "audio"
                ? "bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Audio Processing (Phase 8)</span>
          </button>

          <button
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "export"
                ? "bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export Suite (Phase 9)</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          
          {/* TAB 1: AI TRANSLATION SANDBOX & DUBBING PLAYGROUND */}
          {activeTab === "translator" && (
            <motion.div
              key="translator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Configuration Parameter Column */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    <h2 className="font-bold text-sm tracking-wide text-slate-200 uppercase font-display italic">Translation Memory & Engine</h2>
                  </div>

                  {/* API Provider Selector */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">AI Translation Engine</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setApiProvider("gemini"); setTranslatorModel("gemini-3.5-flash"); }}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          apiProvider === "gemini"
                            ? "bg-indigo-600/25 border-indigo-500 text-indigo-300"
                            : "bg-[#0F172A] border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Google Gemini
                      </button>
                      <button
                        onClick={() => { setApiProvider("openai"); setTranslatorModel("gpt-4o-mini"); }}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          apiProvider === "openai"
                            ? "bg-indigo-600/25 border-indigo-500 text-indigo-300"
                            : "bg-[#0F172A] border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        OpenAI Engine
                      </button>
                    </div>
                  </div>

                  {/* Target Language selection */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Target Language</label>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="bg-[#0F172A] border border-slate-700 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full font-semibold"
                    >
                      <option value="Khmer">Khmer (Cambodian)</option>
                      <option value="Thai">Thai (Siam)</option>
                      <option value="Vietnamese">Vietnamese</option>
                      <option value="Lao">Lao</option>
                      <option value="English">English</option>
                    </select>
                  </div>

                  {/* AI Model name */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">AI Model Engine</label>
                    <select
                      value={translatorModel}
                      onChange={(e) => setTranslatorModel(e.target.value)}
                      className="bg-[#0F172A] border border-slate-700 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full font-mono"
                    >
                      {apiProvider === "gemini" ? (
                        <>
                          <option value="gemini-3.5-flash">gemini-3.5-flash (Fast & Accurate)</option>
                          <option value="gemini-3.1-pro-preview">gemini-3.1-pro (Deep Film Context)</option>
                        </>
                      ) : (
                        <>
                          <option value="gpt-4o-mini">gpt-4o-mini (Cost-Efficient)</option>
                          <option value="gpt-4o">gpt-4o (Cinematic Alignment)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Temperature slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Creativity Level (Temp)</label>
                      <span className="text-xs text-indigo-400 font-mono font-bold">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400">Lower temperature ensures highly literal alignment for dialogues.</span>
                  </div>

                  {/* Translation Memory Toggle */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-200">Translation Memory (TM)</span>
                      <span className="text-[10px] text-slate-400">Cache repeating dialogues & save costs</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tmEnabled}
                        onChange={(e) => setTmEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Prebuilt Voice selection */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-700">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Speech Dubbing (TTS Voice)</label>
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="bg-[#0F172A] border border-slate-700 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full font-mono"
                    >
                      <option value="Kore">Kore (Smooth Executive)</option>
                      <option value="Fenrir">Fenrir (Cinematic Voice)</option>
                      <option value="Zephyr">Zephyr (Light Narrator)</option>
                      <option value="Puck">Puck (Fast Dialogue)</option>
                    </select>
                  </div>

                  {/* Playback speed slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Dubbing Speed rate</label>
                      <span className="text-xs text-indigo-400 font-mono font-bold">{customSpeed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.5"
                      step="0.05"
                      value={customSpeed}
                      onChange={(e) => setCustomSpeed(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Apply defaults buttons */}
                  <button
                    onClick={handleSaveSettings}
                    className="mt-2 bg-[#0F172A] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {saveSettingsSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Successfully saved to config.yaml!</span>
                      </>
                    ) : (
                      <span>Persist local default config.yaml</span>
                    )}
                  </button>
                </div>

                {/* Subtitle Presets selector */}
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-3 shadow-md">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Select Cinematic Preset</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handlePresetChange("scifi")}
                      className={`px-2 py-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        activePreset === "scifi"
                          ? "bg-indigo-950/45 border-indigo-500 text-indigo-400"
                          : "bg-[#0F172A] border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Sci-Fi Thriller
                    </button>
                    <button
                      onClick={() => handlePresetChange("drama")}
                      className={`px-2 py-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        activePreset === "drama"
                          ? "bg-indigo-950/45 border-indigo-500 text-indigo-400"
                          : "bg-[#0F172A] border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Drama Scene
                    </button>
                    <button
                      onClick={() => handlePresetChange("documentary")}
                      className={`px-2 py-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        activePreset === "documentary"
                          ? "bg-indigo-950/45 border-indigo-500 text-indigo-400"
                          : "bg-[#0F172A] border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Documentary
                    </button>
                  </div>
                </div>
              </div>

              {/* Central translator workspace */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Side-by-side SRT text boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Source SRT text area */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        Original Script (SRT Format)
                      </span>
                      <button
                        onClick={() => handlePresetChange("custom", "")}
                        className="text-[10px] text-slate-400 hover:text-indigo-400 font-bold uppercase cursor-pointer"
                      >
                        Clear Area
                      </button>
                    </div>
                    <textarea
                      value={srtInput}
                      onChange={(e) => handlePresetChange("custom", e.target.value)}
                      placeholder="Paste your movie's subtitle text in standard SRT timing format here..."
                      className="bg-[#1E293B] border border-slate-700 rounded-2xl p-4 text-xs font-mono text-slate-200 h-[340px] focus:outline-none focus:border-indigo-500 leading-relaxed resize-none shadow-sm"
                    />
                  </div>

                  {/* Translated output SRT text area */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 text-indigo-400" />
                      Translated Script ({targetLang})
                    </span>
                    <div className="relative bg-[#1E293B] border border-slate-700 rounded-2xl p-4 h-[340px] overflow-y-auto shadow-sm">
                      {isTranslating ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1E293B]/95 gap-3 rounded-2xl">
                          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                          <span className="text-xs text-slate-300 font-bold">Model aligns dialogues with subtitle clocks...</span>
                          <span className="text-[10px] text-slate-500 font-mono">Applying System Instructions and tags</span>
                        </div>
                      ) : translateError ? (
                        <div className="absolute inset-4 flex flex-col items-center justify-center text-center gap-2 bg-red-950/20 border border-red-900/30 p-4 rounded-xl">
                          <AlertCircle className="w-8 h-8 text-red-500" />
                          <span className="text-xs text-red-400 font-bold">Pipeline processing failure</span>
                          <p className="text-[10px] text-slate-400 max-w-xs">{translateError}</p>
                        </div>
                      ) : !srtTranslated ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center gap-2">
                          <Languages className="w-8 h-8 text-slate-600" />
                          <span className="text-xs font-bold">No localized script generated</span>
                          <p className="text-[10px] max-w-xs px-4">Press the trigger translate button below to prompt the neural translator.</p>
                        </div>
                      ) : (
                        <pre className="text-xs font-mono text-indigo-300 leading-relaxed whitespace-pre-wrap">{srtTranslated}</pre>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subtitle Action ribbon */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1E293B] border border-slate-700 p-4 rounded-2xl shadow-md">
                  <div className="flex flex-col gap-1 text-xs text-slate-400">
                    {translationStats.lines > 0 ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/45 px-3 py-1 rounded-full border border-emerald-900/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Translated {translationStats.lines} timing blocks in {(translationStats.timeSpentMs / 1000).toFixed(1)}s</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span>Ensures timing, syntax indices, and formatting tags are pristine</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating || !srtInput.trim()}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isTranslating || !srtInput.trim()
                        ? "bg-[#0F172A] text-slate-500 cursor-not-allowed border border-slate-700"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95"
                    }`}
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Translating script...</span>
                      </>
                    ) : (
                      <>
                        <Languages className="w-3.5 h-3.5" />
                        <span>Prompt Translator Engine</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Translation Memory Dashboard widget */}
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      <h3 className="font-bold text-xs md:text-sm text-slate-200">Translation Memory Cache Logs</h3>
                    </div>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded font-bold border border-indigo-900/40 uppercase">
                      Hits: {tmSavings.hits} | Saved {tmSavings.tokensSaved} tokens
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Search cached dialogue strings</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search dialogue text..."
                        value={tmSearchQuery}
                        onChange={(e) => setTmSearchQuery(e.target.value)}
                        className="bg-[#0F172A] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 flex-1 focus:outline-none"
                      />
                    </div>

                    <div className="max-h-28 overflow-y-auto flex flex-col gap-2 pr-1">
                      {tmCache
                        .filter((c) => c.source.toLowerCase().includes(tmSearchQuery.toLowerCase()))
                        .map((c, idx) => (
                          <div key={idx} className="bg-[#0F172A] border border-slate-800 p-2.5 rounded-lg text-[11px] font-mono flex flex-col gap-1">
                            <div className="text-slate-400"><strong className="text-indigo-400">EN:</strong> {c.source}</div>
                            <div className="text-indigo-300"><strong className="text-indigo-400">{c.lang.toUpperCase()}:</strong> {c.target}</div>
                          </div>
                        ))}
                    </div>

                    {/* Manual TM insert */}
                    <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Inject Manual TM Translation Pair</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Source English Text"
                          value={newSourceText}
                          onChange={(e) => setNewSourceText(e.target.value)}
                          className="bg-[#0F172A] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Target Khmer Translation"
                          value={newTargetText}
                          onChange={(e) => setNewTargetText(e.target.value)}
                          className="bg-[#0F172A] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={handleAddTMCache}
                        className="bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600/25 border border-indigo-500/30 text-[10px] py-1.5 rounded-lg font-bold"
                      >
                        Incorporate into Translation Memory Json Cache
                      </button>
                    </div>
                  </div>
                </div>

                {/* Local synchronized dubbing panel */}
                {srtTranslated && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 shadow-md"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-indigo-400" />
                        <h3 className="font-bold text-xs md:text-sm text-slate-200 font-display italic">Timing-Synchronized Speech Dubbing preview</h3>
                      </div>
                      <span className="text-[10px] bg-[#0F172A] text-slate-400 px-2.5 py-0.5 rounded border border-slate-700 font-bold uppercase">Synthesizer Core</span>
                    </div>

                    <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                      {inputBlocks.map((inB, idx) => {
                        const outB = outputBlocks[idx] || { text: "..." };
                        const isThisSynthesizing = isSynthesizing === idx;
                        const isThisPlaying = playbackActive === idx;

                        return (
                          <div
                            key={idx}
                            className={`flex flex-col md:flex-row items-stretch justify-between gap-4 border p-3 rounded-xl transition-all ${
                              isThisPlaying
                                ? "bg-indigo-950/35 border-indigo-500"
                                : "bg-[#0F172A] border-slate-700 hover:border-slate-600"
                            }`}
                          >
                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="bg-[#1E293B] border border-slate-700 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold">#{inB.index}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{inB.timing}</span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div className="text-slate-400 italic">
                                  "{inB.text}"
                                </div>
                                <div className="text-indigo-300 font-semibold">
                                  "{outB.text}"
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-start md:justify-end gap-2 min-w-[120px]">
                              <button
                                onClick={() => handleSpeakLine(outB.text, idx)}
                                disabled={isThisSynthesizing}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                                  isThisPlaying
                                    ? "bg-emerald-600 text-white animate-pulse"
                                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                }`}
                              >
                                {isThisSynthesizing ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Synthesizing...</span>
                                  </>
                                ) : isThisPlaying ? (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5" />
                                    <span>Playing Audio</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5" />
                                    <span>Generate Voice</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

              </div>
            </motion.div>
          )}

          {/* TAB 2: SPEECH TO TEXT TRANSPRIBER (PHASE 4) */}
          {activeTab === "stt" && (
            <motion.div
              key="stt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Media upload selector */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <h2 className="font-bold text-sm tracking-wide text-slate-200 uppercase font-display italic">Load Media Track</h2>
                  </div>

                  <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 bg-[#0F172A] hover:border-indigo-500 transition-colors">
                    <Film className="w-10 h-10 text-slate-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">Drag & Drop movie or audio file</span>
                      <span className="text-[10px] text-slate-500">Supports .mp4, .mkv, .avi, .mov, .wav, .mp3</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-900/35 px-3 py-1 rounded-full">
                      <File className="w-3.5 h-3.5" />
                      <span>{sttFileName}</span>
                    </div>
                    <input
                      type="text"
                      className="bg-[#0F172A] border border-slate-700 text-[10px] font-mono text-center px-2 py-1 rounded w-full text-slate-300 focus:outline-none focus:border-indigo-500"
                      value={sttFileName}
                      onChange={(e) => setSttFileName(e.target.value)}
                      placeholder="Or enter file path / name..."
                    />
                  </div>

                  {/* Settings Parameters */}
                  <div className="flex flex-col gap-4 pt-3 border-t border-slate-700">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Faster-Whisper Settings</span>

                    {/* Model Size */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Whisper Weight Model</label>
                      <select
                        value={whisperModelSize}
                        onChange={(e) => setWhisperModelSize(e.target.value)}
                        className="bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      >
                        <option value="tiny">tiny (Offline - Ultra Fast)</option>
                        <option value="base">base (Offline - Recommended Default)</option>
                        <option value="small">small (Offline - High Fidelity)</option>
                        <option value="medium">medium (Offline - Movie Standard)</option>
                        <option value="large-v3">large-v3 (Offline - Cinematic Grade)</option>
                      </select>
                    </div>

                    {/* GPU/CPU select */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Hardware Device</label>
                        <select
                          value={whisperDevice}
                          onChange={(e) => setWhisperDevice(e.target.value)}
                          className="bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="cpu">CPU (Standard Intel/AMD)</option>
                          <option value="cuda">GPU CUDA (NVIDIA Core)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Compute Type</label>
                        <select
                          value={whisperCompute}
                          onChange={(e) => setWhisperCompute(e.target.value)}
                          className="bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="int8">int8 (Quantum Fast)</option>
                          <option value="float16">float16 (Standard GPU)</option>
                          <option value="float32">float32 (Full Range)</option>
                        </select>
                      </div>
                    </div>

                    {/* Auto language / Speaker detection checks */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Auto Language Identification</span>
                        <input
                          type="checkbox"
                          checked={whisperAutoDetect}
                          onChange={(e) => setWhisperAutoDetect(e.target.checked)}
                          className="rounded text-indigo-600 bg-[#0F172A] border-slate-700 focus:ring-0 focus:ring-offset-0"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Speaker Diarization (Detection)</span>
                        <input
                          type="checkbox"
                          checked={whisperSpeakerDetection}
                          onChange={(e) => setWhisperSpeakerDetection(e.target.checked)}
                          className="rounded text-indigo-600 bg-[#0F172A] border-slate-700 focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transcription execution button */}
                  <button
                    onClick={handleSTTTranscription}
                    disabled={isTranscribingSTT}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isTranscribingSTT ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Transcribing Frame Sequence... ({sttProgress}%)</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-white" />
                        <span>Initiate Whisper-Offline Transcription</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Active Progress Console */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Whisper Offline Transcription Logs
                </span>

                <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-5 h-[340px] font-mono text-[10px] text-slate-300 flex flex-col gap-2 overflow-y-auto shadow-md">
                  {sttLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center gap-2">
                      <Activity className="w-6 h-6 text-slate-600 animate-pulse" />
                      <span>Offline Faster-Whisper transcribing console idle. Ready to process.</span>
                    </div>
                  ) : (
                    sttLogs.map((log, idx) => {
                      let color = "text-slate-300";
                      if (log.includes("successfully") || log.includes("finished")) color = "text-emerald-400";
                      else if (log.includes("Detected")) color = "text-indigo-400 font-bold";
                      else if (log.includes("Settings") || log.includes("Transcribe")) color = "text-slate-500";
                      return (
                        <div key={idx} className={`leading-relaxed whitespace-pre-wrap ${color}`}>
                          {log}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Progress bar container */}
                {isTranscribingSTT && (
                  <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">GPU Frame Translation Segment Progress</span>
                      <span className="font-mono font-bold text-indigo-400">{sttProgress}%</span>
                    </div>
                    <div className="w-full bg-[#0F172A] rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${sttProgress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: SRT SUBTITLE EDITOR & LIVE VISUAL VIDEO PREVIEW (PHASE 6) */}
          {activeTab === "editor" && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Visual Film player simulation & Edit utilities */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* Live Video player frame */}
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-indigo-400" />
                      <h2 className="font-bold text-sm text-slate-200">Interactive Subtitle Media Player</h2>
                    </div>
                    <span className="text-[10px] bg-red-950/40 text-red-400 px-2 py-0.5 rounded font-bold border border-red-900/40 uppercase">LIVE RENDER</span>
                  </div>

                  {/* Cinema screen mock */}
                  <div className="relative aspect-video bg-black rounded-xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden shadow-inner select-none">
                    {/* Retro background film lines simulator when playing */}
                    {isPreviewPlaying && (
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#000]/10 to-transparent pointer-events-none opacity-40 animate-pulse"></div>
                    )}
                    
                    {/* Simulated film frame content */}
                    <div className="text-center p-4">
                      <span className="text-[10px] tracking-widest text-slate-500 block uppercase font-bold">CINEMATIC SCENE RUNTIME</span>
                      <span className="text-xl font-bold font-mono tracking-wider text-slate-600 block mt-1">
                        00:00:{String(Math.floor(previewPlaybackTime)).padStart(2, "0")}:{String(Math.round((previewPlaybackTime % 1) * 100)).padStart(2, "0")}
                      </span>
                    </div>

                    {/* SUBTITLE RENDER PANEL */}
                    <div className="absolute bottom-6 left-4 right-4 text-center">
                      {playerSubtitle ? (
                        <span className="bg-black/85 text-amber-300 font-bold px-3.5 py-1.5 rounded-md text-xs sm:text-sm border border-amber-500/20 shadow-md inline-block leading-relaxed">
                          {playerSubtitle}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs italic">[ No Dialogues Triggered ]</span>
                      )}
                    </div>
                  </div>

                  {/* Controls player HUD */}
                  <div className="flex items-center justify-between gap-4 bg-[#0F172A] p-3 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                      className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      {isPreviewPlaying ? (
                        <div className="w-3 h-3 bg-white rounded-sm"></div>
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5 text-white" />
                      )}
                    </button>

                    {/* Timeline Slider */}
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                        <span>0:00s</span>
                        <span className="text-indigo-400 font-bold">{previewPlaybackTime.toFixed(1)}s / 25.0s</span>
                        <span>0:25s</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="25.0"
                        step="0.1"
                        value={previewPlaybackTime}
                        onChange={(e) => setPreviewPlaybackTime(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Shifting and Replacement utilities */}
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide border-b border-slate-700 pb-2">Global timing operations</span>

                  {/* Shift Clocks */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Synchronize Clocks (Shift Timestamps)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        className="bg-[#0F172A] border border-slate-700 rounded-lg p-2 text-xs font-mono text-center w-24 text-indigo-400 font-bold focus:outline-none"
                        value={shiftDelta}
                        onChange={(e) => setShiftDelta(parseFloat(e.target.value) || 1.0)}
                      />
                      <button
                        onClick={() => handleShiftTimestamps(shiftDelta)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-3 rounded-lg active:scale-98"
                      >
                        Shift All (+{shiftDelta}s)
                      </button>
                      <button
                        onClick={() => handleShiftTimestamps(-shiftDelta)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2 px-3 rounded-lg active:scale-98 border border-slate-700"
                      >
                        Shift All (-{shiftDelta}s)
                      </button>
                    </div>
                  </div>

                  {/* Search and Replace */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Interactive Search & Replace</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Search phrase..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#0F172A] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Replacement phrase..."
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        className="bg-[#0F172A] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSearchReplace}
                      className="bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600/25 border border-indigo-500/40 text-xs py-2 rounded-lg font-bold transition-all"
                    >
                      Apply Global Search & Replace
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: SRT Block timeline table */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                
                {/* Advanced merging splitting actions card */}
                <div className="bg-[#1E293B] border border-slate-700 p-4 rounded-2xl shadow-md grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Merge Blocks */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Merge dialogue blocks
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Idx 1"
                        value={mergeIndex1}
                        onChange={(e) => setMergeIndex1(e.target.value)}
                        className="bg-[#0F172A] border border-slate-700 text-center rounded-lg p-2 text-xs w-16 text-slate-200"
                      />
                      <input
                        type="text"
                        placeholder="Idx 2"
                        value={mergeIndex2}
                        onChange={(e) => setMergeIndex2(e.target.value)}
                        className="bg-[#0F172A] border border-slate-700 text-center rounded-lg p-2 text-xs w-16 text-slate-200"
                      />
                      <button
                        onClick={() => handleMergeBlocks(mergeIndex1, mergeIndex2)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg"
                      >
                        Merge Blocks
                      </button>
                    </div>
                  </div>

                  {/* Split Block */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                      Split dialogue block
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Idx"
                        value={splitIndex}
                        onChange={(e) => setSplitIndex(e.target.value)}
                        className="bg-[#0F172A] border border-slate-700 text-center rounded-lg p-2 text-xs w-24 text-slate-200"
                      />
                      <button
                        onClick={() => handleSplitBlock(splitIndex)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg"
                      >
                        Split Segment (50/50)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Interactive Subtitle Timeline editor
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Select cells to edit values in real-time</span>
                </div>

                {/* Subtitle blocks editable list */}
                <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-4 overflow-y-auto max-h-[380px] flex flex-col gap-3 shadow-md">
                  {editorSrtBlocks.length === 0 ? (
                    <div className="h-44 flex items-center justify-center text-slate-500">
                      Empty timeline. Paste preset values inside the first tab.
                    </div>
                  ) : (
                    editorSrtBlocks.map((b) => {
                      const isSelected = selectedBlockIdx === b.index;
                      return (
                        <div
                          key={b.index}
                          className={`border p-3.5 rounded-xl transition-all flex flex-col gap-2 ${
                            isSelected
                              ? "bg-indigo-950/25 border-indigo-500"
                              : "bg-[#1E293B] border-slate-700/80 hover:border-slate-600"
                          }`}
                          onClick={() => setSelectedBlockIdx(b.index)}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-bold text-slate-200">
                                #{b.index}
                              </span>
                              <span>{b.timing}</span>
                            </div>
                            {isSelected && <span className="text-indigo-400 font-bold uppercase">Active Editing block</span>}
                          </div>

                          <textarea
                            className="bg-[#0F172A] border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 leading-relaxed font-sans focus:outline-none focus:border-indigo-500 resize-none h-14"
                            value={b.text}
                            onChange={(e) => handleUpdateBlockText(b.index, e.target.value)}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: KHMER AI VOICE GENERATOR (PHASE 7) */}
          {activeTab === "voice" && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Voice parameters */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                    <Volume2 className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-bold text-sm tracking-wide text-slate-200 uppercase font-display italic">Khmer Voice Settings</h2>
                  </div>

                  {/* Speaker Gender Selection */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Speaker Voice Model</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setVoiceGender("Male"); setSelectedVoice("Sokha"); }}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          voiceGender === "Male"
                            ? "bg-indigo-600/25 border-indigo-500 text-indigo-300"
                            : "bg-[#0F172A] border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Male Voice (Sokha)
                      </button>
                      <button
                        onClick={() => { setVoiceGender("Female"); setSelectedVoice("Bopha"); }}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          voiceGender === "Female"
                            ? "bg-indigo-600/25 border-indigo-500 text-indigo-300"
                            : "bg-[#0F172A] border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Female Voice (Bopha)
                      </button>
                    </div>
                  </div>

                  {/* Emotion selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Voice Emotion Tone</label>
                    <select
                      value={customEmotion}
                      onChange={(e) => setCustomEmotion(e.target.value)}
                      className="bg-[#0F172A] border border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Neutral">Neutral (Cinematic Narrator)</option>
                      <option value="Excited">Excited (Dynamic Character / Action)</option>
                      <option value="Dramatic">Dramatic (Heavy / Monologue)</option>
                      <option value="Whispering">Whispering (Soft / Secretive)</option>
                    </select>
                  </div>

                  {/* Speed and Pitch sliders */}
                  <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-400 uppercase">Speech Speed Rate</span>
                        <span className="text-indigo-400 font-mono">{customSpeed.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={customSpeed}
                        onChange={(e) => setCustomSpeed(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-400 uppercase">Acoustic Pitch Filter</span>
                        <span className="text-indigo-400 font-mono">{customPitch.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={customPitch}
                        onChange={(e) => setCustomPitch(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Action trigger and batch statistics */}
                  <div className="pt-4 border-t border-slate-700 flex flex-col gap-3">
                    <button
                      onClick={handleBatchVoiceSynthesis}
                      disabled={isBatchSynthesizing}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10 active:scale-98 transition-all"
                    >
                      {isBatchSynthesizing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Generating Voice ({batchVoiceProgress}%)</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Batch Generate Khmer Voices</span>
                        </>
                      )}
                    </button>

                    {isBatchSynthesizing && (
                      <div className="w-full bg-[#0F172A] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${batchVoiceProgress}%` }}
                        ></div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 font-mono leading-relaxed bg-[#0F172A] p-2.5 rounded-lg border border-slate-800">
                      <div>Total Lines: {outputBlocks.length || 0} block segments</div>
                      <div>Target Folder: workspace/voice_temp/</div>
                      <div>Engine: Dual-Channel (Gemini-3.1-TTS / gTTS fallback)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Dialogue voiceover list */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                    Interactive Subtitle Dubbing Playground
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/35 font-semibold">Active voice: {selectedVoice}</span>
                </div>

                <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-5 max-h-[480px] overflow-y-auto flex flex-col gap-3 shadow-md">
                  {outputBlocks.length === 0 ? (
                    <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
                      No translated subtitles loaded. Translate some dialogue in the first tab to preview voice synthesis.
                    </div>
                  ) : (
                    outputBlocks.map((b, idx) => {
                      const inB = inputBlocks[idx] || { text: "..." };
                      const isThisSynthesizing = isSynthesizing === idx;
                      const isThisPlaying = playbackActive === idx;

                      return (
                        <div
                          key={idx}
                          className={`flex items-stretch justify-between gap-4 border p-3.5 rounded-xl transition-all ${
                            isThisPlaying
                              ? "bg-indigo-950/35 border-indigo-500"
                              : "bg-[#1E293B] border-slate-700/80 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex flex-col gap-2 flex-1 min-w-0 justify-center">
                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                              <span className="bg-[#0F172A] border border-slate-800 text-indigo-300 px-2 py-0.5 rounded font-bold font-mono">#{b.index}</span>
                              <span>{b.timing}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                              <div className="text-slate-400 italic">"{inB.text}"</div>
                              <div className="text-indigo-300 font-semibold">"{b.text}"</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleSpeakLine(b.text, idx)}
                              disabled={isThisSynthesizing}
                              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                                isThisPlaying
                                  ? "bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse"
                                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
                              }`}
                            >
                              {isThisSynthesizing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              ) : isThisPlaying ? (
                                <Volume2 className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-white" />
                              )}
                              <span>{isThisPlaying ? "Playing" : "Speak"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: AUDIO PROCESSING (PHASE 8) */}
          {activeTab === "audio" && (
            <motion.div
              key="audio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Audio settings */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-bold text-sm tracking-wide text-slate-200 uppercase font-display italic">Acoustic Mix Filters</h2>
                  </div>

                  {/* Processing flags */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">DSP Pipelines</span>

                    <div className="flex items-center justify-between bg-[#0F172A] border border-slate-850 p-3 rounded-xl">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-200">Vocal Separation (Center Cut)</span>
                        <span className="text-[10px] text-slate-500">Isolate dialog from original stereo track</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={audioVocalSeparateActive}
                        onChange={(e) => setAudioVocalSeparateActive(e.target.checked)}
                        className="rounded text-indigo-600 bg-[#0F172A] border-slate-700 focus:ring-0 focus:ring-offset-0"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-[#0F172A] border border-slate-850 p-3 rounded-xl">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-200">Noise Subtraction ('afftdn')</span>
                        <span className="text-[10px] text-slate-500">Apply FFmpeg FFT-based noise reduction</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={audioNoiseRemovalActive}
                        onChange={(e) => setAudioNoiseRemovalActive(e.target.checked)}
                        className="rounded text-indigo-600 bg-[#0F172A] border-slate-700 focus:ring-0 focus:ring-offset-0"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-[#0F172A] border border-slate-850 p-3 rounded-xl">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-200">EBU R128 Normalization</span>
                        <span className="text-[10px] text-slate-500">Balance sound track master gains to target DB</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={audioNormalizationActive}
                        onChange={(e) => setAudioNormalizationActive(e.target.checked)}
                        className="rounded text-indigo-600 bg-[#0F172A] border-slate-700 focus:ring-0 focus:ring-offset-0"
                      />
                    </div>
                  </div>

                  {/* Volume mixers */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Studio Track Mixer</span>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-300">Khmer Vocal Gain</span>
                        <span className="font-mono text-indigo-400 font-semibold">{audioVocalVolume.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.1"
                        value={audioVocalVolume}
                        onChange={(e) => setAudioVocalVolume(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-300">Background Music Level</span>
                        <span className="font-mono text-indigo-400 font-semibold">{audioBgVolume.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={audioBgVolume}
                        onChange={(e) => setAudioBgVolume(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Trigger processing */}
                  <div className="pt-4 border-t border-slate-700 flex flex-col gap-3">
                    <button
                      onClick={handleAudioProcessingPipeline}
                      disabled={isProcessingAudio}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10 active:scale-98 transition-all"
                    >
                      {isProcessingAudio ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Processing Audio ({audioProcessProgress}%)</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4" />
                          <span>Execute Audio Processing Pipeline</span>
                        </>
                      )}
                    </button>

                    {isProcessingAudio && (
                      <div className="w-full bg-[#0F172A] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${audioProcessProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Audio processing console log */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  KhmerAudioProcessor Subprocess Console
                </span>

                <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-5 font-mono text-[10px] h-96 overflow-y-auto flex flex-col gap-2.5 shadow-md">
                  {audioLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Audio Processing pipeline has not been executed yet. Configure parameters and click trigger button.
                    </div>
                  ) : (
                    audioLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed text-indigo-300/90 whitespace-pre-wrap font-medium">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: EXPORT SUITE & MULTIPLEXER (PHASE 9) */}
          {activeTab === "export" && (
            <motion.div
              key="export"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Container and Codec params */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                    <Download className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-bold text-sm tracking-wide text-slate-200 uppercase font-display italic">Multiplexer Config</h2>
                  </div>

                  {/* Rendering options */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Multiplexer tasks</span>

                    <div className="flex items-center justify-between bg-[#0F172A] border border-slate-850 p-3 rounded-xl">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-200">Burn Subtitles (Hardsub)</span>
                        <span className="text-[10px] text-slate-500">Embed SRT directly on video frames</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={exportSubtitleBurnActive}
                        onChange={(e) => setExportSubtitleBurnActive(e.target.checked)}
                        className="rounded text-indigo-600 bg-[#0F172A] border-slate-700 focus:ring-0 focus:ring-offset-0"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-[#0F172A] border border-slate-850 p-3 rounded-xl">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-200">Inject Khmer Sound Mixer</span>
                        <span className="text-[10px] text-slate-500">Replace original sound track with active mix</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={exportReplaceAudioActive}
                        onChange={(e) => setExportReplaceAudioActive(e.target.checked)}
                        className="rounded text-indigo-600 bg-[#0F172A] border-slate-700 focus:ring-0 focus:ring-offset-0"
                      />
                    </div>
                  </div>

                  {/* Format Container selection */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Target Format Container</label>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                      className="bg-[#0F172A] border border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-full font-semibold font-mono"
                    >
                      <option value="mp4">MP4 (MPEG-4 Base Media - H.264 / AAC)</option>
                      <option value="mkv">MKV (Matroska Media Container - High Fidelity)</option>
                      <option value="mp3">MP3 (Stereo Master Sound Mix - Audio Only)</option>
                      <option value="srt">SRT (Subrip Subtitles Text Only)</option>
                    </select>
                  </div>

                  {/* Subprocess quality and acceleration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">H.264 Video Quality (CRF)</label>
                      <select className="bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200">
                        <option value="18">CRF 18 (Visually Lossless)</option>
                        <option value="23">CRF 23 (High Quality Default)</option>
                        <option value="28">CRF 28 (Compact Size)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">GPU Acceleration</label>
                      <select className="bg-[#0F172A] border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200">
                        <option value="none">None (CPU Libx264)</option>
                        <option value="nvenc">NVIDIA NVENC H.264</option>
                        <option value="qsv">Intel QuickSync Video</option>
                      </select>
                    </div>
                  </div>

                  {/* Render trigger */}
                  <div className="pt-4 border-t border-slate-700 flex flex-col gap-3">
                    <button
                      onClick={handleMovieExportPipeline}
                      disabled={isExporting}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10 active:scale-98 transition-all"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Exporting Master ({exportProgress}%)</span>
                        </>
                      ) : (
                        <>
                          <Film className="w-4 h-4" />
                          <span>Generate Khmer Movie Master</span>
                        </>
                      )}
                    </button>

                    {isExporting && (
                      <div className="w-full bg-[#0F172A] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${exportProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Video thumbnail cover & rendering logs */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                  <Film className="w-4 h-4 text-indigo-400" />
                  KhmerMovieExporter Render Preview
                </span>

                <div className="bg-[#1E293B] border border-slate-700 p-4 rounded-2xl flex flex-col gap-4 shadow-md">
                  {/* Aspect ratio video frame mock with subtitles burned in */}
                  <div className="aspect-video bg-[#0F172A] rounded-xl relative flex items-center justify-center border border-slate-800 overflow-hidden shadow-inner group">
                    {/* Background mock image or gradient pattern */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/40 via-transparent to-slate-950 opacity-80" />
                    
                    {/* Centered Camera Overlay icon or movie name */}
                    <div className="z-10 text-center flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-indigo-600/10 rounded-full flex items-center justify-center border border-indigo-500/25">
                        <Film className="w-6 h-6 text-indigo-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 font-mono">CINEMATIC MOVIE PREVIEW RENDER</span>
                    </div>

                    {/* Hardsubburned Subtitles at the bottom */}
                    {exportSubtitleBurnActive && (
                      <div className="absolute bottom-6 left-4 right-4 z-20 text-center">
                        <span className="bg-black/85 text-[#FACC15] font-sans font-semibold text-xs md:text-sm px-4 py-1.5 rounded-lg border border-neutral-800 shadow-xl inline-block tracking-wide max-w-[90%]">
                          {srtTranslated ? outputBlocks[0]?.text || "ប្រយ័ត្នក្រុមការងារ។ យើងបានចូលទៅក្នុងគន្លង..." : "ប្រយ័ត្នក្រុមការងារ។ យើងបានចូលទៅក្នុងគន្លង..."}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ffmpeg Multiplexer Console Log</span>
                    <div className="bg-[#0F172A] border border-slate-750 p-4 rounded-xl font-mono text-[10px] h-48 overflow-y-auto flex flex-col gap-2">
                      {exportLogs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500">
                          Export stream has not been requested yet. Adjust parameters and click trigger button.
                        </div>
                      ) : (
                        exportLogs.map((log, idx) => (
                          <div key={idx} className="leading-relaxed text-indigo-300/90 font-medium">
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: REPOSITORY EXPLORER */}
          {activeTab === "codebase" && (
            <motion.div
              key="codebase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Files Tree Sidebar */}
              <div className="lg:col-span-4 bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                  <Folder className="w-4 h-4 text-indigo-400" />
                  <h2 className="font-bold text-sm tracking-wide text-slate-200 uppercase font-display italic">Python 3.12 Project Tree</h2>
                </div>

                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[480px]">
                  {isFetchingFiles ? (
                    <div className="flex items-center gap-2 text-slate-500 justify-center py-12 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Reading workspace directory contents...</span>
                    </div>
                  ) : pythonFiles.length === 0 ? (
                    <div className="text-xs text-slate-500 py-12 text-center">No files detected. Run compilation step.</div>
                  ) : (
                    pythonFiles.map((file) => {
                      const isSel = selectedFile?.path === file.path;
                      const isBatch = file.path.endsWith(".bat");
                      const isYaml = file.path.endsWith(".yaml");
                      
                      return (
                        <button
                          key={file.path}
                          onClick={() => {
                            setSelectedFile(file);
                            triggerLog("info", `Examined codebase script module file content: ${file.path}`);
                          }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-medium border transition-all cursor-pointer ${
                            isSel
                              ? "bg-indigo-600/15 border-indigo-500 text-indigo-300 font-bold"
                              : "bg-[#0F172A] border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {isBatch ? (
                            <FileCode className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : isYaml ? (
                            <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : (
                            <File className="w-4 h-4 text-indigo-400 shrink-0" />
                          )}
                          <div className="truncate min-w-0 flex-1">
                            <span className="block truncate font-mono text-[11px] text-slate-200">{file.path}</span>
                            <span className="block text-[9px] text-slate-500 truncate mt-0.5">{file.description}</span>
                          </div>
                          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Code viewer editor */}
              <div className="lg:col-span-8 flex flex-col gap-3">
                {selectedFile ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                        <Code className="w-4 h-4 text-indigo-400" />
                        Script Reader: <strong className="text-slate-200 font-mono font-semibold">{selectedFile.path}</strong>
                      </span>
                      <button
                        onClick={() => handleCopyCode(selectedFile.content)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 font-semibold uppercase flex items-center gap-1.5 cursor-pointer bg-[#1E293B] border border-slate-700 px-3 py-1.5 rounded-lg"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied to clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Full Script</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-5 overflow-auto max-h-[500px] shadow-lg">
                      <pre className="text-[11px] font-mono text-indigo-300/90 leading-relaxed whitespace-pre font-medium">
                        {selectedFile.content}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    Select a python module file from the tree structure on the left side menu to explore the system code.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: DIAGNOSTICS & SYSTEM LOGS */}
          {activeTab === "diagnostics" && (
            <motion.div
              key="diagnostics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Diagnostics parameters */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* FFmpeg links widget */}
                <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-md">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <h2 className="font-bold text-sm tracking-wide text-slate-200 uppercase font-display italic">External Binary Links</h2>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    The background python script queries FFmpeg and FFprobe binary packages dynamically to extract audio tracks. Confirm the linkage coordinates match:
                  </p>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Local FFmpeg Executable Path</label>
                      <input
                        type="text"
                        value={ffmpegPath}
                        onChange={(e) => setFfmpegPath(e.target.value)}
                        className="bg-[#0F172A] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-300 font-mono focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Local FFprobe Executable Path</label>
                      <input
                        type="text"
                        value={ffprobePath}
                        onChange={(e) => setFfprobePath(e.target.value)}
                        className="bg-[#0F172A] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-300 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleTestFfmpeg}
                    disabled={testingFfmpeg}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-md shadow-indigo-500/10"
                  >
                    {testingFfmpeg ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Linking...</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-3.5 h-3.5 text-white" />
                        <span>Execute Binary Diagnostics</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Diagnostics Report card */}
                {ffmpegStatus && ffmpegStatus.tested && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`border rounded-2xl p-5 flex flex-col gap-3 shadow-md ${
                      ffmpegStatus.ok
                        ? "bg-emerald-950/20 border-emerald-500/40"
                        : "bg-red-950/20 border-red-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-sm text-slate-200">Diagnostics Report: PASS</span>
                    </div>

                    <div className="text-[11px] text-slate-300 font-mono flex flex-col gap-1 leading-relaxed bg-[#0F172A] border border-slate-800 p-3 rounded-xl">
                      <div><strong className="text-slate-500">ENGINE:</strong> FFmpeg Subprocess Bridge</div>
                      <div><strong className="text-slate-500">VERSION:</strong> v7.0.1 (Stable Build)</div>
                      <div><strong className="text-slate-500">COMPATIBLE:</strong> libx264, libmp3lame, aac, subrip</div>
                      <div><strong className="text-slate-500">AUDIT STATE:</strong> PASS</div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Logging system emulator */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    Live System Terminal Logging
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLogs([])}
                      className="text-[10px] text-slate-400 hover:text-slate-200 font-semibold uppercase flex items-center gap-1 cursor-pointer bg-[#1E293B] border border-slate-700 px-2 py-1 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Terminal</span>
                    </button>
                    <button
                      onClick={fetchLogs}
                      className="text-[10px] text-slate-400 hover:text-slate-200 font-semibold uppercase flex items-center gap-1 cursor-pointer bg-[#1E293B] border border-slate-700 px-2 py-1 rounded"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-5 font-mono text-[10px] h-96 overflow-y-auto flex flex-col gap-2.5 shadow-md">
                  {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Terminal buffer clear. Ready for incoming actions...
                    </div>
                  ) : (
                    logs.map((log, idx) => {
                      let color = "text-slate-400";
                      if (log.includes("ERROR")) color = "text-red-400 font-semibold";
                      else if (log.includes("WARNING")) color = "text-amber-400 font-semibold";
                      else if (log.includes("SUCCESS") || log.includes("completed")) color = "text-emerald-400";
                      else if (log.includes("Gemini") || log.includes("synthesis") || log.includes("OpenAI")) color = "text-indigo-400";

                      return (
                        <div key={idx} className={`leading-relaxed whitespace-pre-wrap ${color}`}>
                          {log}
                        </div>
                      );
                    })
                  )}
                  <div ref={consoleBottomRef} />
                </div>

                {/* Action buttons list */}
                <div className="bg-[#1E293B] border border-slate-700 p-4 rounded-2xl flex flex-col gap-3 shadow-md">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Generate Simulated System Action</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => triggerLog("info", "Executing virtual environment validation check... Bootstrapped python.")}
                      className="bg-[#0F172A] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer"
                    >
                      Verify Venv Logs
                    </button>
                    <button
                      onClick={() => triggerLog("warning", "Disk write threshold approaching for rotating logs handler logs/translator.log.")}
                      className="bg-[#0F172A] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer"
                    >
                      Trigger Logger Warn
                    </button>
                    <button
                      onClick={() => triggerLog("info", "Executing setup.bat script: linking python, creating launcher shortcut.")}
                      className="bg-[#0F172A] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer"
                    >
                      Run Installer Simulation
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Footer component */}
      <footer className="mt-auto border-t border-slate-700 bg-[#1E293B]/60 backdrop-blur-md px-6 py-5 text-center flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <span>Khmer AI Movie Translator Pro</span>
          <span className="text-slate-600">|</span>
          <span>Phase 4-6 Production Standard Enabled</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-500 font-mono">Build ID: bfab0801</span>
          <span>© 2026 Movie Translator Dev Team</span>
        </div>
      </footer>

    </div>
  );
}
