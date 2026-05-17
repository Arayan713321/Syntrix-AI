"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useInterviewCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [recordingURL, setRecordingURL] = useState<string | null>(null);

  // Stop camera tracks helper
  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraEnabled(false);
  }, []);

  // Request user camera and microphone permission & initialize recording stream
  const startRecording = useCallback(async () => {
    try {
      setPermissionDenied(false);
      setRecordingURL(null);
      chunksRef.current = [];

      // Request both camera and audio tracks
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          facingMode: "user"
        },
        audio: true
      });

      streamRef.current = stream;

      // Attach stream to live video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraEnabled(true);

      // Determine standard container support for browser compatibility (Chrome/Edge VP9/Opus, Safari fallback)
      let mimeType = "video/webm;codecs=vp9,opus";
      if (typeof MediaRecorder !== "undefined") {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm;codecs=vp8,opus";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "video/webm";
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = "video/mp4"; // Safari fallback
            }
          }
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const finalBlob = new Blob(chunksRef.current, { type: mimeType });
          const finalURL = URL.createObjectURL(finalBlob);
          setRecordingURL(finalURL);

          // Save copy inside sessionStorage to survive post-session page switches
          try {
            sessionStorage.setItem("syntrix_last_interview_recording_blob", finalURL);
          } catch (_) {}
        };

        recorder.start(1000); // stream in chunks every 1 second
        setIsRecording(true);
      }
    } catch (error: any) {
      console.error("[useInterviewCamera] User declined camera or device error:", error);
      setPermissionDenied(true);
      setCameraEnabled(false);
      setIsRecording(false);
    }
  }, []);

  // Stop recording stream, finalize WebM blobs, and release user devices
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    stopAllTracks();
  }, [stopAllTracks]);

  // Toggle video stream state on/off mid-recording
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextEnabled = !videoTracks[0].enabled;
        videoTracks.forEach((track) => {
          track.enabled = nextEnabled;
        });
        setCameraEnabled(nextEnabled);
      }
    }
  }, []);

  // Trigger client-side browser download event for the finalized WebM stream
  const downloadRecording = useCallback(() => {
    const finalURL = recordingURL || sessionStorage.getItem("syntrix_last_interview_recording_blob");
    if (finalURL) {
      const downloadLink = document.createElement("a");
      downloadLink.href = finalURL;
      downloadLink.download = `syntrix-interview-${Date.now()}.webm`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  }, [recordingURL]);

  // Release user camera stream on component unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
    };
  }, [stopAllTracks]);

  return {
    videoRef,
    isRecording,
    cameraEnabled,
    permissionDenied,
    startRecording,
    stopRecording,
    downloadRecording,
    recordingURL,
    toggleCamera
  };
}
