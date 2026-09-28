import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, CameraDevice } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  FlipHorizontal, 
  Zap, 
  ZapOff, 
  Upload, 
  ShieldCheck, 
  ShieldAlert, 
  X, 
  Sparkles, 
  RefreshCw, 
  Coffee, 
  AlertTriangle,
  Lock,
  Maximize2,
  Minimize2,
  CheckCircle2,
  XCircle,
  QrCode,
  ArrowRight,
  UserCheck,
  BadgeCheck
} from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';

export type ScanFeedbackType = 'success' | 'failed' | null;

export interface ScanFeedbackState {
  type: ScanFeedbackType;
  title: string;
  message: string;
  code?: string;
}

export interface QRScannerProps {
  onScan: (decodedText: string) => void | Promise<boolean | void>;
  onError?: (error: string) => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  facingMode?: 'environment' | 'user';
  showTorchToggle?: boolean;
  showCameraFlip?: boolean;
  showUploadOption?: boolean;
  autoStart?: boolean;
  fullScreen?: boolean;
  onToggleFullScreen?: (isFull: boolean) => void;
  className?: string;
  externalFeedback?: ScanFeedbackState | null;
}

type PermissionStatus = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported';

export default function QRScanner({
  onScan,
  onError,
  onClose,
  title = 'Quetta Mahfil Scanner',
  subtitle = 'Scan patron pass, table QR, or loyalty token',
  facingMode: initialFacingMode = 'environment',
  showTorchToggle = true,
  showCameraFlip = true,
  showUploadOption = true,
  autoStart = false,
  fullScreen = true,
  onToggleFullScreen,
  className,
  externalFeedback
}: QRScannerProps) {
  const containerId = useRef(`mahfil-qr-reader-${Math.random().toString(36).substring(2, 9)}`).current;
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Layout & Mode States
  const [isFullScreen, setIsFullScreen] = useState(fullScreen);

  // Permission & Stream States
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const [permissionErrorDetail, setPermissionErrorDetail] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>(initialFacingMode);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);

  // Visual Feedback Indicator State (Internal or External)
  const [internalFeedback, setInternalFeedback] = useState<ScanFeedbackState | null>(null);
  const activeFeedback = externalFeedback !== undefined ? externalFeedback : internalFeedback;

  // Audio Chime on scan
  const playSoundEffect = useCallback((type: 'success' | 'failed') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880.0, audioCtx.currentTime + 0.1); // A5
        osc.frequency.exponentialRampToValueAtTime(1174.66, audioCtx.currentTime + 0.2); // D6
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260.0, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140.0, audioCtx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch {
      // AudioContext unavailable or autoplay blocked
    }
  }, []);

  // Keyboard navigation (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 1. Initial Permission Query Check
  const checkCameraPermission = useCallback(async () => {
    setPermissionStatus('checking');
    setPermissionErrorDetail(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('unsupported');
      return;
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const res = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (res.state === 'granted') {
            setPermissionStatus('granted');
            return;
          } else if (res.state === 'denied') {
            setPermissionStatus('denied');
            setPermissionErrorDetail('Camera access was blocked in browser settings. Please permit camera access to scan.');
            return;
          }
        } catch {
          // navigator.permissions query not supported
        }
      }

      if (!autoStart) {
        setPermissionStatus('prompt');
      } else {
        requestCameraAccess();
      }
    } catch {
      setPermissionStatus('prompt');
    }
  }, [autoStart]);

  useEffect(() => {
    checkCameraPermission();
  }, [checkCameraPermission]);

  // Clean up scanner helper
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Failed to stop html5-qrcode scanner cleanly:", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setIsTorchOn(false);
  }, []);

  // 2. Request Camera Access & Start Scanner via html5-qrcode
  const requestCameraAccess = async () => {
    triggerHaptic('medium');
    setPermissionErrorDetail(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('unsupported');
      return;
    }

    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode }
      });
      
      testStream.getTracks().forEach((track) => track.stop());
      setPermissionStatus('granted');
      await startHtml5Scanner(currentFacingMode);
    } catch (err: any) {
      console.warn("Camera permission request failed:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        setPermissionErrorDetail('Camera permission was blocked. Please tap the lock icon in your address bar to allow camera access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionStatus('unsupported');
        setPermissionErrorDetail('No video capture hardware found on this device.');
      } else {
        setPermissionStatus('denied');
        setPermissionErrorDetail(err.message || 'Unable to access camera device.');
      }
      if (onError) onError(err.message || 'Camera permission denied');
    }
  };

  // 3. Start html5-qrcode instance
  const startHtml5Scanner = async (facing: 'environment' | 'user') => {
    await stopScanner();

    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const qrScanner = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A
        ],
        verbose: false
      });

      html5QrCodeRef.current = qrScanner;

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
        }
      } catch {
        // Proceed with constraint
      }

      const cameraConfig = { facingMode: facing };
      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(220, Math.floor(edge * 0.72));
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: isFullScreen ? undefined : 1.0
      };

      await qrScanner.start(
        cameraConfig,
        qrConfig,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Regular frame scanning ticks
        }
      );

      setIsScanning(true);

      try {
        const capabilities: any = qrScanner.getRunningTrackCapabilities();
        setHasTorch(Boolean(capabilities && capabilities.torch));
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error("Html5Qrcode start error:", err);
      setIsScanning(false);
      setPermissionStatus('denied');
      setPermissionErrorDetail('Failed to initialize viewfinder stream. Please retry or use photo upload.');
      if (onError) onError(err.message || 'Scanner start error');
    }
  };

  // Process Successful Scan with Visual Feedback Animation
  const handleSuccessfulScan = async (decodedText: string) => {
    if (scanCooldown) return;
    setScanCooldown(true);

    // Validate QR format or determine status
    const isValidFormat = Boolean(decodedText && decodedText.trim().length > 0);

    if (isValidFormat) {
      // Trigger Success Feedback
      triggerHaptic('success');
      playSoundEffect('success');
      
      setInternalFeedback({
        type: 'success',
        title: 'QR Code Verified',
        message: 'Pass authenticated successfully. Loading patron profile...',
        code: decodedText
      });

      try {
        await onScan(decodedText);
      } catch (err: any) {
        // If parent reports an error during processing, switch to failed feedback!
        triggerHaptic('error');
        playSoundEffect('failed');
        setInternalFeedback({
          type: 'failed',
          title: 'Verification Failed',
          message: err?.message || 'The scanned QR code is invalid or expired for this restaurant node.',
          code: decodedText
        });
      }
    } else {
      // Trigger Failed Feedback
      triggerHaptic('error');
      playSoundEffect('failed');
      setInternalFeedback({
        type: 'failed',
        title: 'Unrecognized Code',
        message: 'The code could not be verified. Ensure it belongs to Quetta Mahfil Chai Khana.',
        code: decodedText
      });
    }

    // Auto-dismiss or reset scan cooldown
    setTimeout(() => {
      setScanCooldown(false);
    }, 2800);
  };

  // Flip front/rear camera with animation
  const handleFlipCamera = async () => {
    triggerHaptic('medium');
    setIsFlipping(true);
    const nextFacing = currentFacingMode === 'environment' ? 'user' : 'environment';
    setCurrentFacingMode(nextFacing);
    if (isScanning) {
      await startHtml5Scanner(nextFacing);
    }
    setTimeout(() => setIsFlipping(false), 500);
  };

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current) return;
    triggerHaptic('light');
    try {
      const nextTorch = !isTorchOn;
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn("Torch constraint error:", err);
    }
  };

  // Toggle FullScreen Mode
  const toggleFullScreenMode = () => {
    triggerHaptic('light');
    const nextState = !isFullScreen;
    setIsFullScreen(nextState);
    if (onToggleFullScreen) onToggleFullScreen(nextState);
  };

  // Photo File Upload Fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('medium');
    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(containerId, { verbose: false });
        html5QrCodeRef.current = scanner;
      }

      const decoded = await scanner.scanFile(file, true);
      if (decoded) {
        handleSuccessfulScan(decoded);
      }
    } catch (err: any) {
      console.warn("File scan error:", err);
      triggerHaptic('error');
      playSoundEffect('failed');
      setInternalFeedback({
        type: 'failed',
        title: 'No QR Code Detected',
        message: 'Please make sure the QR pass image is clear, sharp, and properly oriented.'
      });
      if (onError) onError("Failed to parse QR from file");
    } finally {
      e.target.value = '';
    }
  };

  // Reset Feedback and Resume Scanning
  const resetFeedback = () => {
    triggerHaptic('light');
    setInternalFeedback(null);
    setScanCooldown(false);
  };

  // Auto-start scanner if permission is already granted
  useEffect(() => {
    if (permissionStatus === 'granted' && !isScanning) {
      startHtml5Scanner(currentFacingMode);
    }
    return () => {
      stopScanner();
    };
  }, [permissionStatus]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Container styling based on full-screen overlay vs embedded mode
  const containerClasses = isFullScreen
    ? "fixed inset-0 z-[2000] w-full h-[100dvh] bg-stone-950 text-white flex flex-col justify-between overflow-hidden select-none"
    : cn(
        "relative w-full max-w-md mx-auto bg-stone-950 text-white rounded-3xl overflow-hidden border border-stone-800 shadow-2xl flex flex-col",
        className
      );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={containerClasses}
    >
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* TOP FLOATING OVERLAY HEADER BAR */}
      <header className="relative z-30 w-full px-4 sm:px-6 pt-4 pb-3 sm:pt-6 flex items-center justify-between bg-gradient-to-b from-stone-950/90 via-stone-950/50 to-transparent backdrop-blur-[2px]">
        {/* Left: Mahfil Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C85A32]/25 border border-[#E5A84B]/40 text-[#E5A84B] flex items-center justify-center shadow-lg shadow-[#C85A32]/10 backdrop-blur-md">
            <Coffee size={20} className="text-[#E5A84B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-base sm:text-lg text-stone-100 tracking-wide">
                {title}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[#C85A32]/30 text-[#E5A84B] border border-[#E5A84B]/30">
                محفل
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-400">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Controls (Torch, Flip Camera, Fullscreen, Close) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Torch Toggle */}
          {showTorchToggle && hasTorch && (
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleToggleTorch}
              className={cn(
                "p-2.5 sm:p-3 rounded-2xl backdrop-blur-md border transition-all duration-200",
                isTorchOn
                  ? "bg-[#E5A84B] text-stone-950 border-[#E5A84B] shadow-lg shadow-[#E5A84B]/30"
                  : "bg-stone-900/80 text-stone-300 border-white/10 hover:bg-stone-800"
              )}
              title={isTorchOn ? "Turn Torch Off" : "Turn Torch On"}
              aria-label="Toggle Flashlight"
            >
              {isTorchOn ? <Zap size={18} /> : <ZapOff size={18} />}
            </motion.button>
          )}

          {/* Camera Flip (Front / Rear) */}
          {showCameraFlip && (
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleFlipCamera}
              className="p-2.5 sm:p-3 rounded-2xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-white/10 backdrop-blur-md transition-all shadow-md"
              title={`Switch Camera (Currently ${currentFacingMode === 'environment' ? 'Rear' : 'Front'})`}
              aria-label="Switch Camera Facing"
            >
              <motion.div animate={{ rotate: isFlipping ? 180 : 0 }} transition={{ duration: 0.35 }}>
                <FlipHorizontal size={18} />
              </motion.div>
            </motion.button>
          )}

          {/* FullScreen Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleFullScreenMode}
            className="p-2.5 sm:p-3 rounded-2xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-white/10 backdrop-blur-md transition-all shadow-md"
            title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </motion.button>

          {/* Close Button */}
          {onClose && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic('light');
                stopScanner();
                onClose();
              }}
              className="p-2.5 sm:p-3 rounded-2xl bg-[#C85A32]/90 hover:bg-[#C85A32] text-white border border-[#E5A84B]/30 backdrop-blur-md shadow-lg shadow-[#C85A32]/25 transition-all"
              title="Close Scanner (Esc)"
              aria-label="Close Scanner"
            >
              <X size={18} />
            </motion.button>
          )}
        </div>
      </header>

      {/* MAIN VIEWPORT CAMERA CANVAS */}
      <main className="relative flex-1 w-full bg-black overflow-hidden flex items-center justify-center">
        {/* DOM node where html5-qrcode attaches video element */}
        <div
          id={containerId}
          className={cn(
            "w-full h-full object-cover",
            permissionStatus !== 'granted' && "hidden"
          )}
        />

        {/* STATE 1: 'PROMPT' PERMISSION CHECK VIEW */}
        <AnimatePresence>
          {(permissionStatus === 'prompt' || permissionStatus === 'checking') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-stone-900 via-stone-950 to-black z-30 space-y-5"
            >
              {/* Mahfil Heritage Badge */}
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#C85A32] to-[#B34D28] flex items-center justify-center shadow-2xl border-2 border-[#E5A84B]/40">
                  <Camera size={38} className="text-white drop-shadow-md" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#E5A84B] text-stone-950 flex items-center justify-center shadow-md">
                  <ShieldCheck size={18} />
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <span className="text-[11px] font-bold tracking-widest uppercase text-[#E5A84B]">
                  Camera Permission Required
                </span>
                <h3 className="font-display font-bold text-xl sm:text-2xl text-white">
                  Allow Camera to Scan Pass
                </h3>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                  Enable your camera to automatically scan patron loyalty passes, table seating codes, and digital receipt tokens.
                </p>
              </div>

              {/* Privacy Notice Card */}
              <div className="px-4 py-2.5 rounded-2xl bg-stone-900/90 border border-stone-800 text-xs text-stone-300 flex items-center gap-2.5 max-w-sm shadow-md">
                <Lock size={15} className="text-[#E5A84B] flex-shrink-0" />
                <span className="text-left text-[11px]">
                  Camera frames are analyzed strictly on your device. Video is never uploaded or saved.
                </span>
              </div>

              {/* Grant Camera Access Button */}
              <div className="w-full max-w-xs pt-2 space-y-2.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={requestCameraAccess}
                  className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#C85A32] to-[#D96B43] hover:from-[#B34D28] hover:to-[#C85A32] text-white font-bold text-sm shadow-xl shadow-[#C85A32]/30 flex items-center justify-center gap-2.5 transition-all"
                >
                  <Camera size={18} />
                  <span>Grant Camera Access</span>
                </motion.button>

                {showUploadOption && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-semibold text-xs border border-stone-800 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Upload size={14} />
                    <span>Upload QR Image Instead</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATE 2: 'DENIED' PERMISSION VIEW */}
        <AnimatePresence>
          {permissionStatus === 'denied' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-stone-950 z-30 space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <CameraOff size={32} />
              </div>

              <div className="space-y-1.5 max-w-xs">
                <h4 className="font-bold text-lg text-white">Camera Access Denied</h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  {permissionErrorDetail || "Camera permission is blocked in your browser settings."}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800 text-left text-xs text-stone-300 space-y-1 max-w-xs">
                <p className="font-semibold text-[#E5A84B]">To enable camera:</p>
                <p>1. Tap the lock/permissions icon in your browser URL bar.</p>
                <p>2. Toggle Camera to "Allow".</p>
                <p>3. Tap "Try Again" below.</p>
              </div>

              <div className="w-full max-w-xs space-y-2">
                <button
                  onClick={requestCameraAccess}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#C85A32] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
                >
                  <RefreshCw size={15} />
                  <span>Try Again</span>
                </button>

                {showUploadOption && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-900 text-stone-300 text-xs font-semibold border border-stone-800 flex items-center justify-center gap-2"
                  >
                    <Upload size={14} />
                    <span>Upload QR Image File</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATE 3: 'UNSUPPORTED' HARDWARE VIEW */}
        <AnimatePresence>
          {permissionStatus === 'unsupported' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-stone-950 z-30 space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[#E5A84B] flex items-center justify-center">
                <AlertTriangle size={32} />
              </div>

              <div className="space-y-1 max-w-xs">
                <h4 className="font-bold text-base text-white">Camera Hardware Unavailable</h4>
                <p className="text-xs text-stone-400">
                  {permissionErrorDetail || "We could not access a video capture device on this browser or connection."}
                </p>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-3 px-5 rounded-xl bg-[#C85A32] text-white text-xs font-bold flex items-center gap-2 shadow-lg"
              >
                <Upload size={15} />
                <span>Upload QR Image Instead</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ACTIVE VIEWFINDER RETICLE OVERLAY */}
        {permissionStatus === 'granted' && isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            {/* Vignette Shadow Mask */}
            <div className="absolute inset-0 bg-black/45" />

            {/* Viewfinder Target Reticle with Dynamic Animation on feedback */}
            <motion.div
              animate={{
                scale: activeFeedback?.type === 'success' ? [1, 1.04, 1] : activeFeedback?.type === 'failed' ? [1, 0.96, 1] : 1,
                x: activeFeedback?.type === 'failed' ? [-12, 12, -8, 8, -4, 4, 0] : 0
              }}
              transition={{ duration: 0.4 }}
              className={cn(
                "relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.52)] transition-colors duration-300",
                activeFeedback?.type === 'success'
                  ? "border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.55)]"
                  : activeFeedback?.type === 'failed'
                  ? "border-2 border-rose-500 shadow-[0_0_40px_rgba(239,68,68,0.55)]"
                  : "border border-[#E5A84B]/40"
              )}
            >
              {/* Mahfil Heritage Corner Brackets */}
              {/* Top-Left */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-[4px] border-l-[4px] border-[#E5A84B] rounded-tl-xl" />
              <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-[#C85A32]" />

              {/* Top-Right */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t-[4px] border-r-[4px] border-[#E5A84B] rounded-tr-xl" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-[#C85A32]" />

              {/* Bottom-Left */}
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[4px] border-l-[4px] border-[#E5A84B] rounded-bl-xl" />
              <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-[#C85A32]" />

              {/* Bottom-Right */}
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[4px] border-r-[4px] border-[#E5A84B] rounded-br-xl" />
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-[#C85A32]" />

              {/* Central Mahfil Watermark */}
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-15">
                <Coffee size={60} className="text-[#E5A84B]" />
                <span className="font-display font-black text-[11px] tracking-widest text-white mt-1">
                  QUETTA MAHFIL
                </span>
              </div>

              {/* Animated Terracotta Laser Line (Active when scanning and no feedback) */}
              {!activeFeedback && (
                <motion.div
                  animate={{
                    y: [0, 280, 0]
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-full h-1 bg-gradient-to-r from-transparent via-[#C85A32] to-transparent shadow-[0_0_15px_#C85A32]"
                />
              )}
            </motion.div>

            {/* Instruction Banner Below Viewfinder */}
            {!activeFeedback && (
              <div className="absolute bottom-6 inset-x-0 text-center px-4">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-stone-200 text-xs font-medium border border-white/10 shadow-xl">
                  <Sparkles size={12} className="text-[#E5A84B]" />
                  <span>Align Quetta Mahfil QR inside brackets</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* VISUAL FEEDBACK INDICATOR OVERLAY (FRAMER MOTION ANIMATION) */}
        <AnimatePresence>
          {activeFeedback && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            >
              {/* SUCCESS IDENTITY VERIFICATION VISUAL FEEDBACK CARD */}
              {activeFeedback.type === 'success' && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0, y: 24 }}
                  animate={{ scale: [0.6, 1.04, 1], opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="w-full max-w-sm bg-gradient-to-b from-stone-900 via-stone-950 to-black rounded-3xl p-6 border-2 border-emerald-500/80 shadow-[0_0_60px_rgba(16,185,129,0.45)] text-center space-y-4"
                >
                  {/* Animated Badge & Checkmark Drawing */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                      className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                    >
                      <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                          d="M20 6L9 17l-5-5"
                        />
                      </svg>
                    </motion.div>
                    {/* Animated Pulsing Ring */}
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-2 border-emerald-400"
                    />
                    {/* Verified Patron Floating Badge */}
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-stone-950 shadow-md"
                    >
                      <BadgeCheck size={16} strokeWidth={2.5} />
                    </motion.div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold tracking-wider uppercase">
                      <UserCheck size={12} className="text-emerald-400" />
                      <span>Identity Verified • تصدیق شدہ</span>
                    </div>
                    <h3 className="font-display font-bold text-xl text-white">
                      {activeFeedback.title}
                    </h3>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {activeFeedback.message}
                    </p>
                  </div>

                  {activeFeedback.code && (
                    <div className="p-2.5 rounded-xl bg-stone-900 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 flex items-center justify-between gap-2">
                      <span className="text-stone-400 font-sans text-[10px] uppercase font-bold tracking-wider">Auth Token</span>
                      <span className="truncate max-w-[200px]">{activeFeedback.code}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={resetFeedback}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <QrCode size={15} />
                      <span>Scan Next</span>
                    </button>
                    {onClose && (
                      <button
                        onClick={onClose}
                        className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* FAILED VISUAL FEEDBACK CARD */}
              {activeFeedback.type === 'failed' && (
                <motion.div
                  initial={{ scale: 0.7, opacity: 0, y: 20 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    y: 0,
                    x: [-10, 10, -7, 7, -3, 3, 0]
                  }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.45 }}
                  className="w-full max-w-sm bg-gradient-to-b from-stone-900 via-stone-950 to-black rounded-3xl p-6 border-2 border-rose-500/80 shadow-[0_0_50px_rgba(239,68,68,0.4)] text-center space-y-4"
                >
                  {/* Animated Error Icon */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.4 }}
                      className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30"
                    >
                      <XCircle size={40} className="text-rose-500" />
                    </motion.div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-rose-400">
                      Scan Failed • ناکام
                    </span>
                    <h3 className="font-display font-bold text-xl text-white">
                      {activeFeedback.title}
                    </h3>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {activeFeedback.message}
                    </p>
                  </div>

                  {activeFeedback.code && (
                    <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono text-rose-300 truncate max-w-full">
                      Invalid Code: {activeFeedback.code}
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={resetFeedback}
                      className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <RefreshCw size={15} />
                      <span>Try Scanning Again</span>
                    </button>
                    {showUploadOption && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="py-3 px-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        title="Upload Photo"
                      >
                        <Upload size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM FOOTER BAR */}
      <footer className="relative z-30 w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-t from-stone-950 via-stone-950/90 to-stone-950/30 border-t border-stone-900 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-400">
          <span className={cn(
            "w-2.5 h-2.5 rounded-full transition-colors",
            isScanning ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
          )} />
          <span className="text-[11px] font-mono text-stone-300">
            {isScanning ? `${currentFacingMode === 'environment' ? 'Rear Camera' : 'Selfie Camera'} Active` : 'Standby'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Simulation/Testing Helpers (Safe for testing animations) */}
          <button
            onClick={() => handleSuccessfulScan('MAHFIL-PATRON-VIP-889')}
            className="px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/40 text-emerald-400 text-[10px] font-semibold transition-colors"
            title="Simulate a successful scan"
          >
            Test Pass
          </button>
          <button
            onClick={() => {
              triggerHaptic('error');
              playSoundEffect('failed');
              setInternalFeedback({
                type: 'failed',
                title: 'Code Rejected',
                message: 'QR Pass has expired or token is corrupt. Please verify with cashier.'
              });
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/40 text-rose-400 text-[10px] font-semibold transition-colors"
            title="Simulate a failed scan"
          >
            Test Fail
          </button>

          {showUploadOption && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-[11px] border border-stone-700 flex items-center gap-1.5 transition-colors"
            >
              <Upload size={13} />
              <span>Upload Photo</span>
            </button>
          )}
        </div>
      </footer>
    </motion.div>
  );
}
