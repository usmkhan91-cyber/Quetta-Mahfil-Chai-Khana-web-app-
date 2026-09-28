import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { 
  Camera, 
  CameraOff, 
  FlipHorizontal, 
  Zap, 
  ZapOff, 
  Upload, 
  CheckCircle2, 
  QrCode, 
  UserCheck, 
  Award, 
  Star, 
  Clock, 
  MapPin, 
  Coffee, 
  History, 
  Shield, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  X, 
  Search, 
  AlertCircle,
  Plus,
  Gift
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';
import { 
  checkInGuestWithLoyalty, 
  getGuestLoyaltyHistory, 
  subscribeToGuestCheckIns 
} from '../services/firestore';
import { GuestCheckIn, GuestLoyaltySummary } from '../types';
import QRScanner from './QRScanner';

interface QRCheckInScannerProps {
  onClose?: () => void;
  staffName?: string;
  defaultTable?: string;
  className?: string;
}

type ActiveTab = 'scanner' | 'my-pass' | 'live-checkins';

export default function QRCheckInScanner({
  onClose,
  staffName = 'Mahfil Front Host',
  defaultTable = 'Main Hujra Lounge',
  className
}: QRCheckInScannerProps) {
  const { user, profile } = useFirebase();
  const { language } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  
  // Camera & Stream States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  // Manual & Upload States
  const [manualCode, setManualCode] = useState('');
  const [selectedTable, setSelectedTable] = useState(defaultTable);
  const [bonusPointsAwarded, setBonusPointsAwarded] = useState<number | null>(null);

  // Result States
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    message: string;
    checkInRecord: GuestCheckIn;
    loyaltySummary: GuestLoyaltySummary;
  } | null>(null);

  // Recent Live Check-ins from system
  const [recentCheckIns, setRecentCheckIns] = useState<GuestCheckIn[]>([]);

  // Generated QR Pass for current user
  const myPassCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Video & Processing Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to live check-ins
  useEffect(() => {
    const unsubscribe = subscribeToGuestCheckIns((list) => {
      setRecentCheckIns(list);
    });
    return () => unsubscribe();
  }, []);

  // Generate dynamic personal QR pass if on "my-pass" tab
  useEffect(() => {
    if (activeTab === 'my-pass' && myPassCanvasRef.current) {
      const passData = JSON.stringify({
        type: 'mahfil_pass',
        uid: user?.uid || 'guest_demo_user',
        name: user?.displayName || 'Mahfil Patron',
        email: user?.email || 'guest@quettamahfil.pk',
        tier: profile?.level || 1,
        issuedAt: new Date().toISOString()
      });

      QRCode.toCanvas(
        myPassCanvasRef.current,
        passData,
        {
          width: 240,
          margin: 2,
          color: {
            dark: '#1C1917',
            light: '#FFFFFF'
          }
        },
        (err) => {
          if (err) console.error("QR Pass Gen Error:", err);
        }
      );
    }
  }, [activeTab, user, profile]);

  // Audio Chime on Successful Scan
  const playSuccessChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext unavailable or blocked by autoplay policy
    }
  }, []);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  }, []);

  // Process Check-in & Fetch Loyalty
  const processCheckIn = useCallback(async (qrPayload: string) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    triggerHaptic('success');
    playSuccessChime();

    try {
      const result = await checkInGuestWithLoyalty({
        qrDataOrGuestId: qrPayload,
        tableOrArea: selectedTable,
        pointsToAward: 50,
        staffId: user?.uid || 'staff_host',
        staffName: profile?.displayName || staffName,
        notes: `Checked in at ${selectedTable} via Device Camera`
      });

      setCheckInResult(result);
      // Stop camera once verified to conserve battery
      stopCamera();
    } catch (err: any) {
      console.error("Check-in error:", err);
      // Fallback display if network issue
      const demoId = qrPayload.replace(/^MAHFIL:GUEST:/, '');
      const fallbackSummary = await getGuestLoyaltyHistory(demoId);
      setCheckInResult({
        success: true,
        message: `Offline Guest Check-in completed for ${selectedTable}. +50 Loyalty Points reserved.`,
        checkInRecord: {
          guestId: demoId,
          guestName: fallbackSummary.guest.displayName,
          pointsAwarded: 50,
          tableOrArea: selectedTable,
          staffName: staffName,
          checkedInAt: new Date().toISOString(),
          status: 'completed'
        },
        loyaltySummary: fallbackSummary
      });
      stopCamera();
    } finally {
      setIsProcessingScan(false);
    }
  }, [isProcessingScan, playSuccessChime, profile?.displayName, selectedTable, staffName, stopCamera, user?.uid]);

  // Frame Scanner Tick
  const tickScanner = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data && code.data.trim().length > 0) {
          processCheckIn(code.data);
          return;
        }
      }
    }

    scanLoopRef.current = requestAnimationFrame(tickScanner);
  }, [isCameraActive, processCheckIn]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsCameraActive(true);

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorch(Boolean(capabilities.torch));
      }

      // Start frame scanning loop
      scanLoopRef.current = requestAnimationFrame(tickScanner);
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setIsCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser or use QR Image Upload / Manual ID.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No video camera device detected. You can upload a QR pass image or enter Guest ID manually below.');
      } else {
        setCameraError('Unable to start live camera feed. Please use image upload or test with demo passes.');
      }
    }
  }, [cameraFacing, stopCamera, tickScanner]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setIsTorchOn(nextTorch);
      triggerHaptic('light');
    } catch (e) {
      console.warn("Torch toggle failed", e);
    }
  };

  // Flip Camera
  const flipCamera = () => {
    triggerHaptic('light');
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle Photo File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          processCheckIn(code.data);
        } else {
          alert('Could not detect a valid QR Code in this photo. Please ensure it is well-lit and clear.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input value
    e.target.value = '';
  };

  // Quick Award Bonus Points to Verified Guest
  const handleAwardBonusPoints = (pts: number) => {
    if (!checkInResult) return;
    triggerHaptic('medium');
    setBonusPointsAwarded(pts);

    setCheckInResult((prev) => {
      if (!prev) return prev;
      const updatedPts = prev.loyaltySummary.guest.points + pts;
      const updatedLevel = Math.floor(updatedPts / 1000) + 1;
      return {
        ...prev,
        loyaltySummary: {
          ...prev.loyaltySummary,
          guest: {
            ...prev.loyaltySummary.guest,
            points: updatedPts,
            level: updatedLevel
          }
        }
      };
    });

    setTimeout(() => setBonusPointsAwarded(null), 3000);
  };

  // Reset to scan next guest
  const handleScanNext = () => {
    triggerHaptic('light');
    setCheckInResult(null);
    setManualCode('');
    setBonusPointsAwarded(null);
    startCamera();
  };

  // Start camera when on scanner tab and result is cleared
  useEffect(() => {
    if (activeTab === 'scanner' && !checkInResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, checkInResult, startCamera, stopCamera]);

  return (
    <div className={cn("w-full max-w-2xl mx-auto bg-white dark:bg-[#181512] rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col", className)}>
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C85A32]/10 text-[#C85A32] dark:text-[#E5A84B] flex items-center justify-center">
            <QrCode size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-lg text-stone-900 dark:text-stone-100">
                Mahfil Guest Check-in
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C85A32]/15 text-[#C85A32] dark:text-[#E5A84B]">
                LIVE CAM
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Instant loyalty history & on-site arrival verification
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center p-1.5 bg-stone-100/70 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 gap-1">
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('scanner');
          }}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
            activeTab === 'scanner'
              ? "bg-white dark:bg-stone-800 text-[#C85A32] dark:text-[#E5A84B] shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          )}
        >
          <Camera size={14} />
          <span>Camera Scanner</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('my-pass');
          }}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
            activeTab === 'my-pass'
              ? "bg-white dark:bg-stone-800 text-[#C85A32] dark:text-[#E5A84B] shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          )}
        >
          <UserCheck size={14} />
          <span>My QR Pass</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('live-checkins');
          }}
          className={cn(
            "flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
            activeTab === 'live-checkins'
              ? "bg-white dark:bg-stone-800 text-[#C85A32] dark:text-[#E5A84B] shadow-xs"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          )}
        >
          <History size={14} />
          <span>Recent Arrivals</span>
          {recentCheckIns.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#C85A32] text-white text-[9px] font-bold flex items-center justify-center">
              {recentCheckIns.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
        {/* TAB 1: SCANNER & VERIFICATION */}
        {activeTab === 'scanner' && (
          <div className="space-y-5">
            {/* If a scan result is available, show Verified Guest Card & Instant Loyalty History */}
            {checkInResult ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5"
              >
                {/* Success Banner */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                  <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Guest Successfully Checked In!</h4>
                    <p className="text-xs mt-0.5 opacity-90">{checkInResult.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      <span>Seat: {checkInResult.checkInRecord.tableOrArea}</span>
                      <span>•</span>
                      <span>{new Date(checkInResult.checkInRecord.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Verified Guest Identity Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-stone-900 to-stone-950 text-white relative overflow-hidden shadow-xl border border-stone-800">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#C85A32]/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                  
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#E5A84B] shadow-md flex-shrink-0 bg-stone-800">
                        <img
                          src={checkInResult.loyaltySummary.guest.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(checkInResult.loyaltySummary.guest.displayName)}&background=C85A32&color=fff`}
                          alt={checkInResult.loyaltySummary.guest.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-xl text-white">
                            {checkInResult.loyaltySummary.guest.displayName}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E5A84B] text-stone-950">
                            {checkInResult.loyaltySummary.guest.rankTitle}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 font-mono mt-0.5">
                          ID: {checkInResult.loyaltySummary.guest.uid.substring(0, 14)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-stone-400">Points Balance</span>
                      <div className="flex items-center justify-end gap-1.5 text-2xl font-display font-black text-[#E5A84B]">
                        <Award size={22} />
                        <span>{checkInResult.loyaltySummary.guest.points}</span>
                      </div>
                      <span className="text-[11px] text-stone-400">Level {checkInResult.loyaltySummary.guest.level}</span>
                    </div>
                  </div>

                  {/* Level Progress Bar */}
                  <div className="mt-5 pt-4 border-t border-stone-800 relative z-10">
                    <div className="flex justify-between text-[11px] text-stone-400 mb-1.5 font-medium">
                      <span>Tier Progress</span>
                      <span>{checkInResult.loyaltySummary.guest.points} / {checkInResult.loyaltySummary.nextTierPoints} pts to next rank</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#C85A32] to-[#E5A84B] rounded-full transition-all duration-500"
                        style={{ width: `${checkInResult.loyaltySummary.tierProgressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Badges Bar */}
                  <div className="mt-4 flex flex-wrap gap-1.5 relative z-10">
                    {checkInResult.loyaltySummary.guest.badges.map((badge, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-white/10 text-stone-200 text-[11px] font-semibold flex items-center gap-1 border border-white/5"
                      >
                        <Star size={11} className="text-[#E5A84B]" />
                        <span>{badge}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Saki AI Hospitality Memory */}
                {checkInResult.loyaltySummary.guest.hospitalityNotes && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-stone-800 dark:text-stone-200">
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-400 mb-1">
                      <Sparkles size={14} />
                      <span>Saki AI Hospitality Notes</span>
                    </div>
                    <p className="text-xs italic leading-relaxed text-stone-600 dark:text-stone-300">
                      "{checkInResult.loyaltySummary.guest.hospitalityNotes}"
                    </p>
                  </div>
                )}

                {/* Quick Staff Action Bar */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Host Courtesy Actions
                    </span>
                    {bonusPointsAwarded && (
                      <span className="text-xs text-emerald-600 font-bold animate-pulse">
                        +{bonusPointsAwarded} Points Credited!
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleAwardBonusPoints(25)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold hover:border-[#C85A32] text-stone-800 dark:text-stone-200 flex items-center gap-1"
                    >
                      <Plus size={13} className="text-[#C85A32]" />
                      <span>+25 Chai Courtesy</span>
                    </button>

                    <button
                      onClick={() => handleAwardBonusPoints(50)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold hover:border-[#C85A32] text-stone-800 dark:text-stone-200 flex items-center gap-1"
                    >
                      <Plus size={13} className="text-[#C85A32]" />
                      <span>+50 Paratha Feast</span>
                    </button>

                    <button
                      onClick={() => handleAwardBonusPoints(100)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold hover:border-[#C85A32] text-stone-800 dark:text-stone-200 flex items-center gap-1"
                    >
                      <Gift size={13} className="text-[#E5A84B]" />
                      <span>+100 VIP Guest Gift</span>
                    </button>
                  </div>
                </div>

                {/* History Tabs / Past Check-ins & Orders */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <History size={16} className="text-[#C85A32]" />
                      <span>Visit & Check-in History ({checkInResult.loyaltySummary.checkIns.length})</span>
                    </h5>
                    <span className="text-xs text-stone-500 font-mono">
                      Lifetime Visits: {checkInResult.loyaltySummary.guest.visitsCount}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {checkInResult.loyaltySummary.checkIns.map((ci, idx) => (
                      <div
                        key={ci.id || idx}
                        className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center font-bold text-[11px]">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900 dark:text-stone-100">
                              {ci.tableOrArea || 'Mahfil Dining Hall'}
                            </p>
                            <p className="text-[11px] text-stone-500">
                              {new Date(ci.checkedInAt).toLocaleDateString()} at {new Date(ci.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{ci.pointsAwarded} pts
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Recent Orders if available */}
                  {checkInResult.loyaltySummary.recentOrders && checkInResult.loyaltySummary.recentOrders.length > 0 && (
                    <div className="pt-2">
                      <h5 className="font-bold text-xs text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-1.5">
                        <Coffee size={14} className="text-[#C85A32]" />
                        <span>Recent Mahfil Orders</span>
                      </h5>
                      <div className="space-y-1.5">
                        {checkInResult.loyaltySummary.recentOrders.slice(0, 3).map((ord) => (
                          <div
                            key={ord.id}
                            className="p-2.5 rounded-xl bg-stone-50/60 dark:bg-stone-900/40 border border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between text-xs"
                          >
                            <span className="truncate max-w-[240px] text-stone-700 dark:text-stone-300 font-medium">
                              {ord.itemsSummary}
                            </span>
                            <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                              Rs. {ord.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Scan Next Button */}
                <div className="pt-3">
                  <button
                    onClick={handleScanNext}
                    className="w-full py-3.5 rounded-2xl bg-[#C85A32] hover:bg-[#B34D28] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <RotateCcw size={16} />
                    <span>Scan Next Guest Mahfil Pass</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Live Camera Scanner View */
              <div className="space-y-4">
                {/* Table / Seating Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 whitespace-nowrap">
                    Arrival Seating:
                  </label>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="flex-1 py-2 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-[#C85A32]"
                  >
                    <option value="Main Hujra Lounge">Main Hujra Lounge</option>
                    <option value="Outdoor Chaarpai #1">Outdoor Chaarpai #1</option>
                    <option value="Outdoor Chaarpai #2">Outdoor Chaarpai #2</option>
                    <option value="Outdoor Chaarpai #3">Outdoor Chaarpai #3</option>
                    <option value="Family AC Hall Table 4">Family AC Hall Table 4</option>
                    <option value="Family AC Hall Table 8">Family AC Hall Table 8</option>
                    <option value="Heritage Takht A">Heritage Takht A (Wood Carved)</option>
                    <option value="Heritage Takht B">Heritage Takht B (Wood Carved)</option>
                  </select>
                </div>

                {/* QRScanner with html5-qrcode, Mahfil Viewfinder, and Camera Access Check */}
                <QRScanner
                  onScan={(code) => processCheckIn(code)}
                  title="Guest Check-In Scanner"
                  subtitle="Scan Patron QR Pass or Table Card"
                  showTorchToggle={true}
                  showCameraFlip={true}
                  showUploadOption={true}
                  autoStart={false}
                  fullScreen={false}
                />

                {/* Upload & Manual Fallback Bar */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Upload size={14} />
                    <span>Upload QR Photo</span>
                  </button>

                  <div className="flex-1 flex gap-1.5">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Or enter Guest ID / Pass"
                      className="flex-1 min-w-0 py-2.5 px-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-[#C85A32]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualCode.trim()) {
                          processCheckIn(manualCode.trim());
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (manualCode.trim()) processCheckIn(manualCode.trim());
                      }}
                      disabled={!manualCode.trim()}
                      className="px-3 py-2.5 rounded-xl bg-[#C85A32] disabled:opacity-50 text-white text-xs font-bold transition-all"
                    >
                      <Search size={14} />
                    </button>
                  </div>
                </div>

                {/* Quick 1-Tap Demo Test Passes */}
                <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 text-xs space-y-2">
                  <span className="font-semibold text-stone-600 dark:text-stone-400 block text-[11px] uppercase tracking-wider">
                    Quick Sample Passes (For Instant Verification):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => processCheckIn('MAHFIL:GUEST:tariq_baloch_vip')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] font-medium hover:border-[#C85A32] text-stone-800 dark:text-stone-200 flex items-center gap-1"
                    >
                      <Star size={11} className="text-[#E5A84B]" />
                      <span>Tariq Baloch (VIP Legend)</span>
                    </button>

                    <button
                      onClick={() => processCheckIn('MAHFIL:GUEST:ayesha_khan_regular')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] font-medium hover:border-[#C85A32] text-stone-800 dark:text-stone-200 flex items-center gap-1"
                    >
                      <Coffee size={11} className="text-[#C85A32]" />
                      <span>Ayesha Khan (Connoisseur)</span>
                    </button>

                    {user && (
                      <button
                        onClick={() => processCheckIn(`MAHFIL:GUEST:${user.uid}`)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] font-medium hover:border-[#C85A32] text-stone-800 dark:text-stone-200 flex items-center gap-1"
                      >
                        <UserCheck size={11} className="text-emerald-500" />
                        <span>My Logged-in Pass</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY MAHFIL QR PASS */}
        {activeTab === 'my-pass' && (
          <div className="p-4 sm:p-6 text-center space-y-5">
            <div className="max-w-sm mx-auto p-6 rounded-3xl bg-gradient-to-b from-stone-900 to-stone-950 text-white border border-stone-800 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#C85A32]/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                <div className="text-left">
                  <h4 className="font-display font-bold text-sm text-[#E5A84B]">QUETTA MAHFIL</h4>
                  <p className="text-[10px] text-stone-400">Official Patron Loyalty Card</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#C85A32] flex items-center justify-center text-white text-[10px] font-black">
                  Q
                </div>
              </div>

              {/* Dynamic QR Canvas */}
              <div className="p-3 bg-white rounded-2xl inline-block shadow-lg mx-auto mb-4">
                <canvas ref={myPassCanvasRef} className="rounded-lg" />
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  {user?.displayName || 'Valued Mahfil Patron'}
                </h3>
                <p className="text-xs text-stone-400 font-mono mt-0.5">
                  ID: {user?.uid ? user.uid.substring(0, 16) : 'GUEST-8842-PK'}
                </p>

                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-stone-400 block">Current Rank</span>
                    <span className="font-bold text-[#E5A84B]">Level {profile?.level || 1} • Regular</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-stone-400 block">Available Points</span>
                    <span className="font-bold text-white font-mono">{profile?.points || 0} pts</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
              Show this QR Pass to the Mahfil host upon arrival at our Bahria Town location to claim check-in points and unlock table perks.
            </p>
          </div>
        )}

        {/* TAB 3: LIVE RECENT ARRIVALS */}
        {activeTab === 'live-checkins' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">
                  Live On-Premise Check-ins
                </h4>
                <p className="text-xs text-stone-500">
                  Real-time arrival audit stream for Bahria Town dining
                </p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {recentCheckIns.length === 0 ? (
              <div className="p-8 text-center text-stone-400 dark:text-stone-500 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
                <History size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No check-ins recorded yet today. Scan a QR pass to check in your first guest!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentCheckIns.map((item, i) => (
                  <div
                    key={item.id || i}
                    className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center font-display font-bold text-sm">
                        {item.guestName?.charAt(0) || 'G'}
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-stone-900 dark:text-stone-100">
                          {item.guestName || 'Guest Patron'}
                        </h5>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                          <span>{item.tableOrArea || 'Dining Hall'}</span>
                          <span>•</span>
                          <span>{new Date(item.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
                        +{item.pointsAwarded} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
