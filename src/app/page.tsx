'use client';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { useState, useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Smartphone, User } from 'lucide-react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from '@mediapipe/tasks-vision';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

type View = 'orientacoes' | 'home' | 'configuracoes' | 'jogo' | 'final';
type Option = 'membros' | 'velocidade';
type Selections = {
  membros: string;
  velocidade: string;
};

const SuperioresIconContent = memo(function SuperioresIconContent() {
  return (
    <>
      <div className="flex flex-col items-center text-center">
        <span>Superiores</span>
        <span>(Braços)</span>
      </div>
      <Image
        src="/img/hand.svg"
        alt="Mãos"
        width={40}
        height={40}
        className="object-contain"
      />
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
      <Image
        src="/img/feet.svg"
        alt="Pés"
        width={40}
        height={40}
        className="object-contain"
      />
    </>
  );
});
InferioresIconContent.displayName = 'InferioresIconContent';

const SelectionButton = memo(
  ({
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
    selections: Selections;
    handleSelection: (option: Option, value: string) => void;
  }) => {
    const isSelected = selections[option] === value;
    return (
      <Button
        variant="outline"
        className={cn(
          'relative w-full flex-1 justify-center rounded-xl border-1  bg-card text-lg font-bold text-[#49416D] shadow-lg hover:bg-card/80 sm:text-xl',
          'whitespace-normal break-words py-2',
          'h-full',
          isSelected && 'border-primary ring-4 ring-primary/100',
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
  }
);
SelectionButton.displayName = 'SelectionButton';

function ConfiguracoesView({
  onStart,
}: {
  onStart: (selections: Selections) => void;
}) {
  const [selections, setSelections] = useState<Selections>({
    membros: '',
    velocidade: '',
  });

  const handleSelection = (option: Option, value: string) => {
    setSelections((prev) => ({ ...prev, [option]: value }));
  };

  const isComplete = selections.membros !== '' && selections.velocidade !== '';

  return (
    <main
      className={cn(
        'flex h-screen flex-col justify-center bg-background p-4 pb-2'
      )}
    >
      <div className="flex w-full flex-col items-center justify-center">
        <div className="grid w-full max-w-6xl grid-cols-1 gap-2 sm:grid-cols-2 md:gap-5">
          {/* Membros */}
          <div className="flex flex-col items-center gap-2 sm:gap-4">
            <h2 className="mb-1 text-base font-bold text-white sm:text-2xl">
              Membros
            </h2>
            <div className="flex w-full flex-1 flex-col gap-3 sm:gap-4">
              <SelectionButton
                option="membros"
                value="superiores"
                className="flex-wrap text-sm"
                selections={selections}
                handleSelection={handleSelection}
              >
                <SuperioresIconContent />
              </SelectionButton>
              <SelectionButton
                option="membros"
                value="inferiores"
                className="flex-wrap text-sm"
                selections={selections}
                handleSelection={handleSelection}
              >
                <InferioresIconContent />
              </SelectionButton>
            </div>
          </div>

          {/* Velocidade */}
          <div className="flex flex-col items-center gap-2 sm:gap-4">
            <h2 className="mb-1 text-base font-bold text-white sm:text-2xl">
              Velocidade
            </h2>
            <div className="flex w-full flex-1 flex-col gap-3 sm:gap-4">
              <SelectionButton
                option="velocidade"
                value="lento"
                selections={selections}
                handleSelection={handleSelection}
              >
                Lento
              </SelectionButton>
              <SelectionButton
                option="velocidade"
                value="intermediário"
                selections={selections}
                handleSelection={handleSelection}
              >
                Intermediário
              </SelectionButton>
              <SelectionButton
                option="velocidade"
                value="rapido"
                selections={selections}
                handleSelection={handleSelection}
              >
                Rápido
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
          onClick={() => onStart(selections)}
        >
          Iniciar
        </Button>
      </div>
    </main>
  );
}

function JogoView({
  cameraStream,
  gameConfig,
  onGameEnd,
}: {
  cameraStream: MediaStream | null;
  gameConfig: Selections;
  onGameEnd: (finalScore: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countdown, setCountdown] = useState(10);
  const [showCountdown, setShowCountdown] = useState(true);
  const [initialGameTime] = useState(180);
  const [gameTime, setGameTime] = useState(initialGameTime);
  const scoreRef = useRef(0);
  const scoreDisplayRef = useRef<HTMLParagraphElement>(null);
  const endTimeRef = useRef<number | null>(null);

  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const animationFrameId = useRef<number | null>(null);
  const circleRef = useRef<{
    id: number;
    x: number;
    y: number;
    radius: number;
    visible: boolean;
    type: number;
    image: HTMLImageElement;
  } | null>(null);

  const [sphereImages, setSphereImages] = useState<HTMLImageElement[]>([]);
  const [explosionImages, setExplosionImages] = useState<HTMLImageElement[]>(
    []
  );

  const explosionRef = useRef<{
    x: number;
    y: number;
    radius: number;
    timestamp: number;
    image: HTMLImageElement;
  } | null>(null);
  const needsToSpawnCircle = useRef(false);
  const sphereTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getRespawnTimeoutDuration = () => {
    switch (gameConfig.velocidade) {
      case 'rapido':
        return 0;
      case 'intermediário':
        return 2500;
      case 'lento':
      default:
        return 5000;
    }
  };

  useEffect(() => {
    if (!showCountdown) {
      if (endTimeRef.current === null) {
        endTimeRef.current = Date.now() + initialGameTime * 1000;
      }

      const timer = setInterval(() => {
        if (endTimeRef.current) {
          const timeLeft = Math.round((endTimeRef.current - Date.now()) / 1000);
          if (timeLeft > 0) {
            setGameTime(timeLeft);
          } else {
            setGameTime(0);
            onGameEnd(scoreRef.current);
            clearInterval(timer);
          }
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showCountdown, initialGameTime, onGameEnd]);

  useEffect(() => {
    const spherePaths = [
      '/img/sphere.png',
      '/img/sphere-v2.png',
      '/img/sphere-v3.png',
    ];
    const explosionPaths = [
      '/img/explode.png',
      '/img/explode-v2.png',
      '/img/explode-v3.png',
    ];

    const loadedSphereImages: HTMLImageElement[] = [];
    const loadedExplosionImages: HTMLImageElement[] = [];

    let imagesToLoad = spherePaths.length + explosionPaths.length;

    const onImageLoad = () => {
      imagesToLoad--;
      if (imagesToLoad === 0) {
        setSphereImages(loadedSphereImages);
        setExplosionImages(loadedExplosionImages);
      }
    };

    spherePaths.forEach((path) => {
      const img = new window.Image();
      img.src = path;
      img.onload = onImageLoad;
      loadedSphereImages.push(img);
    });

    explosionPaths.forEach((path) => {
      const img = new window.Image();
      img.src = path;
      img.onload = onImageLoad;
      loadedExplosionImages.push(img);
    });
  }, []);

  useEffect(() => {
    if (sphereImages.length === 0 || explosionImages.length === 0) return;

    const video = videoRef.current;
    if (!video || !cameraStream) return;

    video.srcObject = cameraStream;

    const spawnCircle = (landmarks?: any[]) => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.width === 0 || canvas.height === 0) return;

      const radius = Math.min(canvas.width, canvas.height) * 0.09;
      let x: number, y: number;

      const collisionRadius = radius * 2.5; // Safety distance from player
      let isColliding = true;
      let attempts = 0;

      const rem = 16;
      const timerSize = 5 * rem; // 5rem = h-20/w-20
      const padding = 2 * rem;
      const scoreBoxWidth = 10 * rem;
      const scoreBoxHeight = 5 * rem;

      const timerZone = {
        x1: padding,
        y1: padding,
        x2: padding + timerSize,
        y2: padding + timerSize,
      };
      const scoreZone = {
        x1: canvas.width - padding - scoreBoxWidth,
        y1: padding,
        x2: canvas.width - padding,
        y2: padding + scoreBoxHeight,
      };

      let spawnRangeHeight, spawnRangeYStart;

      if (gameConfig.membros === 'inferiores') {
        spawnRangeYStart = canvas.height * 0.7;
        spawnRangeHeight = canvas.height * 0.1;
      } else {
        spawnRangeHeight = canvas.height * 0.6;
        spawnRangeYStart = (canvas.height - spawnRangeHeight) / 2;
      }

      // Ensure the sphere doesn't spawn off-screen at the bottom
      spawnRangeHeight = Math.max(0, spawnRangeHeight - radius);

      while (isColliding && attempts < 20) {
        isColliding = false;
        attempts++;

        const spawnSide = Math.random() < 0.5 ? 'left' : 'right';
        const horizontalPadding = canvas.width * 0.1;
        const sideWidth = canvas.width / 2 - horizontalPadding;

        if (spawnSide === 'left') {
          x = Math.random() * sideWidth + horizontalPadding;
        } else {
          x = canvas.width - (Math.random() * sideWidth + horizontalPadding);
        }

        y = Math.random() * spawnRangeHeight + spawnRangeYStart;

        if (
          (x > timerZone.x1 - radius &&
            x < timerZone.x2 + radius &&
            y > timerZone.y1 - radius &&
            y < timerZone.y2 + radius) ||
          (x > scoreZone.x1 - radius &&
            x < scoreZone.x2 + radius &&
            y > scoreZone.y1 - radius &&
            y < scoreZone.y2 + radius)
        ) {
          isColliding = true;
          continue;
        }

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
      }

      if (isColliding) {
        const spawnSide = Math.random() < 0.5 ? 'left' : 'right';
        const horizontalPadding = canvas.width * 0.1;
        const sideWidth = canvas.width / 2 - horizontalPadding;
        if (spawnSide === 'left') {
          x = Math.random() * sideWidth + horizontalPadding;
        } else {
          x = canvas.width - (Math.random() * sideWidth + horizontalPadding);
        }
        y = Math.random() * spawnRangeHeight + spawnRangeYStart;
      }

      const sphereType = Math.floor(Math.random() * sphereImages.length);
      const sphereImage = sphereImages[sphereType];

      const newCircleId = Date.now();
      circleRef.current = {
        id: newCircleId,
        x: x!,
        y: y!,
        radius,
        visible: true,
        type: sphereType,
        image: sphereImage,
      };
      needsToSpawnCircle.current = false;

      if (sphereTimeoutRef.current) {
        clearTimeout(sphereTimeoutRef.current);
      }

      sphereTimeoutRef.current = setTimeout(() => {
        if (circleRef.current && circleRef.current.id === newCircleId) {
          needsToSpawnCircle.current = true;
        }
      }, 5000); // 5-second timeout for the sphere to disappear
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
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task`,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 3,
          }
        );
        predictWebcam();
      } catch (e) {
        console.error('Erro ao criar PoseLandmarker', e);
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
      if (canvas.height !== video.videoHeight)
        canvas.height = video.videoHeight;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const startTimeMs = performance.now();
      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;

        poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
          if (
            needsToSpawnCircle.current &&
            canvas.width > 0 &&
            canvas.height > 0
          ) {
            spawnCircle(result.landmarks);
          }

          for (const landmark of result.landmarks) {
            const drawingUtils = new DrawingUtils(canvasCtx);
            drawingUtils.drawLandmarks(landmark, {
              color: '#00000000',
              radius: (data) =>
                DrawingUtils.lerp(data.from!.z!, -0.15, 0.1, 5, 1),
            });
            drawingUtils.drawConnectors(
              landmark,
              PoseLandmarker.POSE_CONNECTIONS,
              { color: '#00000000' }
            );

            if (circleRef.current && circleRef.current.visible) {
              const handsLandmarks = [15, 16, 17, 18, 19, 20, 21, 22];
              const feetLandmarks = [27, 28, 29, 30, 31, 32];

              let landmarksToCheck: number[] = [];

              if (gameConfig.membros === 'superiores') {
                landmarksToCheck = handsLandmarks;
              } else if (gameConfig.membros === 'inferiores') {
                landmarksToCheck = feetLandmarks;
              }

              for (const index of landmarksToCheck) {
                const point = landmark[index];
                if (point && checkCollision(point, circleRef.current)) {
                  const currentCircle = circleRef.current;
                  const explosionImage = explosionImages[currentCircle.type];
                  explosionRef.current = {
                    x: currentCircle.x,
                    y: currentCircle.y,
                    radius: currentCircle.radius,
                    timestamp: Date.now(),
                    image: explosionImage,
                  };

                  circleRef.current.visible = false;
                  scoreRef.current += 1;
                  if (scoreDisplayRef.current) {
                    scoreDisplayRef.current.innerText = `Pontos: ${scoreRef.current}`;
                  }

                  if (sphereTimeoutRef.current) {
                    clearTimeout(sphereTimeoutRef.current);
                  }

                  const respawnDuration = getRespawnTimeoutDuration();
                  if (respawnDuration > 0) {
                    setTimeout(() => {
                      needsToSpawnCircle.current = true;
                    }, respawnDuration);
                  } else {
                    needsToSpawnCircle.current = true;
                  }

                  break;
                }
              }
            }
          }
        });
      }

      if (circleRef.current && circleRef.current.visible) {
        const radius = circleRef.current.radius;
        canvasCtx.drawImage(
          circleRef.current.image,
          circleRef.current.x - radius,
          circleRef.current.y - radius,
          radius * 2,
          radius * 2
        );
      }

      if (explosionRef.current) {
        const now = Date.now();
        if (now - explosionRef.current.timestamp < 300) {
          const radius = explosionRef.current.radius;
          canvasCtx.drawImage(
            explosionRef.current.image,
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
  }, [cameraStream, sphereImages, explosionImages, gameConfig, onGameEnd]);

  useEffect(() => {
    if (sphereImages.length > 0 && explosionImages.length > 0 && showCountdown) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setShowCountdown(false);
        needsToSpawnCircle.current = true;
      }
    }
  }, [countdown, showCountdown, sphereImages, explosionImages]);

  const timePercentage = gameTime / initialGameTime;
  const angle = timePercentage * 360;

  return (
    <div
      className={cn(
        'relative h-screen w-screen overflow-hidden bg-black'
      )}
    >
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
            <Card className="flex h-52 w-1/3 flex-col items-center justify-center border-4 border-primary bg-card p-4 text-center text-card-foreground lg:h-64 xl:h-72 2xl:h-96">
              <p className="text-xs font-medium text-[#49416D] md:text-base">
                Posicione-se de frente para a câmera, garantindo que todo seu
                corpo esteja visível na tela.
              </p>
            </Card>
            <div className="relative h-screen w-1/3">
              <Image
                src={'/img/icon_position.png'}
                alt="Posicionamento de exemplo"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative flex h-52 w-1/3 items-center justify-center lg:h-64 xl:h-72 2xl:h-96">
              <Image
                src="/img/T_SVGTimer.svg"
                alt="Timer"
                fill
                className="object-contain saturate-100 contrast-100"
              />
              <p className="font-headline absolute text-6xl font-extrabold leading-none text-white sm:text-7xl md:text-8xl">
                {countdown}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-10 flex justify-between p-8">
          <div className="relative h-20 w-20">
            <div
              className="absolute rounded-full"
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${angle}deg, transparent ${angle}deg)`,
                width: 'calc(5rem - 18px)',
                height: 'calc(5rem - 18px)',
                left: '9px',
                top: '13px',
              }}
            />
            <Image
              src="/img/game_timer.png"
              alt="Timer"
              fill
              className="object-contain saturate-100 contrast-100"
            />
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-panel-right px-6 py-3 text-center shadow-lg">
              <p
                ref={scoreDisplayRef}
                className="font-headline text-2xl font-bold text-white md:text-3xl"
              >
                Pontos: 0
              </p>
            </div>
          </div>
        </div>
      )}

      {cameraStream === null && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
          <Alert variant="destructive" className="max-w-sm">
            <AlertTitle>Acesso à câmera necessário</AlertTitle>
            <AlertDescription>
              Por favor, habilite a permissão da câmera nas configurações do seu
              navegador para usar o aplicativo.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}

function HomeView({
  onStart,
  onRecommendationsClick,
  hasCameraPermission,
}: {
  onStart: () => void;
  onRecommendationsClick: () => void;
  hasCameraPermission: boolean | null;
}) {
  return (
    <main className="flex h-screen w-full flex-row">
      {/* Left Panel */}
      <div className="flex w-1/2 flex-col items-center justify-center bg-card p-4 sm:p-6 md:p-8">
        <Logo className="h-48 w-48 sm:h-64 sm:w-64 lg:h-96 lg:w-96" />
      </div>

      {/* Right Panel */}
      <div className="flex w-1/2 flex-col items-center justify-center bg-panel-right p-4 sm:p-6 md:p-8">
        <div className="flex flex-col items-center gap-4 md:gap-6">
          <Button
            onClick={onStart}
            size="lg"
            className="h-10 w-48 rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-panel-right sm:h-12 sm:w-52 sm:text-lg md:h-20 md:w-[300px] md:text-2xl disabled:cursor-not-allowed disabled:bg-gray-500 disabled:opacity-70"
            disabled={hasCameraPermission !== true}
          >
            Iniciar
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-10 w-48 rounded-2xl border-4 border-primary bg-card font-bold text-primary shadow-lg transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background sm:h-12 sm:w-52 sm:text-base md:h-14 md:w-[300px] md:text-xl"
          >
            <Link href="#">Tutorial</Link>
          </Button>
          <Button
            onClick={onRecommendationsClick}
            size="lg"
            variant="outline"
            className="h-10 w-48 rounded-2xl border-4 border-primary bg-card font-bold text-primary shadow-lg transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background sm:h-12 sm:w-52 sm:text-base md:h-14 md:w-[300px] md:text-xl"
          >
            Recomendações
          </Button>
        </div>
      </div>
      {hasCameraPermission === false && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
          <Alert variant="destructive" className="max-w-md">
            <AlertTitle>Acesso à câmera necessário</AlertTitle>
            <AlertDescription>
              Para continuar, por favor, habilite a permissão da câmera nas
              configurações do seu navegador e atualize a página.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </main>
  );
}

function FinalView({
  score,
  onPlayAgain,
  onExit,
}: {
  score: number;
  onPlayAgain: () => void;
  onExit: () => void;
}) {
  return (
    <main
      className={cn(
        'flex h-screen w-full flex-col lg:flex-row'
      )}
    >
      {/* Left Panel */}
      <div className="flex min-h-[50svh] w-full flex-col items-center justify-center gap-4 bg-card p-4 text-center text-primary md:p-8 lg:min-h-full lg:w-1/2">
        <h1 className="font-headline text-3xl font-extrabold sm:text-5xl md:text-7xl">
          Parabéns!
        </h1>
        <div className="text-center">
          <p className="text-lg sm:text-2xl md:text-3xl">Sua pontuação foi:</p>
          <p className="font-headline text-5xl font-black text-primary sm:text-7xl md:text-9xl">
            {score}
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex min-h-[50svh] w-full flex-1 flex-col items-center justify-center bg-panel-right p-4 md:p-8 lg:min-h-full lg:w-1/2">
        <div className="flex flex-col items-center gap-4 md:gap-6">
          <Button
            onClick={onExit}
            size="lg"
            variant="outline"
            className="h-14 w-64 rounded-2xl border-4 border-primary bg-card font-bold text-primary shadow-lg transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background md:h-20 md:w-[300px] md:text-xl"
          >
            Ir para o menu
          </Button>
          <Button
            onClick={onPlayAgain}
            size="lg"
            variant="outline"
            className="h-14 w-64 rounded-2xl border-4 border-primary bg-card font-bold text-primary shadow-lg transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background md:h-20 md:w-[300px] md:text-xl"
          >
            Jogar novamente
          </Button>
        </div>
      </div>
    </main>
  );
}

function OrientacoesView({
  onUnderstood,
  hasCameraPermission,
}: {
  onUnderstood: () => void;
  hasCameraPermission: boolean | null;
}) {
  return (
    <main
      className={cn(
        'flex h-screen flex-col items-center justify-center bg-background p-4 text-white'
      )}
    >
      <div className="flex w-full flex-1 flex-col items-center justify-center md:max-w-4xl">
        <h1 className="mb-4 font-headline text-lg font-bold sm:text-2xl md:text-3xl">
          Orientações
        </h1>
        <div className="flex w-full flex-col items-stretch justify-center gap-4 md:flex-row">
          {/* Dispositivo Card */}
          <div className="flex w-full flex-col rounded-2xl border-4 border-primary bg-card p-4 text-card-foreground md:w-1/2">
            <h2 className=" mb-4 flex items-center justify-center gap-2 font-headline text-lg text-[#49416D] md:text-2xl">
              <Smartphone />{' '}
              <span className="font-bold text-[#49416D]">Dispositivo</span>
            </h2>
            <div className="flex flex-1 flex-col items-center justify-between gap-4 md:flex-row">
              <ul className="flex-1 list-disc space-y-2 pl-5 text-xs md:text-base">
                <li className="font-medium">
                  Apoie o dispositivo sobre uma superfície firme e no chão,
                  mantendo-o inclinado para você.
                </li>
                <li className="font-medium">
                  Posicione o celular na orientação horizontal.
                </li>
              </ul>
              <Image
                src="/img/suporte.png"
                alt="Celular em um suporte"
                width={120}
                height={120}
                className="rounded-lg object-contain"
              />
            </div>
          </div>

          {/* Usuário Card */}
          <div className="flex w-full flex-col rounded-2xl border-4 border-primary bg-card p-4 text-card-foreground md:w-1/2">
            <h2 className="mb-2 flex items-center justify-center gap-2 font-headline text-lg font-bold text-[#49416D] md:text-2xl">
              <User /> <span className="font-bold text-[#49416D]">Usuário</span>
            </h2>
            <ul className="flex-1 list-disc space-y-2 pl-5 text-xs font-medium md:text-base">
              <li>
                Posicione-se de frente para a câmera, garantindo que todo seu
                corpo esteja visível na tela.
              </li>
              <li>Tenha espaço livre ao redor para se movimentar.</li>
            </ul>
          </div>
        </div>
        {hasCameraPermission === false && (
          <Alert variant="destructive" className="mt-4 max-w-2xl">
            <AlertTitle>Acesso à câmera necessário</AlertTitle>
            <AlertDescription>
              Por favor, habilite a permissão da câmera nas configurações do seu
              navegador e atualize a página para continuar.
            </AlertDescription>
          </Alert>
        )}
        <Button
          size="lg"
          onClick={onUnderstood}
          disabled={hasCameraPermission !== true}
          className="mt-8 h-14 w-full max-w-xs rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-500 disabled:opacity-70 md:h-16 md:text-xl"
        >
          Entendi!
        </Button>
      </div>
    </main>
  );
}

export default function Page() {
  const [currentView, setCurrentView] = useState<View>('orientacoes');
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [score, setScore] = useState(0);
  const [gameConfig, setGameConfig] = useState<Selections>({
    membros: '',
    velocidade: '',
  });

  const handleStartGame = (selections: Selections) => {
    setGameConfig(selections);
    setScore(0);
    setCurrentView('jogo');
  };

  const handleGameEnd = (finalScore: number) => {
    setScore(finalScore);
    setCurrentView('final');
  };

  const handlePlayAgain = () => {
    setCurrentView('configuracoes');
  };

  const handleExit = () => {
    setCurrentView('home');
  };

  const handleRecommendationsClick = () => {
    setCurrentView('orientacoes');
  };

  // Solicita permissão da câmera ao carregar o app
  useEffect(() => {
    // Evita pedir permissão novamente se já foi definida
    if (hasCameraPermission !== null || currentView !== 'orientacoes') return;

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setHasCameraPermission(true);
        setCameraStream(stream);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setCameraStream(null);
        toast({
          variant: 'destructive',
          title: 'Acesso à câmera negado',
          description:
            'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
          duration: 9000,
        });
      }
    };

    getCameraPermission();

    // A limpeza do stream agora é tratada no JogoView para evitar que a câmera desligue prematuramente
  }, [toast, hasCameraPermission, currentView]);

  const renderView = () => {
    switch (currentView) {
      case 'orientacoes':
        return (
          <OrientacoesView
            onUnderstood={() => setCurrentView('home')}
            hasCameraPermission={hasCameraPermission}
          />
        );
      case 'home':
        return (
          <HomeView
            onStart={() => setCurrentView('configuracoes')}
            onRecommendationsClick={handleRecommendationsClick}
            hasCameraPermission={hasCameraPermission}
          />
        );
      case 'configuracoes':
        return <ConfiguracoesView onStart={handleStartGame} />;
      case 'jogo':
        return (
          <JogoView
            cameraStream={cameraStream}
            gameConfig={gameConfig}
            onGameEnd={handleGameEnd}
          />
        );
      case 'final':
        return (
          <FinalView
            score={score}
            onPlayAgain={handlePlayAgain}
            onExit={handleExit}
          />
        );
      default:
        return (
          <OrientacoesView
            onUnderstood={() => setCurrentView('home')}
            hasCameraPermission={hasCameraPermission}
          />
        );
    }
  };

  return <>{renderView()}</>;
}
