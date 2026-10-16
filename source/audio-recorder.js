// audio-recorder.js
//
// Implements: idle -> recording -> paused -> recording -> ... -> (delete | send)
//
// Encoding produced: AUDIO_ENCODING_LINEAR16, raw 16-bit little-endian PCM,
// mono, resampled to `sampleRate` (default 16000 Hz — a common ASR default;
// change if your backend expects something else, e.g. 8000/44100).
//
// The base64 payload is "web-safe" base64url: padded, with '+' -> '-' and
// '/' -> '_'.

const DEFAULT_SAMPLE_RATE = 16000;

function toBase64Url(bytes) {
  // Convert bytes -> binary string in chunks to avoid call-stack limits on
  // String.fromCharCode with very large arrays.
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  const base64 = btoa(binary); // standard padded base64
  return base64.replace(/\+/g, '-').replace(/\//g, '_'); // -> base64url, padding kept
}

export class ChatAudioRecorder {
  constructor({ sampleRate = DEFAULT_SAMPLE_RATE, workletUrl = 'pcm-worklet-processor.js' } = {}) {
    this.sampleRate = sampleRate; // target output sample rate
    this.workletUrl = workletUrl;
    this.state = 'idle'; // 'idle' | 'recording' | 'paused'

    this._chunks = [];       // Float32Array[] at native mic sample rate
    this._stream = null;
    this._audioCtx = null;
    this._sourceNode = null;
    this._workletNode = null;
  }

  /** Start recording (from idle), or resume (from paused). */
  async start() {
    if (this.state === 'recording') return;

    if (this.state === 'paused') {
      await this._audioCtx.resume();
      this.state = 'recording';
      return;
    }

    // state === 'idle' -> fresh recording
    this._chunks = [];
    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this._audioCtx = new AudioContext();
    await this._audioCtx.audioWorklet.addModule(this.workletUrl);

    this._sourceNode = this._audioCtx.createMediaStreamSource(this._stream);
    this._workletNode = new AudioWorkletNode(this._audioCtx, 'pcm-worklet-processor');

    this._workletNode.port.onmessage = (event) => {
      if (this.state === 'recording') {
        this._chunks.push(event.data);
      }
    };

    // Deliberately not connected to audioCtx.destination -> no mic echo/feedback.
    this._sourceNode.connect(this._workletNode);

    this.state = 'recording';
  }

  /** Alias — resuming from 'paused' is just start() again. */
  async resume() {
    return this.start();
  }

  /** Stop capturing new audio but keep everything recorded so far. */
  pause() {
    if (this.state !== 'recording') return;
    this._audioCtx.suspend();
    this.state = 'paused';
  }

  /** Discard everything and release mic/audio resources. */
  delete() {
    this._teardown();
    this._chunks = [];
    this.state = 'idle';
  }

  // ---- internal helpers ----

  _teardown() {
    if (this._workletNode) this._workletNode.disconnect();
    if (this._sourceNode) this._sourceNode.disconnect();
    if (this._stream) this._stream.getTracks().forEach((t) => t.stop());
    if (this._audioCtx) this._audioCtx.close();
    this._workletNode = null;
    this._sourceNode = null;
    this._stream = null;
    this._audioCtx = null;
  }

  _mergeFloat32() {
    const total = this._chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of this._chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    return merged;
  }

  // Nearest-neighbor resample. Fine for speech/ASR use; swap in a proper
  // resampler (e.g. via OfflineAudioContext) if you need higher fidelity.
  _resample(float32, fromRate, toRate) {
    if (fromRate === toRate) return float32;
    const ratio = fromRate / toRate;
    const outLength = Math.round(float32.length / ratio);
    const out = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      out[i] = float32[Math.min(float32.length - 1, Math.round(i * ratio))];
    }
    return out;
  }

  _floatTo16BitPCM(float32) {
    const bytes = new Uint8Array(float32.length * 2);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, /* littleEndian */ true);
    }
    return bytes;
  }

  /** Raw LINEAR16 PCM bytes — no container/header, matches AUDIO_ENCODING_LINEAR16. */
  getRawPCMBytes() {
    const merged = this._mergeFloat32();
    const nativeRate = this._audioCtx ? this._audioCtx.sampleRate : this.sampleRate;
    const resampled = this._resample(merged, nativeRate, this.sampleRate);
    return this._floatTo16BitPCM(resampled);
  }

  /** Padded, base64url-encoded ("web-safe") string ready to send in the API payload. */
  getBase64Url() {
    return toBase64Url(this.getRawPCMBytes());
  }

  /** WAV-wrapped Blob for local playback only (the <audio> element needs a container). */
  getPlaybackBlob() {
    const pcm = this.getRawPCMBytes();
    const header = this._buildWavHeader(pcm.length);
    return new Blob([header, pcm], { type: 'audio/wav' });
  }

  _buildWavHeader(dataLength) {
    const buf = new ArrayBuffer(44);
    const view = new DataView(buf);
    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);        // PCM fmt chunk size
    view.setUint16(20, 1, true);         // audio format = PCM
    view.setUint16(22, 1, true);         // channels = mono
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true);         // block align
    view.setUint16(34, 16, true);        // bits per sample
    writeStr(36, 'data');
    view.setUint32(40, dataLength, true);
    return buf;
  }
}
