import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { Router, type IRouter } from "express";

const router: IRouter = Router();
const renderDirectory = path.join(os.tmpdir(), "mirlift-renders");
const renderDurationWithoutNarration = 6;

const formats = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "1:1": { width: 1080, height: 1080 },
} as const;

type RenderFormat = keyof typeof formats;
type RenderSceneInput = { imageDataUrl: string; script?: string };

function parseImageDataUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  return {
    extension: match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg",
    bytes: Buffer.from(match[2].replace(/\s/g, ""), "base64"),
  };
}

function runCommand(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code: number | null) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function synthesizeSpeech(text: string, voice: string, speed: number) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: voice === "Mark — English" ? "onyx" : voice === "Thomas — français" ? "echo" : "nova",
      input: text,
      response_format: "mp3",
      speed: Math.min(1.25, Math.max(0.75, speed)),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI narration request failed with status ${response.status}.`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function getVideoFilter(width: number, height: number) {
  return [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    `zoompan=z='min(zoom+0.0012,1.08)':d=1:s=${width}x${height}:fps=25`,
    "format=yuv420p",
  ].join(",");
}

function escapeFilterPath(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "'\\''");
}

function getCaptionFilter(captionPath: string) {
  const fontFile = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  return `drawtext=fontfile=${fontFile}:textfile='${escapeFilterPath(captionPath)}':fontcolor=white:fontsize=28:line_spacing=8:box=1:boxcolor=black@0.65:boxborderw=18:x=(w-text_w)/2:y=h-text_h-42`;
}

async function renderScene(
  inputPath: string,
  audioPath: string | undefined,
  captionPath: string | undefined,
  outputPath: string,
  format: RenderFormat,
) {
  const { width, height } = formats[format];
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  const filters = [getVideoFilter(width, height)];
  if (captionPath) filters.push(getCaptionFilter(captionPath));
  const args = [
    "-y",
    "-loop", "1",
    "-i", inputPath,
  ];

  if (audioPath) {
    args.push("-i", audioPath);
  }

  args.push(
    "-vf", filters.join(","),
    "-map", "0:v:0",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
  );

  if (audioPath) {
    args.push("-map", "1:a:0", "-c:a", "aac", "-b:a", "128k", "-shortest");
  } else {
    args.push("-t", String(renderDurationWithoutNarration), "-an");
  }

  args.push(outputPath);
  await runCommand(ffmpeg, args);
}

router.post("/render", async (req, res) => {
  const requestScenes = Array.isArray(req.body?.scenes)
    ? req.body.scenes as RenderSceneInput[]
    : [{ imageDataUrl: req.body?.imageDataUrl, script: req.body?.script }] as RenderSceneInput[];
  const format = (req.body?.format as RenderFormat) in formats ? req.body.format as RenderFormat : "16:9";
  const voice = typeof req.body?.voice === "string" ? req.body.voice : "Claire — français";
  const speed = typeof req.body?.speed === "number" ? req.body.speed : 1;
  const scenes = requestScenes.slice(0, 8);

  if (scenes.length === 0 || scenes.some((scene) => !parseImageDataUrl(scene.imageDataUrl))) {
    res.status(400).json({ error: "Ajoutez au moins une image valide à chaque scène." });
    return;
  }

  if (scenes.every((scene) => !scene.script?.trim())) {
    res.status(400).json({ error: "Ajoutez un script à au moins une scène avant de générer la vidéo." });
    return;
  }

  const renderId = randomUUID();
  const workDirectory = path.join(os.tmpdir(), `mirlift-${renderId}`);
  const outputPath = path.join(renderDirectory, `${renderId}.mp4`);

  try {
    await fs.mkdir(workDirectory, { recursive: true });
    await fs.mkdir(renderDirectory, { recursive: true });
    const clipPaths: string[] = [];
    let ttsUnavailable = false;

    for (const [index, scene] of scenes.entries()) {
      const image = parseImageDataUrl(scene.imageDataUrl);
      if (!image) throw new Error("Invalid scene image.");
      const imagePath = path.join(workDirectory, `scene-${index}.${image.extension}`);
      const audioPath = path.join(workDirectory, `scene-${index}.mp3`);
      const captionPath = path.join(workDirectory, `scene-${index}.txt`);
      const clipPath = path.join(workDirectory, `scene-${index}.mp4`);
      await fs.writeFile(imagePath, image.bytes);
      if (scene.script?.trim()) await fs.writeFile(captionPath, scene.script.trim());

      let sceneAudioPath: string | undefined;
      if (scene.script?.trim() && !ttsUnavailable) {
        try {
          await fs.writeFile(audioPath, await synthesizeSpeech(scene.script.trim(), voice, speed));
          sceneAudioPath = audioPath;
        } catch (error) {
          ttsUnavailable = true;
          console.warn("OpenAI narration unavailable; using script captions instead.", error instanceof Error ? error.message : "unknown error");
        }
      }

      await renderScene(imagePath, sceneAudioPath, scene.script?.trim() ? captionPath : undefined, clipPath, format);
      clipPaths.push(clipPath);
    }

    const concatPath = path.join(workDirectory, "scenes.txt");
    await fs.writeFile(concatPath, `${clipPaths.map((clipPath) => `file '${clipPath}'`).join("\n")}\n`);
    await runCommand(process.env.FFMPEG_PATH || "ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatPath,
      "-c", "copy",
      "-movflags", "+faststart",
      outputPath,
    ]);

    res.status(201).json({
      id: renderId,
      status: "ready",
      sceneCount: scenes.length,
      narration: ttsUnavailable ? "captions" : scenes.some((scene) => scene.script?.trim()) ? "voice" : "none",
      videoUrl: `/api/renders/${renderId}`,
    });
  } catch (error) {
    await fs.unlink(outputPath).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Le rendu vidéo a échoué.";
    console.error("Local render failed:", message);
    res.status(500).json({ error: "Le rendu vidéo a échoué. Vérifiez la disponibilité de FFmpeg, puis réessayez." });
  } finally {
    await fs.rm(workDirectory, { recursive: true, force: true });
  }
});

router.get("/renders/:id", async (req, res) => {
  const renderId = req.params.id;
  if (!/^[0-9a-f-]{36}$/.test(renderId)) {
    res.status(404).end();
    return;
  }

  const outputPath = path.join(renderDirectory, `${renderId}.mp4`);
  try {
    await fs.access(outputPath);
    res.type("video/mp4").sendFile(outputPath);
  } catch {
    res.status(404).json({ error: "Cette vidéo n’est plus disponible." });
  }
});

export default router;