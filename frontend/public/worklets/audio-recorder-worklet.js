/**
 * Audio Recorder Worklet — captures mic audio, downsamples to 16 kHz,
 * and posts Float32Array chunks to the main thread.
 *
 * Gemini Live API expects 16-bit PCM at 16 kHz mono.
 * The main thread converts Float32 → Int16 → Base64 before sending.
 */
class AudioRecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._targetRate = 16000;
    this._contextRate = sampleRate; // AudioWorkletGlobalScope.sampleRate
    this._bufferSize = 2048;
    this._bytesWritten = 0;
    this._buffer = new Float32Array(this._bufferSize);
  }

  /**
   * Linear-interpolation downsample from contextRate to targetRate.
   * If rates match, returns input unchanged.
   */
  _downsample(inputData) {
    if (this._contextRate === this._targetRate) return inputData;
    const ratio = this._contextRate / this._targetRate;
    const outputLength = Math.round(inputData.length / ratio);
    if (outputLength === 0) return null;
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const lo = Math.floor(srcIndex);
      const hi = Math.min(lo + 1, inputData.length - 1);
      const frac = srcIndex - lo;
      output[i] = inputData[lo] * (1 - frac) + inputData[hi] * frac;
    }
    return output;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const raw = input[0]; // mono channel
    const downsampled = this._downsample(raw);
    if (!downsampled) return true;

    for (let i = 0; i < downsampled.length; i++) {
      this._buffer[this._bytesWritten++] = downsampled[i];
      if (this._bytesWritten >= this._bufferSize) {
        this.port.postMessage(this._buffer.slice(0));
        this._bytesWritten = 0;
      }
    }
    return true;
  }
}

registerProcessor("audio-recorder-worklet", AudioRecorderWorklet);
