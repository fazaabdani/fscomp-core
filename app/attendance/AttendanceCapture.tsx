"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, LocateFixed } from "lucide-react";

type LocationState = {
  latitude: string;
  longitude: string;
  accuracy: string;
};

export function AttendanceCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [location, setLocation] = useState<LocationState>({ latitude: "", longitude: "", accuracy: "" });
  const [status, setStatus] = useState("Aktifkan kamera dan lokasi sebelum absen.");

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("Kamera aktif. Ambil foto sebelum submit.");
    } catch {
      setStatus("Kamera belum diizinkan atau perangkat tidak tersedia.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setStatus("Kamera belum siap.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * 360);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.65));
    setStatus("Foto sudah diambil.");
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setStatus("Browser tidak mendukung lokasi.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          accuracy: String(Math.round(position.coords.accuracy))
        });
        setStatus(`Lokasi tersimpan, akurasi ${Math.round(position.coords.accuracy)} meter.`);
      },
      () => setStatus("Lokasi belum diizinkan atau gagal dibaca."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <div className="attendanceCapture">
      <input type="hidden" name="photoDataUrl" value={photoDataUrl} />
      <input type="hidden" name="latitude" value={location.latitude} />
      <input type="hidden" name="longitude" value={location.longitude} />
      <input type="hidden" name="accuracy" value={location.accuracy} />
      <video className="cameraPreview" ref={videoRef} autoPlay muted playsInline />
      <div className="buttonRow noMargin">
        <button className="secondaryButton" type="button" onClick={startCamera}><Camera size={16} /> Kamera</button>
        <button className="secondaryButton" type="button" onClick={capturePhoto}>Ambil Foto</button>
        <button className="secondaryButton" type="button" onClick={captureLocation}><LocateFixed size={16} /> Lokasi</button>
      </div>
      <small className="formHint">{status}</small>
      {photoDataUrl ? <img className="attendancePhotoPreview" src={photoDataUrl} alt="Foto absensi" /> : null}
      {location.latitude ? <small className="formHint">Koordinat: {location.latitude}, {location.longitude}</small> : null}
    </div>
  );
}
