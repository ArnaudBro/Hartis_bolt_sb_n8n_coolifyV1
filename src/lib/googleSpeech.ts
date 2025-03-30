import { config } from '../config';

// Browser-compatible version of the speech service
interface SpeechResult {
  timestamp: number;
  text: string;
}

class BrowserSpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;

  constructor() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.configureRecognition();
    }
  }

  private configureRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = config.speech.language;
  }

  async startStreaming(
    onData: (result: SpeechResult) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (!this.recognition) {
      onError(new Error('Speech recognition is not supported in this browser'));
      return;
    }

    if (this.isListening) {
      return;
    }

    try {
      this.recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
          onData({
            timestamp: Date.now(),
            text: result[0].transcript
          });
        }
      };

      this.recognition.onerror = (event) => {
        onError(new Error(event.error));
      };

      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to start speech recognition'));
    }
  }

  async stopStreaming(): Promise<void> {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // This method is kept for API compatibility but uses browser's speech recognition
  async convertAudioToText(audioData: Float32Array): Promise<string> {
    throw new Error('Direct audio conversion is not supported in the browser. Please use streaming recognition instead.');
  }
}

export const googleSpeechService = new BrowserSpeechService();