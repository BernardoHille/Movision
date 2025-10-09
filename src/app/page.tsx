'use client';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { useState, useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from '@mediapipe/tasks-vision';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type View = 'home' | 'configuracoes' | 'jogo';
type Option = 'posicao' | 'membros' | 'distancia';

const SuperioresIconContent = memo(function SuperioresIconContent() {
  return (
    <>
      <div className="flex flex-col items-center text-center">
        <span>Superiores</span>
        <span>(Braços)</span>
      </div>
      <Image src="/img/hand.svg" alt="Mãos" width={40} height={40} className="object-contain" />
    </>
  );
});
SuperioresIconContent.displayName = 'SuperioresIconContent';


const InferioresIconContent = memo(function InferioresIconContent() {
  return (
    <>
      <div className="flex flex-col items-center text-center">
        <span>Inferiores</span>
        <span>(Pernas)</span>
      </div>
      <Image src="/img/feet.svg" alt="Pés" width={40} height={40} className="object-contain" />
    </>
  );
});
InferioresIconContent.displayName = 'InferioresIconContent';

const SelectionButton = memo(({
  option,
  value,
  children,
  className,
  selections,
  handleSelection,
}: {
  option: Option;
  value: string;
  children: React.ReactNode;
  className?: string;
  selections: { posicao: string; membros: string; distancia: string };
  handleSelection: (option: Option, value: string) => void;
}) => {
  const isSelected = selections[option] === value;
  return (
    <Button
      variant="outline"
      className={cn(
        'relative w-full flex-1 justify-center rounded-xl border-4 border-transparent bg-card text-lg font-bold text-[#49416D] shadow-lg hover:bg-card/80 sm:text-xl',
        'whitespace-normal break-words py-2',
        'h-full',
        isSelected && 'border-primary ring-4 ring-primary/50',
        'flex items-center gap-4 px-4',
        className
      )}
      onClick={() => handleSelection(option, value)}
    >
      {children}
      {isSelected && (
        <div className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <Check className="h-6 w-6 text-primary-foreground" />
        </div>
      )}
    </Button>
  );
});
SelectionButton.displayName = 'SelectionButton';


function ConfiguracoesView({ onStart }: { onStart: () => void }) {
  const [selections, setSelections] = useState({
    posicao: '',
    membros: '',
    distancia: '',
  });

  const handleSelection = (option: Option, value: string) => {
    setSelections((prev) => ({ ...prev, [option]: value }));
  };

  const isComplete =
    selections.posicao !== '' &&
    selections.membros !== '' &&
    selections.distancia !== '';

  return (
    <main className="flex min-h-[100svh] flex-col justify-center bg-[#49416D] p-4 pb-2">
      <div className="flex w-full flex-col items-center justify-center">
        <div className="grid w-full max-w-6xl grid-cols-1 gap-2 sm:grid-cols-3 md:gap-2">
          {/* Posição */}
          <div className="flex flex-col items-center gap-2 sm:gap-4">
            <h2 className="mb-1 text-xl font-bold text-white sm:text-2xl md:text-3xl">Posição</h2>
            <div className="flex w-full flex-1 flex-col gap-3 sm:gap-4">
              <SelectionButton option="posicao" value="em_pe" selections={selections} handleSelection={handleSelection}>
                Em pé
              </SelectionButton>
              <SelectionButton option="posicao" value="sentado" selections={selections} handleSelection={handleSelection}>
                Sentado
              </SelectionButton>
            </div>
          </div>

          {/* Membros */}
          <div className="flex flex-col items-center gap-2 sm:gap-4">
            <h2 className="mb-1 text-xl font-bold text-white sm:text-2xl md:text-3xl">Membros</h2>
            <div className="flex w-full flex-1 flex-col gap-3 sm:gap-4">
              <SelectionButton
                option="membros"
                value="superiores"
                className="flex-wrap"
                selections={selections} 
                handleSelection={handleSelection}
              >
                <SuperioresIconContent />
              </SelectionButton>
              <SelectionButton
                option="membros"
                value="inferiores"
                className="flex-wrap"
                selections={selections}
                handleSelection={handleSelection}
              >
                <InferioresIconContent />
              </SelectionButton>
            </div>
          </div>

          {/* Distância */}
          <div className="flex flex-col items-center gap-2 sm:gap-4">
            <h2 className="mb-1 text-xl font-bold text-white sm:text-2xl md:text-3xl">Distância</h2>
            <div className="flex w-full flex-1 flex-col gap-3 sm:gap-4">
              <SelectionButton option="distancia" value="nivel_1" selections={selections} handleSelection={handleSelection}>
                Nível 1
              </SelectionButton>
              <SelectionButton option="distancia" value="nivel_2" selections={selections} handleSelection={handleSelection}>
                Nível 2
              </SelectionButton>
              <SelectionButton option="distancia" value="nivel_3" selections={selections} handleSelection={handleSelection}>
                Nível 3
              </SelectionButton>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-center pt-2">
        <Button
          size="lg"
          className="h-16 w-full max-w-md rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:bg-gray-400 disabled:opacity-50 sm:h-20 sm:text-2xl"
          disabled={!isComplete}
          onClick={onStart}
        >
          Iniciar
        </Button>
      </div>
    </main>
  );
}


function JogoView({ 
  cameraStream,
  score,
  setScore,
  isIos,
}: { 
  cameraStream: MediaStream | null;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  isIos: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState(10);
  const [showCountdown, setShowCountdown] = useState(true);
  
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const animationFrameId = useRef<number | null>(null);
  const circleRef = useRef<{ id: number; x: number; y: number; radius: number; visible: boolean } | null>(null);
  const [sphereImage, setSphereImage] = useState<HTMLImageElement | null>(null);
  const [explosionImage, setExplosionImage] = useState<HTMLImageElement | null>(null);
  const explosionRef = useRef<{ x: number; y: number; radius: number, timestamp: number } | null>(null);
  const needsToSpawnCircle = useRef(false);
  const sphereTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sphereImg = new window.Image();
    sphereImg.src = '/img/sphere.png';
    sphereImg.onload = () => {
      setSphereImage(sphereImg);
    };

    const explodeImg = new window.Image();
    explodeImg.src = '/img/explode.png';
    explodeImg.onload = () => {
        setExplosionImage(explodeImg);
    };
  }, []);
  
  useEffect(() => {
    if (!sphereImage || !explosionImage) return;

    const video = videoRef.current;
    if (!video || !cameraStream) return;

    video.srcObject = cameraStream;
    
    const spawnCircle = (landmarks: any[]) => {
        const canvas = canvasRef.current;
        if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    
        const radius = Math.min(canvas.width, canvas.height) * 0.12;
        const padding = radius + 10;
        const collisionRadius = radius * 2.5; // Safety distance from player
        let x: number, y: number;
        let isColliding = true;
        let attempts = 0;
    
        while (isColliding && attempts < 10) {
            isColliding = false;
            x = Math.random() * (canvas.width - padding * 2) + padding;
            y = Math.random() * (canvas.height - padding * 2) + padding;
    
            if (landmarks) {
                for (const landmark of landmarks) {
                    for (const point of landmark) {
                        const dx = point.x * canvas.width - x;
                        const dy = point.y * canvas.height - y;
                        if (Math.sqrt(dx * dx + dy * dy) < collisionRadius) {
                            isColliding = true;
                            break;
                        }
                    }
                    if (isColliding) break;
                }
            }
            attempts++;
        }
        
        // Fallback to random position if it can't find a free spot
        if (isColliding) {
            x = Math.random() * (canvas.width - padding * 2) + padding;
            y = Math.random() * (canvas.height - padding * 2) + padding;
        }
    
        const newCircleId = Date.now();
        circleRef.current = { id: newCircleId, x: x!, y: y!, radius, visible: true };
        needsToSpawnCircle.current = false;
    
        if (sphereTimeoutRef.current) {
            clearTimeout(sphereTimeoutRef.current);
        }
    
        sphereTimeoutRef.current = setTimeout(() => {
            if (circleRef.current && circleRef.current.id === newCircleId) {
                needsToSpawnCircle.current = true;
            }
        }, 4000);
    };
    
    const startMediaPipe = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;

      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task`,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 3,
        });
        predictWebcam();
      } catch (e) {
        console.error("Erro ao criar PoseLandmarker", e);
      }
    };

    const checkCollision = (landmark: any, currentCircle: any) => {
      if (!canvasRef.current) return false;
      const dx = landmark.x * canvasRef.current.width - currentCircle.x;
      const dy = landmark.y * canvasRef.current.height - currentCircle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < currentCircle.radius;
    };
    
    const predictWebcam = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const poseLandmarker = poseLandmarkerRef.current;

      if (!video || !canvas || !poseLandmarker || !canvas.getContext('2d')) {
         if (webcamRunningRef.current) {
            animationFrameId.current = window.requestAnimationFrame(predictWebcam);
         }
         return;
      }
      
      const canvasCtx = canvas.getContext('2d')!;
      
      if (video.paused || video.ended || video.readyState < 2) {
        animationFrameId.current = window.requestAnimationFrame(predictWebcam);
        return;
      }
      
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
      
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const startTimeMs = performance.now();
      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;

        poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
          if (needsToSpawnCircle.current && canvas.width > 0 && canvas.height > 0) {
            spawnCircle(result.landmarks);
          }

          for (const landmark of result.landmarks) {
            const drawingUtils = new DrawingUtils(canvasCtx);
            drawingUtils.drawLandmarks(landmark, {
              color: '#FFFFFF',
              radius: (data) => DrawingUtils.lerp(data.from!.z!, -0.15, 0.1, 5, 1),
            });
            drawingUtils.drawConnectors(
                landmark,
                PoseLandmarker.POSE_CONNECTIONS,
                { color: '#FFFFFF' }
            );
            
            if (circleRef.current && circleRef.current.visible) {
              for (const point of landmark) {
                if (point && checkCollision(point, circleRef.current)) {
                  explosionRef.current = {
                    x: circleRef.current.x,
                    y: circleRef.current.y,
                    radius: circleRef.current.radius,
                    timestamp: Date.now(),
                  };

                  circleRef.current.visible = false;
                  setScore((prevScore) => prevScore + 1);

                   if (sphereTimeoutRef.current) {
                    clearTimeout(sphereTimeoutRef.current);
                  }

                  // Wait for explosion to finish before spawning next circle
                  setTimeout(() => {
                    needsToSpawnCircle.current = true;
                  }, 300);

                  break; 
                }
              }
            }
          }
        });
      }
      
      if (sphereImage && circleRef.current && circleRef.current.visible) {
        const radius = circleRef.current.radius;
        canvasCtx.drawImage(
          sphereImage,
          circleRef.current.x - radius,
          circleRef.current.y - radius,
          radius * 2,
          radius * 2
        );
      }
      
      if (explosionImage && explosionRef.current) {
        const now = Date.now();
        if (now - explosionRef.current.timestamp < 300) {
            const radius = explosionRef.current.radius;
            canvasCtx.drawImage(
              explosionImage,
              explosionRef.current.x - radius,
              explosionRef.current.y - radius,
              radius * 2,
              radius * 2
            );
        } else {
            explosionRef.current = null;
        }
      }

      canvasCtx.restore();
      if (webcamRunningRef.current) {
        animationFrameId.current = window.requestAnimationFrame(predictWebcam);
      }
    };
    
    const webcamRunningRef = { current: true };
    video.addEventListener('loadeddata', startMediaPipe);

    return () => {
      webcamRunningRef.current = false;
      video.removeEventListener('loadeddata', startMediaPipe);
      if (animationFrameId.current) {
        window.cancelAnimationFrame(animationFrameId.current);
      }
      if (sphereTimeoutRef.current) {
        clearTimeout(sphereTimeoutRef.current);
      }
      poseLandmarkerRef.current?.close();
    };
  }, [cameraStream, setScore, sphereImage, explosionImage]);


  useEffect(() => {
    if ((sphereImage && explosionImage) && showCountdown) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setShowCountdown(false);
        needsToSpawnCircle.current = true;
      }
    }
  }, [countdown, showCountdown, sphereImage, explosionImage]);


  return (
    <div className={cn(
        "relative w-screen overflow-hidden bg-black",
        isIos ? "h-[130svh]" : "h-[100svh]"
      )}>
       <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      ></video>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      ></canvas>

      {showCountdown ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex w-full items-center justify-around gap-8 px-4">
            <div className="relative h-52 w-1/3 lg:h-64 xl:h-72 2xl:h-96">
              <Image
                src="/img/aviso_posicionamento.png"
                alt="Aviso de posicionamento"
                fill
                className="object-contain"
              />
            </div>
             <div className="relative h-screen w-1/3">
              <Image
                src="/img/icon_position.png"
                alt="Posicionamento de exemplo"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative flex h-52 w-1/3 items-center justify-center lg:h-64 xl:h-72 2xl:h-96">
              <Image
                src="/img/T_timer.png"
                alt="Timer"
                fill
                className="object-contain"
              />
              <p className="font-headline absolute font-extrabold leading-none text-white text-6xl sm:text-7xl md:text-8xl">
                {countdown}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-10 p-8">
           <div className="absolute right-8 top-8 rounded-2xl bg-[#49416D] px-6 py-3 shadow-lg">
            <p className="font-headline text-2xl font-bold text-white md:text-3xl">
              Pontos: {score}
            </p>
          </div>
        </div>
      )}
      
       {cameraStream === null && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
            <Alert variant="destructive" className="max-w-sm">
                <AlertTitle>Acesso à câmera necessário</AlertTitle>
                <AlertDescription>
                  Por favor, habilite a permissão da câmera nas configurações do seu navegador para usar o aplicativo.
                </AlertDescription>
              </Alert>
          </div>
        )}
    </div>
  );
}


function HomeView({ onStart, hasCameraPermission }: { onStart: () => void, hasCameraPermission: boolean | null }) {
  return (
    <main className="flex h-[100svh] w-full flex-row pb-2">
      {/* Left Panel */}
      <div className="flex w-1/2 flex-col items-center justify-center bg-card p-4 md:p-8">
        <Logo className="h-64 w-64 md:h-64 md:w-64 lg:h-96 lg:w-96" />
      </div>

      {/* Right Panel */}
      <div className="flex h-full w-1/2 flex-1 flex-col items-center justify-center bg-panel-right p-4 md:p-8">
        <div className="flex flex-col items-center gap-4 md:gap-6">
          <Button
            onClick={onStart}
            size="lg"
            className="h-14 w-40 rounded-2xl bg-primary text-base font-extrabold text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-panel-right md:h-24 md:w-[300px] md:text-2xl disabled:cursor-not-allowed disabled:bg-gray-500 disabled:opacity-70"
            disabled={hasCameraPermission !== true}
          >
            Iniciar
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-10 w-40 rounded-2xl border-4 border-primary bg-card font-bold text-[#49416D] shadow-lg transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background md:h-14 md:w-[300px] md:text-xl"
          >
            <Link href="#">Tutorial</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-10 w-40 rounded-2xl border-4 border-primary bg-card font-bold text-[#49416D] shadow-lg transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background md:h-14 md:w-[300px] md:text-xl"
          >
            <Link href="#">Recomendações</Link>
          </Button>
        </div>
      </div>
       {hasCameraPermission === false && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
            <Alert variant="destructive" className="max-w-md">
                <AlertTitle>Acesso à câmera necessário</AlertTitle>
                <AlertDescription>
                  Para continuar, por favor, habilite a permissão da câmera nas configurações do seu navegador e atualize a página.
                </AlertDescription>
              </Alert>
          </div>
        )}
    </main>
  );
}

export default function Page() {
  const [currentView, setCurrentView] = useState<View>('home');
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [score, setScore] = useState(0);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // This check runs only on the client, where navigator is available.
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  const handleStartGame = () => {
    setScore(0); // Reseta a pontuação
    setCurrentView('jogo');
  };

  // Solicita permissão da câmera ao carregar o app
  useEffect(() => {
    // Evita pedir permissão novamente se já foi definida
    if (hasCameraPermission !== null) return;
    
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        setCameraStream(stream);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setCameraStream(null);
        toast({
          variant: 'destructive',
          title: 'Acesso à câmera negado',
          description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
          duration: 9000
        });
      }
    };

    getCameraPermission();
    
    // A limpeza do stream agora é tratada no JogoView para evitar que a câmera desligue prematuramente
  }, [toast, hasCameraPermission]);

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView onStart={() => setCurrentView('configuracoes')} hasCameraPermission={hasCameraPermission} />;
      case 'configuracoes':
        return <ConfiguracoesView onStart={handleStartGame} />;
      case 'jogo':
        return <JogoView cameraStream={cameraStream} score={score} setScore={setScore} isIos={isIos} />;
      default:
        return <HomeView onStart={() => setCurrentView('configuracoes')} hasCameraPermission={hasCameraPermission}/>;
    }
  };

  return (
    <>
      {renderView()}
    </>
  );
}
