class AudioPlayerWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._inputRate = 24000;
    this._outputRate = sampleRate;
    this.queue = [];
    this.port.onmessage = (event) => {
      if (event.data) {
        const resampled = this._resample(event.data);
        this.queue.push(resampled);
      }
    };
  }

  _resample(inputData) {
    if (this._inputRate === this._outputRate) return inputData;
    const ratio = this._inputRate / this._outputRate;
    const outputLength = Math.round(inputData.length / ratio);
    if (outputLength === 0) return inputData;
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

  process(inputs, outputs) {
    const output = outputs[0];
    const channel = output[0];

    if (this.queue.length > 0) {
      let outputIndex = 0;
      while (outputIndex < channel.length && this.queue.length > 0) {
        const currentBuffer = this.queue[0];
        const remainingSpace = channel.length - outputIndex;

        if (currentBuffer.length <= remainingSpace) {
          channel.set(currentBuffer, outputIndex);
          outputIndex += currentBuffer.length;
          this.queue.shift();
        } else {
          channel.set(currentBuffer.subarray(0, remainingSpace), outputIndex);
          this.queue[0] = currentBuffer.subarray(remainingSpace);
          outputIndex += remainingSpace;
        }
      }

      for (let i = 1; i < output.length; i++) {
        output[i].set(channel);
      }
    } else {
      channel.fill(0);
      for (let i = 1; i < output.length; i++) {
        output[i].fill(0);
      }
    }
    return true;
  }
}

registerProcessor("audio-player-worklet", AudioPlayerWorklet);
