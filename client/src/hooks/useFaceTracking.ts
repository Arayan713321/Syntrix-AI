import * as faceapi from "face-api.js";
import { useRef, useState, useEffect, useCallback } from "react";

export interface FaceMetrics {
  eyeContact: number;        // 0-100 score
  attentiveness: number;     // 0-100 score
  expressionLabel: string;   // "confident"|"nervous"|"neutral"|"engaged"|"low energy"|"uncomfortable"|"stressed"
  faceDetected: boolean;
  lookingAtCamera: boolean;
}

export function useFaceTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isActive: boolean
) {
  const [metrics, setMetrics] = useState<FaceMetrics>({
    eyeContact: 0,
    attentiveness: 0,
    expressionLabel: "neutral",
    faceDetected: false,
    lookingAtCamera: false
  });
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const eyeContactHistory = useRef<number[]>([]);

  // Load models from /models/ directory in public
  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models")
        ]);
        if (active) {
          setModelsLoaded(true);
          console.log("[FaceTracking] Models loaded successfully from public directory");
        }
      } catch (err) {
        console.error("[FaceTracking] Model load failed:", err);
      }
    };
    loadModels();
    return () => {
      active = false;
    };
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;
    try {
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!detection) {
        setMetrics(prev => ({
          ...prev,
          faceDetected: false,
          lookingAtCamera: false,
          eyeContact: Math.max(0, prev.eyeContact - 5)
        }));
        return;
      }

      // Calculate eye contact from landmark positions
      const landmarks = detection.landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const nose = landmarks.getNose();

      // Eye center vs nose center = gaze direction
      const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
      const noseCenterX = nose[3].x;
      const gazeOffset = Math.abs(eyeCenterX - noseCenterX);
      const lookingAtCamera = gazeOffset < 30;

      // Expression analysis
      const expressions = detection.expressions;
      const dominant = Object.entries(expressions)
        .sort((a, b) => b[1] - a[1])[0][0];

      const expressionMap: Record<string, string> = {
        happy: "confident",
        neutral: "neutral",
        surprised: "engaged",
        fearful: "nervous",
        sad: "low energy",
        disgusted: "uncomfortable",
        angry: "stressed"
      };

      // Rolling eye contact score
      eyeContactHistory.current.push(lookingAtCamera ? 100 : 0);
      if (eyeContactHistory.current.length > 30) {
        eyeContactHistory.current.shift();
      }
      const avgEyeContact = eyeContactHistory.current
        .reduce((a, b) => a + b, 0) /
        eyeContactHistory.current.length;

      setMetrics({
        eyeContact: Math.round(avgEyeContact),
        attentiveness: lookingAtCamera ? 
          Math.min(100, Math.round(detection.detection.score * 100)) : 40,
        expressionLabel: expressionMap[dominant] || "neutral",
        faceDetected: true,
        lookingAtCamera
      });
    } catch (err) {
      // Silent catch to prevent video crashing during frame shifts
    }
  }, [videoRef, modelsLoaded]);

  // Start/stop analysis loop
  useEffect(() => {
    if (isActive && modelsLoaded) {
      intervalRef.current = setInterval(analyzeFrame, 500);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, modelsLoaded, analyzeFrame]);

  return { metrics, modelsLoaded };
}
