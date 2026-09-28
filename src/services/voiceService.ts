
/**
 * Quetta Mahfil Neural Voice Core v1.5.0
 * Handles high-fidelity Urdu/English STT and TTS
 */

export interface VoiceCommandOptions {
  language?: 'ur-PK' | 'en-US';
  onTranscript?: (text: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

class VoiceService {
  private recognition: any = null;
  private synth: SpeechSynthesis = window.speechSynthesis;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
      }
    }
  }

  /**
   * Start listening for voice commands
   */
  startListening(options: VoiceCommandOptions) {
    if (!this.recognition) {
      options.onError?.("Voice systems not supported in this vessel.");
      return;
    }

    this.recognition.lang = options.language || 'en-US';
    
    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      options.onTranscript?.(finalTranscript || interimTranscript, !!finalTranscript);
    };

    this.recognition.onerror = (event: any) => {
      options.onError?.(event.error);
    };

    this.recognition.onend = () => {
      options.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn("Recognition already active");
    }
  }

  /**
   * Stop the neural receptors
   */
  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Speak back to the user with high-fidelity synthesis
   */
  speak(text: string, lang: 'ur-PK' | 'en-US' = 'en-US') {
    if (!this.synth) return;

    // Cancel existing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Attempt to find a natural voice for the language
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.synth.speak(utterance);
  }

  /**
   * Check if voice systems are ready
   */
  isAvailable(): boolean {
    return !!this.recognition;
  }
}

export const voiceCore = new VoiceService();
