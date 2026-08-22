/**
 * Browser-side audio extraction: decodes a video/audio file, downmixes to mono
 * 16 kHz and encodes a WAV buffer that can be sent for transcription.
 */

const TARGET_RATE = 16000;

export async function extractWavBase64(
  source: File | Blob | string,
  maxSeconds = 600,
): Promise<{ base64: string; seconds: number }> {
  const arrayBuffer =
    typeof source === "string"
      ? await (await fetch(source)).arrayBuffer()
      : await source.arrayBuffer();

  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error("This browser cannot decode audio.");
  const ctx = new Ctx();
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  await ctx.close();

  const seconds = Math.min(decoded.duration, maxSeconds);
  const frames = Math.floor(seconds * decoded.sampleRate);
  const channels = decoded.numberOfChannels;

  // mono downmix
  const mono = new Float32Array(frames);
  for (let c = 0; c < channels; c += 1) {
    const data = decoded.getChannelData(c);
    for (let i = 0; i < frames; i += 1) mono[i] += data[i]! / channels;
  }

  // resample to 16 kHz (linear)
  const ratio = decoded.sampleRate / TARGET_RATE;
  const outLength = Math.floor(frames / ratio);
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const idx = i * ratio;
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, frames - 1);
    const frac = idx - lo;
    const sample = mono[lo]! * (1 - frac) + mono[hi]! * frac;
    out[i] = Math.max(-1, Math.min(1, sample)) * 0x7fff;
  }

  return { base64: encodeWav(out, TARGET_RATE), seconds };
}

function encodeWav(samples: Int16Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) view.setInt16(44 + i * 2, samples[i]!, true);

  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
