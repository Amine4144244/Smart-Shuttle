import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reservationsApi, tripsApi, driverApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, CameraOff, Loader2, ScanLine, Bus, User, MapPin, Phone, Mail, Calendar, Hash, Users, StickyNote } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

type PageState = 'idle' | 'starting-camera' | 'scanning' | 'validating' | 'success' | 'error' | 'camera-error' | 'boarding';

export default function ScanQr() {
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const [pageState, setPageState] = useState<PageState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<any>(null);
  const [cameraError, setCameraError] = useState('');
  const [boardingMsg, setBoardingMsg] = useState('');

  const { data: trip } = useQuery({
    queryKey: ['driver-current-trip'],
    queryFn: () => tripsApi.getAll({ limit: 1, status: 'IN_PROGRESS' }).then(r => r.data?.data?.[0]),
  });

  const showSuccess = (data: any) => { setResult(data); setPageState('success'); setTimeout(() => { if (mountedRef.current) navigate('/driver/tracking'); }, 2000); };
  const showError = (msg: string) => { setErrorMsg(msg); setResult(null); setPageState('error'); setTimeout(() => { if (mountedRef.current) scanStart(); }, 2000); };

  const validateToken = async (token: string) => {
    setPageState('validating');
    try {
      const res = await reservationsApi.validateQR(token, { driverId: trip?.id });
      if (res.data.status === 'VALID') showSuccess(res.data);
      else showError(res.data.message || 'Invalid QR code');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Validation failed');
    }
  };

  const handleScan = async (token: string) => {
    setPageState('validating');
    try {
      const res = await driverApi.scanQR(token);
      if (res.data.success) {
        setResult(res.data.reservation);
        setPageState('boarding');
      } else {
        showError(res.data.message || 'QR scan failed');
      }
    } catch (err: any) {
      showError(err.response?.data?.message || 'Scan failed');
    }
  };

  const handleBoarding = async () => {
    if (!result?.id) return;
    try {
      const res = await driverApi.validateBoarding(result.id);
      setBoardingMsg(res.data.message || 'Embarquement validé.');
      setPageState('success');
      setTimeout(() => { if (mountedRef.current) navigate('/driver/tracking'); }, 2000);
    } catch (err: any) {
      setBoardingMsg(err.response?.data?.message || 'Validation failed');
    }
  };

  const scanStop = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try { await s.stop(); } catch {}
      try { await s.clear(); } catch {}
    }
  };

  const scanStart = async () => {
    if (!mountedRef.current || startingRef.current) return;
    setErrorMsg('');
    await scanStop();
    if (!mountedRef.current) return;
    setPageState('starting-camera');
  };

  const scanFromImage = async (file: File) => {
    if (!mountedRef.current) return;
    setPageState('validating');
    const holder = document.createElement('div');
    holder.id = 'scan-file-container';
    holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:320px;';
    document.body.appendChild(holder);
    const tmpScanner = new Html5Qrcode('scan-file-container');
    try {
      const decoded = await tmpScanner.scanFile(file, false);
      try { tmpScanner.clear(); } catch {}
      holder.remove();
      handleScan(decoded);
    } catch {
      try { tmpScanner.clear(); } catch {}
      holder.remove();
      setCameraError('No QR code found in this image. Take a sharper, well-lit photo of the QR code.');
      setPageState('camera-error');
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; scanStop(); };
  }, []);

  useEffect(() => {
    if (pageState !== 'starting-camera') return;
    const start = async () => {
      if (!mountedRef.current || startingRef.current) return;
      startingRef.current = true;
      try {
      if (!window.isSecureContext) {
        setCameraError('Camera requires HTTPS. Access via https:// or localhost only.');
        setPageState('camera-error');
        return;
      }
      let devices: MediaDeviceInfo[] = [];
      try { devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput'); } catch {}
      if (devices.length === 0) {
        setCameraError('No camera detected on this device. Check your camera hardware and drivers.');
        setPageState('camera-error');
        return;
      }
      let perm: PermissionStatus | null = null;
      try { perm = await navigator.permissions.query({ name: 'camera' as PermissionName }); } catch {}
      if (perm?.state === 'denied') {
        setCameraError('Camera blocked in browser. Open your browser settings, allow camera for this site, then reload.');
        setPageState('camera-error');
        return;
      }
      const describeError = (e: any) => `${e?.name || 'Error'}: ${e?.message || e?.toString() || 'Unknown'}`;
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
        testStream.getTracks().forEach(t => t.stop());
      } catch (e: any) {
        const name = e?.name || '';
        const msg = (e?.message || e?.toString() || '').toLowerCase();
        if (name === 'NotAllowedError' || msg.includes('permission') || msg.includes('notallowederror')) {
          setCameraError('Camera permission denied. On the phone: allow camera access when prompted (Settings → Camera permission).');
        } else if (name === 'NotFoundError' || msg.includes('notfound') || msg.includes('devicenotfound')) {
          setCameraError('Camera device not found. Check the camera is not disabled in your phone settings.');
        } else if (name === 'NotReadableError' || msg.includes('inuse') || msg.includes('notreadable') || msg.includes('trackstarterror')) {
          setCameraError('Camera is busy. Close other apps using the camera and reload the page.');
        } else {
          setCameraError(`Camera error: ${describeError(e)}`);
        }
        setPageState('camera-error');
        return;
      }
      await new Promise(r => setTimeout(r, 300));
      const config = {
        fps: 10,
        qrbox: { width: 360, height: 360 },
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      };
      const onScan = async (decodedText: string) => {
        if (!mountedRef.current) return;
        await scanStop();
        handleScan(decodedText);
      };

      let firstErr = '';
      let cameraOptions: any[] = [];
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment'));
          if (backCam) cameraOptions.push(backCam.id);
          cameras.forEach(c => {
            if (!cameraOptions.includes(c.id)) cameraOptions.push(c.id);
          });
        }
      } catch {}

      cameraOptions.push(
        { facingMode: 'environment' },
        { facingMode: 'user' },
        { facingMode: { exact: 'environment' } },
        { facingMode: { exact: 'user' } }
      );

      for (const constraints of cameraOptions) {
        if (!mountedRef.current) return;
        const attempt = new Html5Qrcode('qr-reader-container');
        try {
          await attempt.start(constraints, config, onScan, () => {});
          scannerRef.current = attempt;
          if (mountedRef.current) setPageState('scanning');
          return;
        } catch (e: any) {
          if (!firstErr) firstErr = describeError(e);
          try { await attempt.clear(); } catch {}
        }
      }
      if (!mountedRef.current) return;
      if (firstErr.toLowerCase().includes('notallowed') || firstErr.toLowerCase().includes('permission')) {
        setCameraError('Camera permission blocked. Please allow camera access in your browser settings and try again.');
      } else {
        setCameraError(`Camera error: ${firstErr}`);
      }
      setPageState('camera-error');
      } finally {
        startingRef.current = false;
      }
    };
    start();
  }, [pageState]);

  const goBack = () => { scanStop(); navigate('/driver/tracking'); };

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (pageState === 'idle') {
    return (
      <div className="flex min-h-screen flex-col bg-black">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={goBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-white">Scan QR Code</h1>
            <p className="text-xs text-white/60">Scan passenger QR codes for check-in</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="rounded-full border-4 border-white/20 p-8">
            <ScanLine className="h-16 w-16 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-white">Ready to scan</p>
            <p className="mt-1 text-sm text-white/50">Click the button below to start the camera</p>
          </div>
          <Button size="lg" className="w-full max-w-xs gap-2 text-base" onClick={scanStart}>
            <ScanLine className="h-5 w-5" /> Start Scanning
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black">
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center gap-3 p-4">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={goBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-white">Scan QR Code</h1>
          <p className="text-xs text-white/60">Point the camera at the QR code</p>
        </div>
      </div>

      {(pageState === 'starting-camera' || pageState === 'scanning' || pageState === 'validating' || pageState === 'error') && (
        <div className="absolute inset-0 z-0 flex items-center justify-center" style={{ top: 72, bottom: 120 }}>
          <div id="qr-reader-container" className="h-full w-full max-w-lg" />
        </div>
      )}

      {pageState === 'scanning' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" style={{ top: 72, bottom: 120 }}>
          <div className="relative">
            <div className="h-64 w-64 rounded-2xl border-2 border-white/30" />
            <div className="absolute -top-0.5 -left-0.5 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-primary" />
            <div className="absolute -top-0.5 -right-0.5 h-9 w-9 rounded-tr-2xl border-r-4 border-t-4 border-primary" />
            <div className="absolute -bottom-0.5 -left-0.5 h-9 w-9 rounded-bl-2xl border-b-4 border-l-4 border-primary" />
            <div className="absolute -bottom-0.5 -right-0.5 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-primary" />
            <div className="absolute left-1 right-1 h-0.5 animate-scan bg-primary shadow-[0_0_10px_3px_rgba(59,130,246,0.5)]" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
        <div className="mx-auto max-w-sm text-center space-y-4">
          {pageState === 'starting-camera' && (
            <div className="flex items-center justify-center gap-2 text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Starting camera...</span>
            </div>
          )}
          {pageState === 'scanning' && (
            <>
              <p className="text-sm text-white/50">Waiting for QR code...</p>
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white" onClick={goBack}>Stop Scanning</Button>
            </>
          )}
          {pageState === 'validating' && (
            <div className="flex items-center justify-center gap-2 text-yellow-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Validating...</span>
            </div>
          )}
          {pageState === 'success' && result && (
            <div className="animate-bounce-in rounded-2xl border border-green-400/40 bg-green-500/20 p-5 backdrop-blur-md">
              <CheckCircle2 className="mx-auto mb-2 h-14 w-14 text-green-400" />
              <p className="text-lg font-bold text-green-300">Check-in Successful!</p>
              {result.participant && (
                <div className="mt-3 text-left text-xs text-green-300/70 space-y-1">
                  <div className="flex items-center gap-1"><User className="h-3 w-3" /><span>{result.participant.firstName} {result.participant.lastName}</span></div>
                  {result.event && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /><span>{result.event.name}</span></div>}
                  {result.trip && <div className="flex items-center gap-1"><Bus className="h-3 w-3" /><span>{result.trip.vehicle?.busNumber || result.trip.name || 'Navette'}</span></div>}
                </div>
              )}
              <p className="mt-3 text-xs text-green-300/50">Returning to tracking...</p>
            </div>
          )}
          {pageState === 'boarding' && result && (
            <div className="animate-bounce-in rounded-2xl border border-blue-400/40 bg-blue-500/20 p-5 backdrop-blur-md">
              <Bus className="mx-auto mb-2 h-14 w-14 text-blue-400" />
              <p className="text-lg font-bold text-blue-300">Scan Réussi</p>

              {result.participant && (
                <div className="mt-3 rounded-xl bg-white/5 p-3 text-left text-xs text-blue-200 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Passager</p>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span className="font-medium">{result.participant.firstName} {result.participant.lastName}</span>
                  </div>
                  {result.participant.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>{result.participant.email}</span>
                    </div>
                  )}
                  {(result.participant.phone || result.contactPhone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>{result.participant.phone || result.contactPhone}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-2 rounded-xl bg-white/5 p-3 text-left text-xs text-blue-200 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Réservation</p>
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="font-medium">{result.reservationCode}</span>
                  <span className="ml-auto rounded bg-blue-500/30 px-1.5 py-0.5 text-[10px] font-semibold">{result.status}</span>
                </div>
                {result.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>{new Date(result.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                {result.passengerCount > 1 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>{result.passengerCount} passagers</span>
                  </div>
                )}
              </div>

              {result.event && (
                <div className="mt-2 rounded-xl bg-white/5 p-3 text-left text-xs text-blue-200 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Événement</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span className="font-medium">{result.event.name}</span>
                  </div>
                </div>
              )}

              {result.trip && (
                <div className="mt-2 rounded-xl bg-white/5 p-3 text-left text-xs text-blue-200 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Trajet</p>
                  <div className="flex items-center gap-2">
                    <Bus className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>{result.trip.vehicle?.busNumber || result.trip.name || 'Navette'}</span>
                    {result.trip.vehicle?.plateNumber && <span className="text-blue-400/70">({result.trip.vehicle.plateNumber})</span>}
                  </div>
                  {result.trip.route && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>{result.trip.route.origin} → {result.trip.route.destination}</span>
                    </div>
                  )}
                </div>
              )}

              {(result.pickupAddress || result.pickupPoint) && (
                <div className="mt-2 rounded-xl bg-white/5 p-3 text-left text-xs text-blue-200">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>{result.pickupPoint?.name || result.pickupAddress}</span>
                  </div>
                </div>
              )}

              {result.notes && (
                <div className="mt-2 rounded-xl bg-white/5 p-3 text-left text-xs text-blue-200">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>{result.notes}</span>
                  </div>
                </div>
              )}

              {boardingMsg && (
                <p className="mt-2 rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-200">{boardingMsg}</p>
              )}
              <p className="text-xs text-blue-300/50 mt-3">Confirmer l'embarquement ?</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleBoarding}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Valider
                </Button>
                <Button size="sm" variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10" onClick={() => { setPageState('idle'); setResult(null); }}>
                  <XCircle className="mr-1 h-4 w-4" /> Annuler
                </Button>
              </div>
            </div>
          )}
          {pageState === 'error' && (
            <div className="animate-shake rounded-2xl border border-red-400/40 bg-red-500/20 p-5 backdrop-blur-md">
              <XCircle className="mx-auto mb-2 h-12 w-12 text-red-400" />
              <p className="text-base font-semibold text-red-300">{errorMsg || 'Invalid QR code'}</p>
              <p className="mt-2 text-xs text-red-300/50">Restarting scanner...</p>
            </div>
          )}
          {pageState === 'camera-error' && (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/20 p-5 backdrop-blur-md">
              <CameraOff className="mx-auto mb-2 h-10 w-10 text-red-400" />
              <p className="text-sm font-semibold text-red-300">{cameraError}</p>
              <p className="mt-2 text-xs text-white/50">Make sure no other app is using the camera. In Chrome/Edge: click the lock icon next to the URL, find "Camera" and set to "Allow", then reload the page.</p>
              <div className="mt-5 flex flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) scanFromImage(f); e.target.value = ''; }}
                />
                <Button size="lg" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                  <CameraOff className="h-4 w-4" /> Scan a photo instead
                </Button>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={scanStart}>Try Again</Button>
                  <Button variant="ghost" className="text-white/60 hover:text-white" onClick={goBack}>Back</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan { 0%,100% { top: 0.25rem; } 50% { top: calc(100% - 0.5rem); } }
        .animate-scan { animation: scan 2s ease-in-out infinite; }
        @keyframes bounce-in { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
        .animate-bounce-in { animation: bounce-in 0.4s ease-out; }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.35s ease-in-out; }
        #qr-reader-container video { object-fit: cover !important; }
      `}</style>
    </div>
  );
}
