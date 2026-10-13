export interface AudioRecorderState {
  audioBlob: Blob | null;
  // 0 à 100 pour le visualiseur audio
  audioLevel: number;
  audioUrl: string | null;
  error: string | null;
  isRecording: boolean;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private readonly onLevelChange?: (level: number) => void;

  constructor(onLevelChange?: (level: number) => void) {
    this.onLevelChange = onLevelChange;
  }

  async start(): Promise<void> {
    this.audioChunks = [];

    // Demande d'accès au micro
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // Configuration de l'analyseur de niveau audio pour le retour visuel
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this.monitorAudioLevel();
      }
    } catch (error) {
      console.warn("Visualiseur audio non supporté :", error);
    }

    // Détermination du meilleur mimeType supporté
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    let selectedMime = "";
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMime = type;
        break;
      }
    }

    this.mediaRecorder = selectedMime
      ? new MediaRecorder(this.stream, { mimeType: selectedMime })
      : new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Découpage par morceaux de 500ms
    this.mediaRecorder.start(500);
  }

  private monitorAudioLevel() {
    if (!this.analyser) {
      return;
    }
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (!this.analyser) {
        return;
      }
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (const val of dataArray) {
        sum += val;
      }
      const avg = sum / dataArray.length;
      // Normaliser entre 0 et 100 avec amplification pour bonne réactivité
      const level = Math.min(100, Math.round((avg / 128) * 100));
      if (this.onLevelChange) {
        this.onLevelChange(level);
      }
      this.animationFrameId = requestAnimationFrame(update);
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  stop(): Promise<Blob> {
    if (!this.mediaRecorder) {
      return Promise.reject(new Error("Aucun enregistrement en cours."));
    }

    const { promise, resolve } = Promise.withResolvers<Blob>();

    this.mediaRecorder.onstop = () => {
      const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
      const blob = new Blob(this.audioChunks, { type: mimeType });
      this.cleanup();
      resolve(blob);
    };

    if (this.mediaRecorder.state === "inactive") {
      const blob = new Blob(this.audioChunks, { type: "audio/webm" });
      this.cleanup();
      resolve(blob);
    } else {
      this.mediaRecorder.stop();
    }

    return promise;
  }

  private cleanup() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(console.debug);
      this.audioContext = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    if (this.onLevelChange) {
      this.onLevelChange(0);
    }
  }

  abort() {
    this.cleanup();
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch (error) {
        console.warn("Erreur arrêt MediaRecorder :", error);
      }
    }
  }
}
