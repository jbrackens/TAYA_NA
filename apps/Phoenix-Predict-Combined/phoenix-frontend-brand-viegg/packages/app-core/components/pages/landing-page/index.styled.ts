import styled, { keyframes } from "styled-components";

const floatToken = keyframes`
  0% { transform: translateY(0px) scale(1); opacity: 0.22; }
  50% { transform: translateY(-18px) scale(1.06); opacity: 0.48; }
  100% { transform: translateY(0px) scale(1); opacity: 0.22; }
`;

const pulseAura = keyframes`
  0% { transform: scale(1); opacity: 0.36; }
  50% { transform: scale(1.16); opacity: 0.62; }
  100% { transform: scale(1); opacity: 0.36; }
`;

const spinSlow = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const bobMascot = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-22px); }
  100% { transform: translateY(0px); }
`;

const floatCardA = keyframes`
  0% { transform: translateY(0px) rotate(0deg) scale(1); }
  50% { transform: translateY(-16px) rotate(6deg) scale(1.08); }
  100% { transform: translateY(0px) rotate(0deg) scale(1); }
`;

const floatCardB = keyframes`
  0% { transform: translateY(0px) rotate(0deg) scale(1); }
  50% { transform: translateY(18px) rotate(-7deg) scale(1.08); }
  100% { transform: translateY(0px) rotate(0deg) scale(1); }
`;

const sparkle = keyframes`
  0% { transform: scale(0); opacity: 0; }
  45% { transform: scale(1.2); opacity: 0.95; }
  100% { transform: scale(0); opacity: 0; }
`;

export const LandingPageContainer = styled.div`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #020617 0%, #0b1223 45%, #030712 100%);
  color: #f8fafc;
`;

export const HeroBackground = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(circle at 20% 25%, rgba(37, 99, 235, 0.28) 0%, rgba(37, 99, 235, 0) 42%),
    radial-gradient(circle at 80% 70%, rgba(132, 204, 22, 0.26) 0%, rgba(132, 204, 22, 0) 45%),
    radial-gradient(circle at 58% 36%, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0) 38%);
`;

export const GlowOrb = styled.div<{
  $top: string;
  $left: string;
  $size: string;
  $color: string;
  $delay: number;
}>`
  position: absolute;
  top: ${(props) => props.$top};
  left: ${(props) => props.$left};
  width: ${(props) => props.$size};
  height: ${(props) => props.$size};
  border-radius: 999px;
  background: ${(props) => props.$color};
  filter: blur(48px);
  opacity: 0.3;
  animation: ${pulseAura} 7s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;
  pointer-events: none;
`;

export const TopBar = styled.header`
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 22px 34px 10px;

  @media (max-width: 900px) {
    padding: 16px 18px 6px;
  }
`;

export const Brand = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 12px;
`;

export const BrandWordmark = styled.span`
  font-size: clamp(1.05rem, 2.7vw, 1.5rem);
  font-weight: 900;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #ccff00 0%, #00ff88 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

export const BrandText = styled.span`
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.96);

  @media (max-width: 640px) {
    font-size: 10px;
    letter-spacing: 0.08em;
  }
`;

export const FloatingLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
`;

type FloatingTokenProps = {
  $top: string;
  $left: string;
  $delay: number;
  $color: string;
};

export const FloatingToken = styled.span<FloatingTokenProps>`
  position: absolute;
  top: ${(props) => props.$top};
  left: ${(props) => props.$left};
  color: ${(props) => props.$color};
  font-size: clamp(13px, 1.5vw, 26px);
  font-weight: 900;
  line-height: 1;
  opacity: 0.25;
  animation: ${floatToken} 7s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;

  @media (max-width: 980px) {
    display: none;
  }
`;

export const PageShell = styled.div`
  position: relative;
  z-index: 2;
  width: min(1260px, 100%);
  margin: 0 auto;
  padding: 20px 32px 54px;

  @media (max-width: 980px) {
    padding: 12px 18px 38px;
  }
`;

export const HeroGrid = styled.main`
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 30px;
  align-items: center;
  min-height: 68vh;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
    gap: 18px;
  }
`;

export const ContentColumn = styled.section`
  max-width: 690px;
`;

export const LaunchPill = styled.span`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 2px solid rgba(248, 113, 113, 0.35);
  background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
  box-shadow: 0 12px 34px rgba(248, 113, 113, 0.3);
  color: #ffffff;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  padding: 10px 16px;
  margin-bottom: 22px;
`;

export const HeroTitle = styled.h1`
  margin: 0 0 12px;
  line-height: 0.9;
  font-size: clamp(2.7rem, 9vw, 6.7rem);
  letter-spacing: -0.03em;
  font-weight: 900;
  text-transform: uppercase;
  color: #ffffff;
`;

export const GradientTitle = styled.span`
  background: linear-gradient(90deg, #60a5fa 0%, #22d3ee 50%, #84cc16 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

export const HypeLine = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: clamp(1.15rem, 2.8vw, 1.9rem);
  font-weight: 900;
  text-transform: uppercase;
  background: linear-gradient(90deg, #a3e635 0%, #22c55e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

export const HeroSubtitle = styled.p`
  margin: 0 0 26px;
  max-width: 760px;
  color: rgba(241, 245, 249, 0.92);
  font-size: clamp(1.04rem, 2.4vw, 1.6rem);
  line-height: 1.48;
  font-weight: 700;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

export const PrimaryAction = styled.button`
  border: 2px solid rgba(34, 211, 238, 0.4);
  background: linear-gradient(120deg, #2563eb 0%, #06b6d4 50%, #2563eb 100%);
  color: #fff;
  border-radius: 14px;
  padding: 15px 24px;
  font-size: clamp(0.94rem, 2.1vw, 1.17rem);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  box-shadow: 0 16px 38px rgba(14, 165, 233, 0.36);
  cursor: pointer;
  transition: transform 0.14s ease, filter 0.14s ease;

  &:hover {
    transform: translateY(-2px) scale(1.03);
    filter: brightness(1.06);
  }
`;

export const SecondaryAction = styled.button`
  border: 2px solid rgba(163, 230, 53, 0.42);
  background: linear-gradient(125deg, #84cc16 0%, #16a34a 100%);
  color: #fff;
  border-radius: 14px;
  padding: 15px 24px;
  font-size: clamp(0.94rem, 2.1vw, 1.17rem);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  box-shadow: 0 16px 38px rgba(132, 204, 22, 0.33);
  cursor: pointer;
  transition: transform 0.14s ease, filter 0.14s ease;

  &:hover {
    transform: translateY(-2px) scale(1.03);
    filter: brightness(1.05);
  }
`;

export const MascotColumn = styled.section`
  position: relative;
  min-height: 560px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 1050px) {
    min-height: 430px;
    margin-top: 16px;
  }
`;

export const MascotAura = styled.div`
  position: absolute;
  width: min(540px, 94%);
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.45) 0%, rgba(132, 204, 22, 0.42) 50%, rgba(34, 211, 238, 0.45) 100%);
  filter: blur(48px);
  animation: ${pulseAura} 5.5s ease-in-out infinite;
`;

export const RotatingFrame = styled.div`
  position: absolute;
  width: min(590px, 98%);
  aspect-ratio: 1 / 1;
  border-radius: 30px;
  background: conic-gradient(from 90deg, rgba(37, 99, 235, 0.25), rgba(132, 204, 22, 0.25), rgba(34, 211, 238, 0.25), rgba(37, 99, 235, 0.25));
  filter: blur(20px);
  animation: ${spinSlow} 15s linear infinite;
`;

export const MascotImage = styled.img`
  position: relative;
  z-index: 2;
  width: min(560px, 94%);
  height: auto;
  filter: contrast(1.12) saturate(1.24) brightness(1.07);
  animation: ${bobMascot} 2.7s ease-in-out infinite;
`;

export const FloatingStatCard = styled.div<{
  $top?: string;
  $bottom?: string;
  $left?: string;
  $right?: string;
  $gradient: string;
  $border: string;
  $animation: "a" | "b";
}>`
  position: absolute;
  z-index: 4;
  top: ${(props) => props.$top || "auto"};
  bottom: ${(props) => props.$bottom || "auto"};
  left: ${(props) => props.$left || "auto"};
  right: ${(props) => props.$right || "auto"};
  padding: 14px 16px;
  border-radius: 16px;
  background: ${(props) => props.$gradient};
  border: 3px solid ${(props) => props.$border};
  box-shadow: 0 14px 30px rgba(2, 6, 23, 0.5);
  min-width: 126px;
  text-align: center;
  animation: ${(props) => (props.$animation === "a" ? floatCardA : floatCardB)} 2.4s ease-in-out infinite;

  @media (max-width: 1050px) {
    transform: scale(0.86);
  }
`;

export const StatValue = styled.div`
  font-size: 1.65rem;
  font-weight: 900;
  line-height: 1;
  color: #ffffff;
`;

export const StatLabel = styled.div`
  margin-top: 4px;
  font-size: 0.76rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.94);
  letter-spacing: 0.03em;
  text-transform: uppercase;
`;

export const Sparkle = styled.span<{
  $top: string;
  $left: string;
  $delay: number;
  $color: string;
}>`
  position: absolute;
  top: ${(props) => props.$top};
  left: ${(props) => props.$left};
  z-index: 5;
  font-size: 22px;
  line-height: 1;
  color: ${(props) => props.$color};
  animation: ${sparkle} 2s ease-in-out infinite;
  animation-delay: ${(props) => props.$delay}s;
`;

export const FeatureSection = styled.section`
  margin-top: 36px;
`;

export const FeatureHeader = styled.div`
  text-align: center;
  margin: 0 auto 28px;
`;

export const FeatureHeading = styled.h2`
  margin: 0 0 10px;
  font-size: clamp(2rem, 5.4vw, 4.1rem);
  line-height: 0.96;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  color: #ffffff;
`;

export const FeatureSubheading = styled.p`
  margin: 0;
  color: rgba(226, 232, 240, 0.84);
  font-size: clamp(1rem, 2.5vw, 1.45rem);
  font-weight: 800;
`;

export const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const FeatureCard = styled.article`
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  padding: 20px;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }
`;

export const FeatureIconWrap = styled.div<{ $gradient: string }>`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  background: ${(props) => props.$gradient};
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.48);
`;

export const FeatureIcon = styled.span`
  font-size: 26px;
  line-height: 1;
`;

export const FeatureTitle = styled.h3`
  margin: 0 0 8px;
  color: #ffffff;
  font-size: 1.35rem;
  line-height: 1.12;
  text-transform: uppercase;
  letter-spacing: -0.01em;
`;

export const FeatureText = styled.p`
  margin: 0;
  color: rgba(226, 232, 240, 0.88);
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 600;
`;

export const BottomFade = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 130px;
  background: linear-gradient(180deg, rgba(2, 6, 23, 0) 0%, rgba(2, 6, 23, 1) 100%);
  pointer-events: none;
`;
