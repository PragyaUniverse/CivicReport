import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";

// Use the browser SpeechRecognition API for voice→text.
// Falls back gracefully if unavailable.
type Props = { onTranscript: (text: string) => void };

export function VoiceRecorder({ onTranscript }: Props) {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    let finalText = "";
    r.onresult = (e: any) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interimText += t;
      }
      setInterim(interimText);
      if (finalText) onTranscript(finalText.trim());
    };
    r.onend = () => setRecording(false);
    recRef.current = r;
    return () => {
      try { r.stop(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    if (!recRef.current) return;
    if (recording) {
      recRef.current.stop();
      setRecording(false);
    } else {
      try {
        recRef.current.start();
        setRecording(true);
      } catch {}
    }
  };

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Voice input is not supported in this browser. Try Chrome on desktop or Android.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant={recording ? "destructive" : "secondary"} size="sm" onClick={toggle}>
        {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {recording ? "Stop" : "Speak"}
      </Button>
      {recording && (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Listening… {interim && <em className="not-italic text-foreground">{interim}</em>}
        </span>
      )}
    </div>
  );
}