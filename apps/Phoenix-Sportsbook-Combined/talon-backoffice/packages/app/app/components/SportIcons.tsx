"use client";

import React from "react";

const ICON_SIZE = 18;

/**
 * Custom sport SVG paths — real sport-specific artwork instead of generic Lucide icons.
 * Each sport gets a visually recognizable ball/symbol at 24x24 viewBox.
 */
const sportSvgPaths: Record<string, { d: string; fill?: string; stroke?: boolean }[]> = {
  /* Soccer — ball with pentagon panels */
  soccer: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M12 2l-1.5 5.5L7 5.5M12 2l1.5 5.5L17 5.5M7 5.5L3.5 10l3.5 2M17 5.5l3.5 4.5-3.5 2M7 12l-1 5.5L10.5 19M17 12l1 5.5-4.5 1.5M10.5 19h3M12 7.5L7 12l3.5 7h3L17 12Z", stroke: true },
  ],
  futsal: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M12 2l-1.5 5.5L7 5.5M12 2l1.5 5.5L17 5.5M7 5.5L3.5 10l3.5 2M17 5.5l3.5 4.5-3.5 2M7 12l-1 5.5L10.5 19M17 12l1 5.5-4.5 1.5M10.5 19h3M12 7.5L7 12l3.5 7h3L17 12Z", stroke: true },
  ],
  /* American Football — elongated ball with laces */
  football: [
    { d: "M6.5 3.5C9 2 15 2 17.5 3.5 20 5 22 9 22 12s-2 7-4.5 8.5C15 22 9 22 6.5 20.5 4 19 2 15 2 12s2-7 4.5-8.5Z", stroke: true },
    { d: "M9 12h6M12 8v8M10 9.5l4 5M10 14.5l4-5", stroke: true },
  ],
  "american-football": [
    { d: "M6.5 3.5C9 2 15 2 17.5 3.5 20 5 22 9 22 12s-2 7-4.5 8.5C15 22 9 22 6.5 20.5 4 19 2 15 2 12s2-7 4.5-8.5Z", stroke: true },
    { d: "M9 12h6M12 8v8M10 9.5l4 5M10 14.5l4-5", stroke: true },
  ],
  /* Basketball — ball with seam lines */
  basketball: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M2 12h20M12 2v20", stroke: true },
    { d: "M5.2 5.2c3.9 1.8 5.8 5.8 5.8 5.8M18.8 5.2c-3.9 1.8-5.8 5.8-5.8 5.8M5.2 18.8c3.9-1.8 5.8-5.8 5.8-5.8M18.8 18.8c-3.9-1.8-5.8-5.8-5.8-5.8", stroke: true },
  ],
  /* Tennis — ball with curved seam */
  tennis: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M18.5 5.5C16 8 16 12 18.5 18.5M5.5 5.5C8 8 8 12 5.5 18.5", stroke: true },
  ],
  /* Baseball — ball with red stitching */
  baseball: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M7 4c1 3 1 6 0 9M8 4.5l-.5 1M8 7l-.5 1M8 9.5l-.5 1M8 12l-.5 1M17 4c-1 3-1 6 0 9M16 4.5l.5 1M16 7l.5 1M16 9.5l.5 1M16 12l.5 1", stroke: true },
  ],
  /* Ice Hockey — puck/stick */
  "ice-hockey": [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M5 17L12 6l7 11", stroke: true },
    { d: "M9 12h6", stroke: true },
    { d: "M8 15h8", stroke: true },
  ],
  hockey: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M5 17L12 6l7 11", stroke: true },
    { d: "M9 12h6", stroke: true },
    { d: "M8 15h8", stroke: true },
  ],
  /* Volleyball */
  volleyball: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M12 2C8 6 8 12 12 16s4 2 6 6M12 2c4 4 4 10 0 14s-4 2-6 6M2 12h20", stroke: true },
  ],
  /* Handball */
  handball: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M7 5l10 14M5 10h14", stroke: true },
  ],
  /* Table Tennis — paddle and ball */
  "table-tennis": [
    { d: "M14 3a6 6 0 0 1 0 12l-4 5-3-3 5-4A6 6 0 0 1 14 3Z", stroke: true },
    { d: "M6 18l-2 2", stroke: true },
    { d: "M18 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", stroke: true },
  ],
  /* Cricket — bat and ball */
  cricket: [
    { d: "M15 3l6 6-8 8-6-6ZM7 17l-4 4", stroke: true },
    { d: "M4.5 7.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", stroke: true },
  ],
  /* Rugby — oval ball with seam */
  rugby: [
    { d: "M5 5c4-4 10-4 14 0s4 10 0 14-10 4-14 0-4-10 0-14Z", stroke: true },
    { d: "M9 12h6M12 8v8", stroke: true },
  ],
  "rugby-league": [
    { d: "M5 5c4-4 10-4 14 0s4 10 0 14-10 4-14 0-4-10 0-14Z", stroke: true },
    { d: "M9 12h6M12 8v8", stroke: true },
  ],
  "rugby-union": [
    { d: "M5 5c4-4 10-4 14 0s4 10 0 14-10 4-14 0-4-10 0-14Z", stroke: true },
    { d: "M9 12h6M12 8v8", stroke: true },
  ],
  /* Golf — flag on green */
  golf: [
    { d: "M12 3v18", stroke: true },
    { d: "M12 3l7 4-7 4Z", stroke: true },
    { d: "M5 21c0-2 3-4 7-4s7 2 7 4", stroke: true },
  ],
  /* Boxing — glove */
  boxing: [
    { d: "M9 3c-2 0-4 2-4 4v4c0 3 2 6 5 7l2 1v2h6v-2l1-1c2-2 3-4 3-6V8c0-3-2-5-5-5H9Z", stroke: true },
    { d: "M9 8h6", stroke: true },
  ],
  /* MMA — fighting */
  mma: [
    { d: "M9 3c-2 0-4 2-4 4v4c0 3 2 6 5 7l2 1v2h6v-2l1-1c2-2 3-4 3-6V8c0-3-2-5-5-5H9Z", stroke: true },
    { d: "M9 8h6", stroke: true },
  ],
  /* Darts — dartboard */
  darts: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z", stroke: true },
    { d: "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", stroke: true },
    { d: "M20 4l-6 6", stroke: true },
  ],
  /* Snooker/Pool — cue ball */
  snooker: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", stroke: true },
  ],
  pool: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", stroke: true },
  ],
  /* Cycling */
  cycling: [
    { d: "M5.5 17a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM18.5 17a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z", stroke: true },
    { d: "M14 6l-4 6.5h5l-2 4.5M8 12.5l-2.5 0", stroke: true },
  ],
  /* Racing — checkered flag */
  racing: [
    { d: "M4 3v18", stroke: true },
    { d: "M4 3h16v10H4Z", stroke: true },
    { d: "M4 3h4v5H4ZM12 3h4v5h-4ZM8 8h4v5H8ZM16 8h4v5h-4Z", fill: "currentColor" },
  ],
  "auto-racing": [
    { d: "M4 3v18", stroke: true },
    { d: "M4 3h16v10H4Z", stroke: true },
    { d: "M4 3h4v5H4ZM12 3h4v5h-4ZM8 8h4v5H8ZM16 8h4v5h-4Z", fill: "currentColor" },
  ],
  "formula-1": [
    { d: "M4 3v18", stroke: true },
    { d: "M4 3h16v10H4Z", stroke: true },
    { d: "M4 3h4v5H4ZM12 3h4v5h-4ZM8 8h4v5H8ZM16 8h4v5h-4Z", fill: "currentColor" },
  ],
  nascar: [
    { d: "M4 3v18", stroke: true },
    { d: "M4 3h16v10H4Z", stroke: true },
    { d: "M4 3h4v5H4ZM12 3h4v5h-4ZM8 8h4v5H8ZM16 8h4v5h-4Z", fill: "currentColor" },
  ],
  motorbike: [
    { d: "M4 3v18", stroke: true },
    { d: "M4 3h16v10H4Z", stroke: true },
    { d: "M4 3h4v5H4ZM12 3h4v5h-4ZM8 8h4v5H8ZM16 8h4v5h-4Z", fill: "currentColor" },
  ],
  /* Swimming — waves */
  swimming: [
    { d: "M2 8c2-1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 5 0", stroke: true },
    { d: "M2 12c2-1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 5 0", stroke: true },
    { d: "M2 16c2-1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 5 0", stroke: true },
  ],
  "water-polo": [
    { d: "M2 8c2-1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 5 0", stroke: true },
    { d: "M2 12c2-1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 5 0", stroke: true },
    { d: "M2 16c2-1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 5 0", stroke: true },
  ],
  /* Sailing — sailboat */
  sailing: [
    { d: "M2 20l10-16v16ZM12 4l8 16H12Z", stroke: true },
    { d: "M2 20h20", stroke: true },
  ],
  /* Esports — controller */
  esports: [
    { d: "M6 11h4M8 9v4", stroke: true },
    { d: "M15 12h.01M18 10h.01", stroke: true },
    { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5Z", stroke: true },
  ],
  cs2: [
    { d: "M6 11h4M8 9v4", stroke: true },
    { d: "M15 12h.01M18 10h.01", stroke: true },
    { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5Z", stroke: true },
  ],
  "counter-strike-2": [
    { d: "M6 11h4M8 9v4", stroke: true },
    { d: "M15 12h.01M18 10h.01", stroke: true },
    { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5Z", stroke: true },
  ],
  dota2: [
    { d: "M6 11h4M8 9v4", stroke: true },
    { d: "M15 12h.01M18 10h.01", stroke: true },
    { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5Z", stroke: true },
  ],
  "dota-2": [
    { d: "M6 11h4M8 9v4", stroke: true },
    { d: "M15 12h.01M18 10h.01", stroke: true },
    { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5Z", stroke: true },
  ],
  lol: [
    { d: "M6 11h4M8 9v4", stroke: true },
    { d: "M15 12h.01M18 10h.01", stroke: true },
    { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5Z", stroke: true },
  ],
  "league-of-legends": [
    { d: "M6 11h4M8 9v4", stroke: true },
    { d: "M15 12h.01M18 10h.01", stroke: true },
    { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5Z", stroke: true },
  ],
  valorant: [
    { d: "M6 11h4M8 9v4", stroke: true },
    { d: "M15 12h.01M18 10h.01", stroke: true },
    { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5Z", stroke: true },
  ],
  /* Badminton — shuttlecock */
  badminton: [
    { d: "M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", stroke: true },
    { d: "M8 14l-3 7M16 14l3 7M10 14l-1 7M14 14l1 7M12 14v7", stroke: true },
  ],
  /* Biathlon */
  biathlon: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z", stroke: true },
    { d: "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", stroke: true },
  ],
  /* Bowling */
  bowling: [
    { d: "M12 2a3 3 0 0 0-3 3c0 1 .5 2 1 3l-1 12c0 1 1.5 2 3 2s3-1 3-2l-1-12c.5-1 1-2 1-3a3 3 0 0 0-3-3Z", stroke: true },
    { d: "M11 5h.01M13 4h.01M12 7h.01", stroke: true },
  ],
  /* Chess — king piece */
  chess: [
    { d: "M12 2v3M10 5h4M9 5l-1 14h8l-1-14", stroke: true },
    { d: "M6 19h12M7 21h10", stroke: true },
  ],
  /* Curling — stone */
  curling: [
    { d: "M8 12h8M8 12a4 4 0 0 1 8 0M8 12a4 4 0 0 0 8 0", stroke: true },
    { d: "M10 8h4v4h-4Z", stroke: true },
    { d: "M12 4v4", stroke: true },
  ],
  /* Equestrian — horse head */
  equestrian: [
    { d: "M8 20l-2-6 4-4-2-4c2-3 5-4 8-3l1 5-3 3-1 5", stroke: true },
    { d: "M14 6l2-2", stroke: true },
    { d: "M14 8h.01", stroke: true },
  ],
  /* Field sports (floorball, hurling, lacrosse, netball, field-hockey) — stick and ball */
  floorball: [
    { d: "M14 3l-8 8 3 3 8-8Z", stroke: true },
    { d: "M6 11l-2 8 8-2", stroke: true },
    { d: "M17 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", stroke: true },
  ],
  hurling: [
    { d: "M14 3l-8 8 3 3 8-8Z", stroke: true },
    { d: "M6 11l-2 8 8-2", stroke: true },
    { d: "M17 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", stroke: true },
  ],
  lacrosse: [
    { d: "M14 3l-8 8 3 3 8-8Z", stroke: true },
    { d: "M6 11l-2 8 8-2", stroke: true },
    { d: "M17 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", stroke: true },
  ],
  netball: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M2 12h20M12 2v20", stroke: true },
  ],
  "field-hockey": [
    { d: "M14 3l-8 8 3 3 8-8Z", stroke: true },
    { d: "M6 11l-2 8 8-2", stroke: true },
    { d: "M17 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", stroke: true },
  ],
  /* Speedway/racing variants — helmet */
  speedway: [
    { d: "M4 3v18", stroke: true },
    { d: "M4 3h16v10H4Z", stroke: true },
    { d: "M4 3h4v5H4ZM12 3h4v5h-4ZM8 8h4v5H8ZM16 8h4v5h-4Z", fill: "currentColor" },
  ],
  /* Cross-country skiing — skier */
  "cross-country-skiing": [
    { d: "M4 20L12 8l4 4-8 8", stroke: true },
    { d: "M16 12l4 8", stroke: true },
    { d: "M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z", stroke: true },
  ],
  /* Softball */
  softball: [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M7 4c1 3 1 6 0 9M17 4c-1 3-1 6 0 9", stroke: true },
  ],
  /* Special Bets / Eurovision — star/flame */
  "special-bets": [
    { d: "M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7Z", stroke: true },
  ],
  eurovision: [
    { d: "M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7Z", stroke: true },
  ],
  /* Virtual sports — monitor with play button */
  "virtual-cycling": [
    { d: "M3 4h18v12H3Z", stroke: true },
    { d: "M8 20h8M12 16v4", stroke: true },
    { d: "M10 9l4 2.5-4 2.5Z", stroke: true },
  ],
  "virtual-drag-racing": [
    { d: "M3 4h18v12H3Z", stroke: true },
    { d: "M8 20h8M12 16v4", stroke: true },
    { d: "M10 9l4 2.5-4 2.5Z", stroke: true },
  ],
  "virtual-football-league": [
    { d: "M3 4h18v12H3Z", stroke: true },
    { d: "M8 20h8M12 16v4", stroke: true },
    { d: "M10 9l4 2.5-4 2.5Z", stroke: true },
  ],
  "virtual-football-pro": [
    { d: "M3 4h18v12H3Z", stroke: true },
    { d: "M8 20h8M12 16v4", stroke: true },
    { d: "M10 9l4 2.5-4 2.5Z", stroke: true },
  ],
  "virtual-greyhounds": [
    { d: "M3 4h18v12H3Z", stroke: true },
    { d: "M8 20h8M12 16v4", stroke: true },
    { d: "M10 9l4 2.5-4 2.5Z", stroke: true },
  ],
  "virtual-horse-racing": [
    { d: "M3 4h18v12H3Z", stroke: true },
    { d: "M8 20h8M12 16v4", stroke: true },
    { d: "M10 9l4 2.5-4 2.5Z", stroke: true },
  ],
  "virtual-marble-racing": [
    { d: "M3 4h18v12H3Z", stroke: true },
    { d: "M8 20h8M12 16v4", stroke: true },
    { d: "M10 9l4 2.5-4 2.5Z", stroke: true },
  ],
  /* Penalty Kicks */
  "the-penalty-kicks": [
    { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", stroke: true },
    { d: "M12 2l-1.5 5.5L7 5.5M12 2l1.5 5.5L17 5.5M7 5.5L3.5 10l3.5 2M17 5.5l3.5 4.5-3.5 2M7 12l-1 5.5L10.5 19M17 12l1 5.5-4.5 1.5M10.5 19h3M12 7.5L7 12l3.5 7h3L17 12Z", stroke: true },
  ],
};

/** Fallback — generic sport icon (dumbbell-like shape) */
const fallbackPaths = [
  { d: "M6.5 6.5a3.5 3.5 0 1 0 0 7M17.5 6.5a3.5 3.5 0 1 1 0 7M6.5 10h11", stroke: true },
];

function SportSvg({ paths, size = ICON_SIZE }: { paths: typeof fallbackPaths; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {paths.map((p, i) => {
        if (p.fill) {
          return <path key={i} d={p.d} fill={p.fill} stroke="none" />;
        }
        return <path key={i} d={p.d} />;
      })}
    </svg>
  );
}

export function SportIcon({ sportKey, size }: { sportKey: string; size?: number }) {
  const key = sportKey.toLowerCase().replace(/\s+/g, "-");
  const paths = sportSvgPaths[key] || fallbackPaths;
  return <SportSvg paths={paths} size={size} />;
}

export default SportIcon;
