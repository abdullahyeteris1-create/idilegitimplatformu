import {
  WORD_RACE_CARS,
  WORD_RACE_LEVEL_TARGET,
  WORD_RACE_LEVELS,
  WORD_RACE_MAX_WRONG,
  WORD_RACE_SPEED_TRANSITION_DELAY_MS,
  WORD_RACE_SPEEDS,
  WORD_RACE_WORD_PAIRS,
  getWordRaceLevel,
} from "./wordRaceConfig";
import type {
  WordRaceCarId,
  WordRaceCompletionReason,
  WordRaceEngineCallbacks,
  WordRaceResult,
  WordRaceSnapshot,
  WordRaceStartOptions,
} from "./types";

const SPAWN_Z = 84;
const GATE_GAP = 40;
const CAR_Y_RATIO = 0.82;
const HORIZON_Y_RATIO = 0.08;

type CardMetrics = {
  width: number;
  height: number;
  fontSize: number;
  radius: number;
  lineWidth: number;
};

type Gate = {
  z: number;
  lanes: number;
  oddLane: number;
  common: string;
  odd: string;
  commonMetrics: CardMetrics;
  oddMetrics: CardMetrics;
  judged: boolean;
  flash: number;
};

type EngineState = {
  running: boolean;
  paused: boolean;
  transitioning: boolean;
  ended: boolean;
  level: number;
  lanes: number;
  speedMs: number;
  carId: WordRaceCarId;
  startingLevel: number;
  startingSpeedMs: number;
  score: number;
  correct: number;
  wrong: number;
  levelBaseCorrect: number;
  levelBaseWrong: number;
  completedSpeedTiers: number;
  playerLane: number;
  targetLane: number;
  gates: Gate[];
  spawnRemaining: number;
  roadScroll: number;
  speedPenalty: number;
  startedAt: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function getCar(carId: WordRaceCarId) {
  return WORD_RACE_CARS.find((car) => car.id === carId) ?? WORD_RACE_CARS[0];
}

export class WordRaceEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly callbacks: WordRaceEngineCallbacks;
  private readonly resizeObserver: ResizeObserver | null;
  private animationFrameId: number | null = null;
  private transitionTimerId: number | null = null;
  private bannerTimerId: number | null = null;
  private lastTimestamp = 0;
  private lastSnapshotAt = 0;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private destroyed = false;
  private finalized = false;
  private pointerStart: { x: number; y: number } | null = null;

  private state: EngineState = {
    running: false,
    paused: false,
    transitioning: false,
    ended: false,
    level: 1,
    lanes: 3,
    speedMs: 2_500,
    carId: "spor",
    startingLevel: 1,
    startingSpeedMs: 2_500,
    score: 0,
    correct: 0,
    wrong: 0,
    levelBaseCorrect: 0,
    levelBaseWrong: 0,
    completedSpeedTiers: 0,
    playerLane: 1,
    targetLane: 1,
    gates: [],
    spawnRemaining: 16,
    roadScroll: 0,
    speedPenalty: 1,
    startedAt: 0,
  };

  constructor(canvas: HTMLCanvasElement, callbacks: WordRaceEngineCallbacks) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Kelime Yarışı Canvas bağlamı oluşturulamadı.");

    this.canvas = canvas;
    this.context = context;
    this.callbacks = callbacks;
    this.resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(this.handleResize);

    window.addEventListener("resize", this.handleResize);
    window.addEventListener("keydown", this.handleKeyDown, { passive: false });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    this.resizeObserver?.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.emitSnapshot(true);
    this.animationFrameId = window.requestAnimationFrame(this.loop);
  }

  start(options: WordRaceStartOptions): void {
    if (this.destroyed) return;
    const level = getWordRaceLevel(options.level);
    const speedMs = WORD_RACE_SPEEDS.includes(options.speedMs as (typeof WORD_RACE_SPEEDS)[number])
      ? options.speedMs
      : 2_500;
    const centerLane = Math.floor((level.lanes - 1) / 2);

    this.clearTimers();
    this.finalized = false;
    this.lastTimestamp = 0;
    this.state = {
      running: true,
      paused: false,
      transitioning: false,
      ended: false,
      level: level.level,
      lanes: level.lanes,
      speedMs,
      carId: options.carId,
      startingLevel: level.level,
      startingSpeedMs: speedMs,
      score: 0,
      correct: 0,
      wrong: 0,
      levelBaseCorrect: 0,
      levelBaseWrong: 0,
      completedSpeedTiers: 0,
      playerLane: centerLane,
      targetLane: centerLane,
      gates: [],
      spawnRemaining: 14,
      roadScroll: 0,
      speedPenalty: 1,
      startedAt: performance.now(),
    };
    this.spawnGate();
    this.emitSnapshot(true);
  }

  shift(direction: -1 | 1): void {
    if (!this.state.running || this.state.paused || this.state.transitioning || this.state.ended) return;
    this.state.targetLane = clamp(this.state.targetLane + direction, 0, this.state.lanes - 1);
  }

  pause(): void {
    if (!this.state.running || this.state.ended || this.state.transitioning) return;
    this.state.paused = true;
    this.emitSnapshot(true);
  }

  resume(): void {
    if (!this.state.running || this.state.ended || this.state.transitioning) return;
    this.state.paused = false;
    this.lastTimestamp = 0;
    this.emitSnapshot(true);
  }

  setSpeed(speedMs: number): void {
    if (!WORD_RACE_SPEEDS.includes(speedMs as (typeof WORD_RACE_SPEEDS)[number])) return;
    this.state.speedMs = speedMs;
    this.emitSnapshot(true);
  }

  finish(reason: WordRaceCompletionReason = "user_exit"): void {
    if (!this.state.running || this.finalized) return;
    this.finalized = true;
    this.clearTimers();
    this.state.running = false;
    this.state.paused = false;
    this.state.transitioning = false;
    this.state.ended = true;
    this.emitSnapshot(true);
    this.callbacks.onFinish(this.buildResult(reason));
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearTimers();
    if (this.animationFrameId !== null) window.cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
  }

  private readonly loop = (timestamp: number): void => {
    if (this.destroyed) return;
    const deltaSeconds = this.lastTimestamp === 0
      ? 0
      : Math.min(0.05, (timestamp - this.lastTimestamp) / 1_000);
    this.lastTimestamp = timestamp;

    if (this.state.running && !this.state.paused && !this.state.transitioning && deltaSeconds > 0) {
      this.update(deltaSeconds);
    }
    this.draw();
    this.emitSnapshot(false, timestamp);
    this.animationFrameId = window.requestAnimationFrame(this.loop);
  };

  private update(deltaSeconds: number): void {
    this.state.speedPenalty += (1 - this.state.speedPenalty) * Math.min(1, deltaSeconds * 1.8);
    this.state.playerLane += (this.state.targetLane - this.state.playerLane) * Math.min(1, deltaSeconds * 10);
    const unitsPerSecond = 34 * (2_500 / this.state.speedMs) * this.state.speedPenalty;
    const movement = unitsPerSecond * deltaSeconds;
    this.state.roadScroll = (this.state.roadScroll + movement) % 9;
    this.state.spawnRemaining -= movement;

    if (this.state.spawnRemaining <= 0) {
      this.spawnGate();
      this.state.spawnRemaining += GATE_GAP;
    }

    for (const gate of this.state.gates) {
      gate.z -= movement;
      gate.flash = Math.max(0, gate.flash - deltaSeconds * 2.5);
      if (!gate.judged && gate.z <= 0) this.judge(gate);
    }
    this.state.gates = this.state.gates.filter((gate) => gate.z > -12);
  }

  private judge(gate: Gate): void {
    if (gate.judged || this.state.ended) return;
    gate.judged = true;
    const selectedLane = Math.round(this.state.playerLane);
    if (selectedLane === gate.oddLane) {
      this.state.correct += 1;
      this.state.score += 10;
    } else {
      this.state.wrong = Math.min(WORD_RACE_MAX_WRONG, this.state.wrong + 1);
      this.state.score = Math.max(0, this.state.score - 5);
      this.state.speedPenalty = 0.42;
    }
    gate.flash = 1;
    this.emitSnapshot(true);

    if (this.state.wrong >= WORD_RACE_MAX_WRONG) {
      this.finish("wrong_limit");
      return;
    }

    const progress = this.getLevelProgress();
    if (progress >= WORD_RACE_LEVEL_TARGET) this.completeLevel();
  }

  private completeLevel(): void {
    if (this.state.transitioning || this.state.ended) return;
    if (this.state.level < WORD_RACE_LEVELS.length) {
      const nextLevel = getWordRaceLevel(this.state.level + 1);
      const laneChanged = nextLevel.lanes !== this.state.lanes;
      this.state.level = nextLevel.level;
      this.state.lanes = nextLevel.lanes;
      this.state.levelBaseCorrect = this.state.correct;
      this.state.levelBaseWrong = this.state.wrong;
      this.state.targetLane = Math.floor((nextLevel.lanes - 1) / 2);
      this.state.playerLane = this.state.targetLane;
      this.state.gates = [];
      this.state.spawnRemaining = 12;
      this.callbacks.onBanner(
        `Seviye ${nextLevel.level}`,
        laneChanged ? `Artık ${nextLevel.lanes} şerit var` : "Kelimeler daha çok benziyor",
      );
      this.emitSnapshot(true);
      return;
    }

    const speedIndex = WORD_RACE_SPEEDS.indexOf(this.state.speedMs as (typeof WORD_RACE_SPEEDS)[number]);
    const nextSpeed = speedIndex >= 0 ? WORD_RACE_SPEEDS[speedIndex + 1] : undefined;
    if (nextSpeed === undefined) {
      this.finish("all_levels_completed");
      return;
    }

    this.state.transitioning = true;
    this.state.completedSpeedTiers += 1;
    this.callbacks.onSpeedTransition(this.state.speedMs, nextSpeed);
    this.emitSnapshot(true);
    this.transitionTimerId = window.setTimeout(() => {
      this.transitionTimerId = null;
      if (this.destroyed || this.finalized) return;
      const firstLevel = getWordRaceLevel(1);
      this.state.speedMs = nextSpeed;
      this.state.level = 1;
      this.state.lanes = firstLevel.lanes;
      this.state.levelBaseCorrect = this.state.correct;
      this.state.levelBaseWrong = this.state.wrong;
      this.state.targetLane = Math.floor((firstLevel.lanes - 1) / 2);
      this.state.playerLane = this.state.targetLane;
      this.state.gates = [];
      this.state.spawnRemaining = 12;
      this.state.speedPenalty = 1;
      this.state.transitioning = false;
      this.lastTimestamp = 0;
      this.emitSnapshot(true);
    }, WORD_RACE_SPEED_TRANSITION_DELAY_MS);
  }

  private spawnGate(): void {
    const level = getWordRaceLevel(this.state.level);
    const tier = level.tiers[Math.floor(Math.random() * level.tiers.length)] ?? 0;
    const pairs = WORD_RACE_WORD_PAIRS[tier] ?? WORD_RACE_WORD_PAIRS[0];
    const pair = pairs[Math.floor(Math.random() * pairs.length)] ?? pairs[0];
    const common = pair[0];
    const odd = pair[1];
    this.state.gates.push({
      z: SPAWN_Z,
      lanes: this.state.lanes,
      oddLane: Math.floor(Math.random() * this.state.lanes),
      common,
      odd,
      commonMetrics: this.measureCard(common, this.state.lanes),
      oddMetrics: this.measureCard(odd, this.state.lanes),
      judged: false,
      flash: 0,
    });
  }

  private measureCard(word: string, lanes: number): CardMetrics {
    const fixedLaneWidth = this.roadTopWidth() / lanes;
    const maxWidth = Math.max(34, fixedLaneWidth * 0.9);
    const height = clamp(fixedLaneWidth * 0.56, 18, Math.min(40, this.height * 0.065));
    const padding = Math.max(4, height * 0.14);
    let fontSize = height * 0.58;
    this.context.font = `800 ${fontSize}px system-ui, sans-serif`;
    let measured = this.context.measureText(word).width;
    if (measured + padding * 2 > maxWidth) {
      fontSize = Math.max(8, fontSize * ((maxWidth - padding * 2) / measured));
      this.context.font = `800 ${fontSize}px system-ui, sans-serif`;
      measured = this.context.measureText(word).width;
    }
    return {
      width: clamp(measured + padding * 2, Math.min(maxWidth, height * 0.95), maxWidth),
      height,
      fontSize,
      radius: height * 0.22,
      lineWidth: Math.max(1, height * 0.05),
    };
  }

  private buildResult(reason: WordRaceCompletionReason): WordRaceResult {
    const attempts = this.state.correct + this.state.wrong;
    return {
      score: this.state.score,
      correct: this.state.correct,
      wrong: this.state.wrong,
      successRate: attempts > 0 ? Math.round((this.state.correct / attempts) * 100) : 0,
      reachedLevel: this.state.level,
      reachedSpeedMs: this.state.speedMs,
      startingLevel: this.state.startingLevel,
      startingSpeedMs: this.state.startingSpeedMs,
      durationSeconds: Math.max(1, Math.round((performance.now() - this.state.startedAt) / 1_000)),
      completionReason: reason,
      carId: this.state.carId,
      completedSpeedTiers: this.state.completedSpeedTiers,
    };
  }

  private getLevelProgress(): number {
    return Math.max(
      0,
      (this.state.correct - this.state.levelBaseCorrect) -
      (this.state.wrong - this.state.levelBaseWrong),
    );
  }

  private emitSnapshot(force: boolean, now = performance.now()): void {
    if (!force && now - this.lastSnapshotAt < 100) return;
    this.lastSnapshotAt = now;
    const phase: WordRaceSnapshot["phase"] = this.state.ended
      ? "ended"
      : this.state.transitioning
        ? "transition"
        : this.state.paused
          ? "paused"
          : this.state.running
            ? "playing"
            : "menu";
    this.callbacks.onSnapshot({
      phase,
      score: this.state.score,
      correct: this.state.correct,
      wrong: this.state.wrong,
      level: this.state.level,
      lanes: this.state.lanes,
      speedMs: this.state.speedMs,
      levelProgress: Math.min(WORD_RACE_LEVEL_TARGET, this.getLevelProgress()),
      maxLevelProgress: WORD_RACE_LEVEL_TARGET,
    });
  }

  private readonly handleResize = (): void => {
    this.resize();
  };

  private resize(): void {
    const rectangle = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rectangle.width);
    this.height = Math.max(1, rectangle.height);
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
    const pixelWidth = Math.round(this.width * this.dpr);
    const pixelHeight = Math.round(this.height * this.dpr);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = "high";
    for (const gate of this.state.gates) {
      gate.commonMetrics = this.measureCard(gate.common, gate.lanes);
      gate.oddMetrics = this.measureCard(gate.odd, gate.lanes);
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      event.preventDefault();
      this.shift(-1);
      return;
    }
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      event.preventDefault();
      this.shift(1);
      return;
    }
    if (event.key === " " && this.state.running && !this.state.transitioning) {
      event.preventDefault();
      if (this.state.paused) this.resume(); else this.pause();
    }
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointerStart = { x: event.clientX, y: event.clientY };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.pointerStart) return;
    const deltaX = event.clientX - this.pointerStart.x;
    const deltaY = event.clientY - this.pointerStart.y;
    this.pointerStart = null;
    if (Math.abs(deltaX) > 22 && Math.abs(deltaX) > Math.abs(deltaY)) {
      this.shift(deltaX > 0 ? 1 : -1);
      return;
    }
    const rectangle = this.canvas.getBoundingClientRect();
    this.shift(event.clientX > rectangle.left + rectangle.width / 2 ? 1 : -1);
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.state.running && !this.state.paused && !this.state.transitioning) this.pause();
      return;
    }
    this.lastTimestamp = 0;
    this.resize();
  };

  private clearTimers(): void {
    if (this.transitionTimerId !== null) window.clearTimeout(this.transitionTimerId);
    if (this.bannerTimerId !== null) window.clearTimeout(this.bannerTimerId);
    this.transitionTimerId = null;
    this.bannerTimerId = null;
  }

  private horizonY(): number { return this.height * HORIZON_Y_RATIO; }
  private carY(): number { return this.height * CAR_Y_RATIO; }
  private roadBottomWidth(): number { return Math.min(this.width * 0.78, this.height * 0.68); }
  private roadTopWidth(): number { return this.roadBottomWidth() * (this.width < 520 ? 0.58 : 0.38); }

  private roadWidthAt(z: number): number {
    const depth = clamp(1 - z / SPAWN_Z, 0, 1.2);
    return this.roadTopWidth() + (this.roadBottomWidth() - this.roadTopWidth()) * depth;
  }

  private roadLeftAt(z: number): number { return (this.width - this.roadWidthAt(z)) / 2; }
  private laneWidthAt(z = 0): number { return this.roadWidthAt(z) / this.state.lanes; }
  private laneX(lane: number, lanes = this.state.lanes, z = 0): number {
    return this.roadLeftAt(z) + (lane + 0.5) * (this.roadWidthAt(z) / lanes);
  }
  private yAt(z: number): number {
    const depth = 1 - z / SPAWN_Z;
    return this.horizonY() + (this.carY() - this.horizonY()) * depth;
  }

  private draw(): void {
    const context = this.context;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const ground = context.createLinearGradient(0, 0, 0, this.height);
    ground.addColorStop(0, "#4aa64a");
    ground.addColorStop(1, "#256f2c");
    context.fillStyle = ground;
    context.fillRect(0, 0, this.width, this.height);
    this.drawRoad();
    this.drawGates();
    this.drawCar();
  }

  private drawRoad(): void {
    const context = this.context;
    const topY = this.horizonY();
    const bottomY = this.height;
    const topWidth = this.roadTopWidth();
    const bottomWidth = this.roadBottomWidth() * 1.08;
    context.fillStyle = "#3a3f47";
    context.beginPath();
    context.moveTo((this.width - topWidth) / 2, topY);
    context.lineTo((this.width - bottomWidth) / 2, bottomY);
    context.lineTo((this.width + bottomWidth) / 2, bottomY);
    context.lineTo((this.width + topWidth) / 2, topY);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(248,250,252,.95)";
    context.lineWidth = Math.max(2, this.roadBottomWidth() * 0.008);
    context.beginPath();
    context.moveTo((this.width - topWidth) / 2, topY);
    context.lineTo((this.width - bottomWidth) / 2, bottomY);
    context.moveTo((this.width + topWidth) / 2, topY);
    context.lineTo((this.width + bottomWidth) / 2, bottomY);
    context.stroke();

    context.strokeStyle = "rgba(255,255,255,.76)";
    for (let lane = 1; lane < this.state.lanes; lane += 1) {
      for (let z = -18 - this.state.roadScroll; z < SPAWN_Z; z += 9) {
        const farZ = z + 4.5;
        if (farZ > SPAWN_Z) continue;
        context.lineWidth = Math.max(1, this.roadWidthAt(z) / this.state.lanes * 0.025);
        context.beginPath();
        context.moveTo(this.laneX(lane - 0.5, this.state.lanes, farZ), this.yAt(farZ));
        context.lineTo(this.laneX(lane - 0.5, this.state.lanes, z), this.yAt(z));
        context.stroke();
      }
    }
  }

  private drawGates(): void {
    const context = this.context;
    for (const gate of this.state.gates) {
      const y = this.yAt(gate.z);
      if (y < -50 || y > this.height + 50) continue;
      for (let lane = 0; lane < gate.lanes; lane += 1) {
        const isOdd = lane === gate.oddLane;
        const word = isOdd ? gate.odd : gate.common;
        const metrics = isOdd ? gate.oddMetrics : gate.commonMetrics;
        const projectedX = this.laneX(lane, gate.lanes, gate.z);
        const minimumX = this.roadLeftAt(gate.z) + metrics.width / 2;
        const maximumX = this.roadLeftAt(gate.z) + this.roadWidthAt(gate.z) - metrics.width / 2;
        const x = clamp(projectedX, minimumX, maximumX);
        const correctFlash = gate.judged && gate.flash > 0 && isOdd;
        const wrongFlash = gate.judged && gate.flash > 0 && !isOdd;
        context.fillStyle = correctFlash
          ? "rgba(34,197,94,.92)"
          : wrongFlash
            ? "rgba(239,68,68,.76)"
            : "rgba(255,255,255,.96)";
        context.strokeStyle = correctFlash ? "#15803d" : wrongFlash ? "#991b1b" : "rgba(15,23,42,.58)";
        context.lineWidth = metrics.lineWidth;
        context.beginPath();
        context.roundRect(
          x - metrics.width / 2,
          y - metrics.height / 2,
          metrics.width,
          metrics.height,
          metrics.radius,
        );
        context.fill();
        context.stroke();
        context.fillStyle = "#0f172a";
        context.font = `800 ${metrics.fontSize}px system-ui, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(word, x, y);
      }
    }
  }

  private drawCar(): void {
    const context = this.context;
    const car = getCar(this.state.carId);
    const width = Math.min(this.laneWidthAt() * 0.68, this.height * 0.105);
    const height = width * (car.id === "minivan" ? 1.7 : car.id === "taksi" || car.id === "polis" ? 1.62 : 1.48);
    const x = this.laneX(this.state.playerLane);
    const y = this.carY();
    const steering = clamp((this.state.targetLane - this.state.playerLane) * -0.18, -0.15, 0.15);
    context.save();
    context.translate(x, y);
    context.rotate(steering);
    context.fillStyle = "rgba(0,0,0,.24)";
    context.beginPath();
    context.ellipse(width * 0.08, height * 0.05, width * 0.54, height * 0.48, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#111827";
    context.fillRect(-width * 0.57, -height * 0.26, width * 0.16, height * 0.22);
    context.fillRect(width * 0.41, -height * 0.26, width * 0.16, height * 0.22);
    context.fillRect(-width * 0.57, height * 0.2, width * 0.16, height * 0.22);
    context.fillRect(width * 0.41, height * 0.2, width * 0.16, height * 0.22);

    const bodyGradient = context.createLinearGradient(0, -height / 2, 0, height / 2);
    bodyGradient.addColorStop(0, car.roof);
    bodyGradient.addColorStop(0.45, car.color);
    bodyGradient.addColorStop(1, car.color);
    context.fillStyle = bodyGradient;
    context.beginPath();
    context.moveTo(-width * 0.34, -height * 0.5);
    context.quadraticCurveTo(-width * 0.48, -height * 0.36, -width * 0.5, height * 0.27);
    context.quadraticCurveTo(-width * 0.48, height * 0.5, -width * 0.34, height * 0.52);
    context.lineTo(width * 0.34, height * 0.52);
    context.quadraticCurveTo(width * 0.48, height * 0.5, width * 0.5, height * 0.27);
    context.quadraticCurveTo(width * 0.48, -height * 0.36, width * 0.34, -height * 0.5);
    context.closePath();
    context.fill();

    context.fillStyle = "#1e3a5f";
    context.beginPath();
    context.moveTo(-width * 0.27, -height * 0.24);
    context.quadraticCurveTo(0, -height * 0.36, width * 0.27, -height * 0.24);
    context.lineTo(width * 0.32, height * 0.05);
    context.quadraticCurveTo(0, height * 0.12, -width * 0.32, height * 0.05);
    context.closePath();
    context.fill();

    context.fillStyle = "#ef4444";
    context.fillRect(-width * 0.36, height * 0.34, width * 0.22, height * 0.055);
    context.fillRect(width * 0.14, height * 0.34, width * 0.22, height * 0.055);
    context.fillStyle = "#1f2937";
    context.fillRect(-width * 0.34, height * 0.45, width * 0.68, height * 0.055);

    if (car.id === "taksi") {
      context.fillStyle = "#fef3c7";
      context.fillRect(-width * 0.16, -height * 0.38, width * 0.32, height * 0.08);
    } else if (car.id === "polis") {
      context.fillStyle = "#ef4444";
      context.fillRect(-width * 0.23, -height * 0.11, width * 0.22, height * 0.07);
      context.fillStyle = "#3b82f6";
      context.fillRect(width * 0.01, -height * 0.11, width * 0.22, height * 0.07);
    } else if (car.id === "spor" || car.id === "viper") {
      context.fillStyle = "#111827";
      context.fillRect(-width * 0.38, height * 0.42, width * 0.76, height * 0.045);
    }
    context.restore();
  }
}
