import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * CameraCapture – A modal that streams the user's camera and lets them snap a photo.
 *
 * Props:
 *   onCapture(file: File) – called with a JPEG File when the user confirms the snapshot
 *   onClose()             – called when the modal should be dismissed
 */
const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [snapshot, setSnapshot] = useState(null);   // base64 data URL of the captured frame
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' = front, 'environment' = back
  const [cameraReady, setCameraReady] = useState(false);

  // ─── Start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing) => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access was denied. Please allow camera permissions in your browser and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  }, []);

  // ─── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Switch camera (front ↔ back) ──────────────────────────────────────────
  const handleSwitchCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    setSnapshot(null);
    startCamera(next);
  };

  // ─── Take snapshot ─────────────────────────────────────────────────────────
  const handleSnap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    // Mirror horizontally for front camera so the snap matches what you see
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL('image/jpeg', 0.92));
  };

  // ─── Retake ────────────────────────────────────────────────────────────────
  const handleRetake = () => {
    setSnapshot(null);
  };

  // ─── Use photo ─────────────────────────────────────────────────────────────
  const handleUsePhoto = () => {
    if (!snapshot) return;
    const canvas = canvasRef.current;
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], `camera_photo_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        onCapture(file);
      },
      'image/jpeg',
      0.92
    );
  };

  // ─── Close ─────────────────────────────────────────────────────────────────
  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📷</span>
            <h2 className="text-lg font-bold text-gray-800">Take a Photo</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none transition-colors"
            aria-label="Close camera"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="text-5xl">🚫</span>
              <p className="text-red-600 text-sm font-medium">{error}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:brightness-90 transition"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Camera / snapshot view */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                {/* Live feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{
                    display: snapshot ? 'none' : 'block',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                  }}
                />

                {/* Snapshot preview */}
                {snapshot && (
                  <img
                    src={snapshot}
                    alt="Captured"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Loading indicator */}
                {!cameraReady && !snapshot && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="flex flex-col items-center gap-2 text-white">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Starting camera…</span>
                    </div>
                  </div>
                )}

                {/* Switch camera button (only while live) */}
                {cameraReady && !snapshot && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    title="Switch camera"
                    className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-9 h-9 flex items-center justify-center transition"
                  >
                    🔄
                  </button>
                )}
              </div>

              {/* Hidden canvas for pixel capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                {!snapshot ? (
                  <button
                    type="button"
                    onClick={handleSnap}
                    disabled={!cameraReady}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:brightness-90 transition shadow-md"
                  >
                    <span className="text-lg">📸</span>
                    Snap Photo
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition"
                    >
                      🔁 Retake
                    </button>
                    <button
                      type="button"
                      onClick={handleUsePhoto}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition shadow-md"
                    >
                      ✅ Use This Photo
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
