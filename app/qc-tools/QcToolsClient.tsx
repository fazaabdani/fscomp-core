"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Keyboard, Mic, Monitor, Volume2 } from "lucide-react";

const screenColors = [
  { label: "Putih", value: "#ffffff" },
  { label: "Hitam", value: "#000000" },
  { label: "Merah", value: "#ff0000" },
  { label: "Hijau", value: "#00ff00" },
  { label: "Biru", value: "#0000ff" },
  { label: "Kuning", value: "#ffff00" }
];

const keyboardRows = [
  ["Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "PrintScreen", "ScrollLock", "Pause"],
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["CapsLock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
  ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
  ["Control", "Meta", "Alt", "Space", "Alt", "Control", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]
];

const keyLabels: Record<string, string> = {
  " ": "Space",
  Control: "Ctrl",
  Meta: "Win",
  ArrowLeft: "Left",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowRight: "Right",
  PrintScreen: "Prt Sc",
  ScrollLock: "Scr Lk",
  CapsLock: "Caps",
  Backspace: "Backspace"
};

function keyName(key: string) {
  return key === " " ? "Space" : key;
}

function keyLabel(key: string) {
  return keyLabels[key] ?? key.toUpperCase();
}

export function QcToolsClient() {
  const [screenColor, setScreenColor] = useState(screenColors[0].value);
  const [isScreenOpen, setIsScreenOpen] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [micStatus, setMicStatus] = useState("Belum dites");
  const [cameraStatus, setCameraStatus] = useState("Belum dites");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  function markKey(key: string) {
    setPressedKeys((current) => [key, ...current.filter((item) => item !== key)].slice(0, 80));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = keyName(event.key);
      markKey(key);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function startMicTest() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const data = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      setMicStatus("Mic aktif, coba bicara");

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const average = data.reduce((sum, value) => sum + value, 0) / data.length;
        setMicLevel(Math.min(100, Math.round(average)));
        animationRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch {
      setMicStatus("Mic tidak bisa diakses");
    }
  }

  async function startCameraTest() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus("Kamera aktif");
    } catch {
      setCameraStatus("Kamera tidak bisa diakses");
    }
  }

  function playTone(channel: "left" | "right") {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const merger = audioContext.createChannelMerger(2);

    oscillator.frequency.value = 520;
    gain.gain.value = 0.18;
    oscillator.connect(gain);
    gain.connect(merger, 0, channel === "left" ? 0 : 1);
    merger.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.55);
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      void audioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="qcToolsGrid">
      <section className="panel qcToolPanel keyboardToolPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Keyboard</p>
            <h2>Key tester</h2>
          </div>
          <Keyboard size={22} />
        </div>
        <div className="visualKeyboard">
          {keyboardRows.map((row, rowIndex) => (
            <div className="keyboardRow" key={`row-${rowIndex}`}>
              {row.map((key, index) => {
                const active = pressedKeys.includes(key) || pressedKeys.includes(key.toLowerCase()) || pressedKeys.includes(key.toUpperCase());
                const wideClass = key === "Space" ? "keySpace" : ["Backspace", "CapsLock", "Enter", "Shift"].includes(key) ? "keyWide" : "";
                return (
                  <button
                    className={`keyboardKey ${active ? "activeKey" : ""} ${wideClass}`}
                    key={`${key}-${index}`}
                    type="button"
                    onClick={() => markKey(key)}
                  >
                    {keyLabel(key)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="keyGrid">
          {pressedKeys.length === 0 ? <span className="emptyKey">Tekan tombol apa saja</span> : pressedKeys.map((key) => <span key={key}>{key}</span>)}
        </div>
        <button className="secondaryButton" type="button" onClick={() => setPressedKeys([])}>Reset tombol</button>
      </section>

      <section className="panel qcToolPanel displayToolPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Display</p>
            <h2>Test layar dan dead pixel</h2>
          </div>
          <Monitor size={22} />
        </div>
        <div className="swatchGrid">
          {screenColors.map((color) => (
            <button
              className="swatchButton"
              type="button"
              key={color.value}
              style={{ background: color.value, color: color.value === "#000000" ? "#ffffff" : "#111827" }}
              onClick={() => setScreenColor(color.value)}
            >
              {color.label}
            </button>
          ))}
        </div>
        <button className="primaryButton" type="button" onClick={() => setIsScreenOpen(true)}>Buka Fullscreen Test</button>
      </section>

      <section className="panel qcToolPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Audio</p>
            <h2>Mic dan speaker</h2>
          </div>
          <Mic size={22} />
        </div>
        <button className="primaryButton" type="button" onClick={startMicTest}>Mulai Test Mic</button>
        <div className="meterShell"><span style={{ width: `${micLevel}%` }} /></div>
        <small>{micStatus}</small>
        <div className="buttonRow">
          <button className="secondaryButton" type="button" onClick={() => playTone("left")}><Volume2 size={17} /> Speaker kiri</button>
          <button className="secondaryButton" type="button" onClick={() => playTone("right")}><Volume2 size={17} /> Speaker kanan</button>
        </div>
      </section>

      <section className="panel qcToolPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Camera</p>
            <h2>Webcam preview</h2>
          </div>
          <Camera size={22} />
        </div>
        <video className="cameraPreview" ref={videoRef} autoPlay muted playsInline />
        <button className="primaryButton" type="button" onClick={startCameraTest}>Mulai Test Kamera</button>
        <small>{cameraStatus}</small>
      </section>

      {isScreenOpen ? (
        <div className="screenOverlay" style={{ background: screenColor }}>
          <button type="button" onClick={() => setIsScreenOpen(false)}>Tutup test layar</button>
        </div>
      ) : null}
    </div>
  );
}
