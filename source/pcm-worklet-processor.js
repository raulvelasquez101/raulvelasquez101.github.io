// pcm-worklet-processor.js
// Runs on the audio rendering thread. Just forwards raw Float32 samples
// to the main thread — no processing happens here, so pause/resume logic
// (which chunks get kept) lives entirely in the main-thread recorder class.
class PCMWorkletProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length) {
      // .slice(0) copies the buffer — the original gets reused/GC'd by the audio engine
      this.port.postMessage(input[0].slice(0));
    }
    return true; // keep processor alive
  }
}

registerProcessor('pcm-worklet-processor', PCMWorkletProcessor);
