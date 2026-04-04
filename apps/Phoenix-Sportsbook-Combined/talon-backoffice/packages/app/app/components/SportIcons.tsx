"use client";

import React from "react";
import {
  CircleDot,
  Dribbble,
  Trophy,
  Swords,
  Target,
  Bike,
  Flag,
  Waves,
  Gamepad2,
  Crosshair,
  Volleyball,
  Activity,
  Gauge,
  Disc3,
  Dumbbell,
  Flame,
  Sailboat,
  Grip,
  Footprints,
  Timer,
  Shield,
  Zap,
  type LucideProps,
} from "lucide-react";

const ICON_SIZE = 18;
const STROKE_WIDTH = 2;

const defaultProps: LucideProps = {
  size: ICON_SIZE,
  strokeWidth: STROKE_WIDTH,
  style: { flexShrink: 0 },
};

/** Map sport keys to Lucide icons */
const icons: Record<string, React.FC> = {
  soccer: () => <CircleDot {...defaultProps} />,
  football: () => <Dribbble {...defaultProps} />,
  "american-football": () => <Dribbble {...defaultProps} />,
  basketball: () => <Dribbble {...defaultProps} />,
  tennis: () => <Disc3 {...defaultProps} />,
  baseball: () => <Target {...defaultProps} />,
  "ice-hockey": () => <Gauge {...defaultProps} />,
  hockey: () => <Gauge {...defaultProps} />,
  volleyball: () => <Volleyball {...defaultProps} />,
  handball: () => <Activity {...defaultProps} />,
  "table-tennis": () => <Zap {...defaultProps} />,
  cricket: () => <Trophy {...defaultProps} />,
  rugby: () => <Shield {...defaultProps} />,
  "rugby-league": () => <Shield {...defaultProps} />,
  "rugby-union": () => <Shield {...defaultProps} />,
  golf: () => <Flag {...defaultProps} />,
  boxing: () => <Swords {...defaultProps} />,
  mma: () => <Swords {...defaultProps} />,
  darts: () => <Target {...defaultProps} />,
  snooker: () => <Target {...defaultProps} />,
  pool: () => <Target {...defaultProps} />,
  cycling: () => <Bike {...defaultProps} />,
  racing: () => <Gauge {...defaultProps} />,
  "auto-racing": () => <Gauge {...defaultProps} />,
  "formula-1": () => <Gauge {...defaultProps} />,
  nascar: () => <Gauge {...defaultProps} />,
  motorbike: () => <Gauge {...defaultProps} />,
  swimming: () => <Waves {...defaultProps} />,
  "water-polo": () => <Waves {...defaultProps} />,
  sailing: () => <Sailboat {...defaultProps} />,
  esports: () => <Gamepad2 {...defaultProps} />,
  cs2: () => <Crosshair {...defaultProps} />,
  "counter-strike-2": () => <Crosshair {...defaultProps} />,
  dota2: () => <Gamepad2 {...defaultProps} />,
  "dota-2": () => <Gamepad2 {...defaultProps} />,
  lol: () => <Gamepad2 {...defaultProps} />,
  "league-of-legends": () => <Gamepad2 {...defaultProps} />,
  valorant: () => <Crosshair {...defaultProps} />,
  badminton: () => <Zap {...defaultProps} />,
  biathlon: () => <Crosshair {...defaultProps} />,
  bowling: () => <Grip {...defaultProps} />,
  chess: () => <Grip {...defaultProps} />,
  curling: () => <Target {...defaultProps} />,
  equestrian: () => <Footprints {...defaultProps} />,
  floorball: () => <Activity {...defaultProps} />,
  futsal: () => <CircleDot {...defaultProps} />,
  hurling: () => <Activity {...defaultProps} />,
  lacrosse: () => <Activity {...defaultProps} />,
  netball: () => <Activity {...defaultProps} />,
  speedway: () => <Gauge {...defaultProps} />,
  "cross-country-skiing": () => <Timer {...defaultProps} />,
  softball: () => <Target {...defaultProps} />,
  "special-bets": () => <Flame {...defaultProps} />,
  eurovision: () => <Flame {...defaultProps} />,
  "field-hockey": () => <Activity {...defaultProps} />,
  "the-penalty-kicks": () => <CircleDot {...defaultProps} />,
  "virtual-cycling": () => <Bike {...defaultProps} />,
  "virtual-drag-racing": () => <Gauge {...defaultProps} />,
  "virtual-football-league": () => <CircleDot {...defaultProps} />,
  "virtual-football-pro": () => <CircleDot {...defaultProps} />,
  "virtual-greyhounds": () => <Footprints {...defaultProps} />,
  "virtual-horse-racing": () => <Footprints {...defaultProps} />,
  "virtual-marble-racing": () => <Gauge {...defaultProps} />,
};

export function SportIcon({ sportKey }: { sportKey: string }) {
  const key = sportKey.toLowerCase().replace(/\s+/g, "-");
  const Icon = icons[key];
  if (Icon) return <Icon />;
  return <Dumbbell {...defaultProps} />;
}

export default SportIcon;
