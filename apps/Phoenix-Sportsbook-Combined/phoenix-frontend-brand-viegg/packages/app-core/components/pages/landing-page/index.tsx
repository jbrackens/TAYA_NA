import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { defaultNamespaces } from "../defaults";
import { LoginComponent } from "./../../auth/login";
import { RegisterComponent } from "./../../auth/register";
import { ForgotPasswordComponent } from "../../auth/forgot-reset-password/forgot-password";
import { ResetPasswordComponent } from "../../auth/forgot-reset-password/reset-password";
import { selectIsLoggedIn, showAuthModal } from "../../../lib/slices/authSlice";
import {
  ActionRow,
  BottomFade,
  Brand,
  BrandWordmark,
  BrandText,
  ContentColumn,
  FeatureCard,
  FeatureGrid,
  FeatureHeader,
  FeatureHeading,
  FeatureIcon,
  FeatureIconWrap,
  FeatureSection,
  FeatureSubheading,
  FeatureText,
  FeatureTitle,
  FloatingLayer,
  FloatingStatCard,
  FloatingToken,
  GlowOrb,
  GradientTitle,
  HeroBackground,
  HeroGrid,
  HeroSubtitle,
  HeroTitle,
  HypeLine,
  LandingPageContainer,
  LaunchPill,
  MascotAura,
  MascotColumn,
  MascotImage,
  PageShell,
  PrimaryAction,
  RotatingFrame,
  SecondaryAction,
  Sparkle,
  StatLabel,
  StatValue,
  TopBar,
} from "./index.styled";

type FloatingTokenConfig = {
  label: string;
  top: string;
  left: string;
  color: string;
  delay: number;
};

type FeatureConfig = {
  icon: string;
  title: string;
  description: string;
  gradient: string;
};

type SparkleConfig = {
  top: string;
  left: string;
  delay: number;
  color: string;
};

const floatingTokens: FloatingTokenConfig[] = [
  { label: "🏆", top: "8%", left: "8%", color: "#0ea5e9", delay: 0 },
  { label: "🏆", top: "13%", left: "22%", color: "#84cc16", delay: 0.7 },
  { label: "🏆", top: "11%", left: "75%", color: "#ef4444", delay: 1.1 },
  { label: "🏆", top: "26%", left: "67%", color: "#22d3ee", delay: 2.4 },
  { label: "🏆", top: "37%", left: "14%", color: "#facc15", delay: 3.2 },
  { label: "🏆", top: "56%", left: "82%", color: "#f97316", delay: 1.9 },
  { label: "🏆", top: "66%", left: "11%", color: "#38bdf8", delay: 0.5 },
  { label: "🏆", top: "73%", left: "24%", color: "#22c55e", delay: 2.8 },
  { label: "🏆", top: "80%", left: "72%", color: "#14b8a6", delay: 1.4 },
  { label: "🏆", top: "86%", left: "57%", color: "#ef4444", delay: 2.2 },
];

const features: FeatureConfig[] = [
  {
    icon: "👥",
    title: "Squad Betting",
    description:
      "Create private leagues with your friends. Track who's really got the hot hand.",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
  },
  {
    icon: "💬",
    title: "Live Chat",
    description:
      "Built-in group chat for every bet. Talk your shit in real-time.",
    gradient: "linear-gradient(135deg, #ef4444 0%, #ea580c 100%)",
  },
  {
    icon: "⚡",
    title: "Instant Parlays",
    description:
      "Build and share parlays in seconds. Copy your boy's winning picks.",
    gradient: "linear-gradient(135deg, #eab308 0%, #d97706 100%)",
  },
  {
    icon: "📈",
    title: "Social Feed",
    description:
      "See what the squad is betting. Ride the hot streaks together.",
    gradient: "linear-gradient(135deg, #84cc16 0%, #16a34a 100%)",
  },
  {
    icon: "🏆",
    title: "Weekly Challenges",
    description:
      "Compete in daily and weekly contests. Flex your picks, earn bragging rights.",
    gradient: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
  },
  {
    icon: "🛡️",
    title: "Safe & Secure",
    description:
      "Licensed and regulated. Your money and data are protected.",
    gradient: "linear-gradient(135deg, #475569 0%, #0f172a 100%)",
  },
];

const sparkles: SparkleConfig[] = [
  { top: "12%", left: "9%", delay: 0.1, color: "#fde047" },
  { top: "20%", left: "85%", delay: 0.4, color: "#a3e635" },
  { top: "34%", left: "8%", delay: 0.7, color: "#22d3ee" },
  { top: "42%", left: "88%", delay: 1.0, color: "#fde047" },
  { top: "58%", left: "6%", delay: 1.2, color: "#22d3ee" },
  { top: "62%", left: "91%", delay: 1.5, color: "#a3e635" },
  { top: "73%", left: "10%", delay: 1.8, color: "#fde047" },
  { top: "82%", left: "84%", delay: 2.1, color: "#22d3ee" },
];

function LandingPage() {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const router = useRouter();
  const dispatch = useDispatch();
  const domainName =
    typeof window !== "undefined" ? window.location.host : "localhost:3002";

  const openLoginModal = () => {
    dispatch(showAuthModal());
  };

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/sports/home");
    }
  }, [isLoggedIn, router]);

  return (
    <LandingPageContainer>
      <Head>
        <title>Attaboy Sportsbook</title>
        <link rel="canonical" href={`https://${domainName}`} />
      </Head>

      <HeroBackground />
      <GlowOrb
        $top="18%"
        $left="8%"
        $size="420px"
        $color="rgba(37, 99, 235, 0.8)"
        $delay={0}
      />
      <GlowOrb
        $top="58%"
        $left="66%"
        $size="460px"
        $color="rgba(132, 204, 22, 0.75)"
        $delay={1.1}
      />
      <GlowOrb
        $top="30%"
        $left="44%"
        $size="370px"
        $color="rgba(239, 68, 68, 0.72)"
        $delay={1.8}
      />

      <FloatingLayer>
        {floatingTokens.map((token) => (
          <FloatingToken
            key={`${token.label}-${token.top}-${token.left}`}
            $top={token.top}
            $left={token.left}
            $delay={token.delay}
            $color={token.color}
          >
            {token.label}
          </FloatingToken>
        ))}
      </FloatingLayer>

      <TopBar>
        <Brand>
          <BrandWordmark>ATTABOY</BrandWordmark>
        </Brand>
      </TopBar>

      <PageShell>
        <HeroGrid>
          <ContentColumn>
            <LaunchPill>Coming Soon 🔥</LaunchPill>
            <HeroTitle>
              <GradientTitle>BET WITH</GradientTitle>
              <br />
              THE BROS
            </HeroTitle>
            <HypeLine>🚀 LFG!!!</HypeLine>
            <HeroSubtitle>
              The social betting app where you compete with your friends, talk
              trash, and prove who actually knows sports.
            </HeroSubtitle>

            <ActionRow>
              <PrimaryAction onClick={openLoginModal}>
                Claim Offer 🎯
              </PrimaryAction>
              <SecondaryAction onClick={openLoginModal}>
                Let&apos;s Go! 🔥
              </SecondaryAction>
            </ActionRow>
          </ContentColumn>

          <MascotColumn>
            <MascotAura />
            <RotatingFrame />
            <MascotImage
              src="/images/attaboy-mascot.png"
              alt="Attaboy mascot"
            />

            <FloatingStatCard
              $top="13%"
              $right="-20px"
              $gradient="linear-gradient(135deg, #84cc16 0%, #16a34a 100%)"
              $border="rgba(190, 242, 100, 0.45)"
              $animation="a"
            >
              <StatValue>€500</StatValue>
              <StatLabel>💰 Pot</StatLabel>
            </FloatingStatCard>

            <FloatingStatCard
              $top="49%"
              $left="-24px"
              $gradient="linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)"
              $border="rgba(103, 232, 249, 0.42)"
              $animation="b"
            >
              <StatValue>+250%</StatValue>
              <StatLabel>🔥 Streak</StatLabel>
            </FloatingStatCard>

            <FloatingStatCard
              $bottom="16%"
              $right="8px"
              $gradient="linear-gradient(135deg, #ef4444 0%, #ea580c 100%)"
              $border="rgba(252, 165, 165, 0.45)"
              $animation="a"
            >
              <StatValue>W&apos;s</StatValue>
              <StatLabel>Only 🎯</StatLabel>
            </FloatingStatCard>

            {sparkles.map((sparkleItem) => (
              <Sparkle
                key={`${sparkleItem.top}-${sparkleItem.left}-${sparkleItem.delay}`}
                $top={sparkleItem.top}
                $left={sparkleItem.left}
                $delay={sparkleItem.delay}
                $color={sparkleItem.color}
              >
                🏆
              </Sparkle>
            ))}
          </MascotColumn>
        </HeroGrid>

        <FeatureSection>
          <FeatureHeader>
            <FeatureHeading>
              BUILT FOR <GradientTitle>THE 2 MAN</GradientTitle>
            </FeatureHeading>
            <FeatureSubheading>
              Everything you need to dominate together 💪
            </FeatureSubheading>
          </FeatureHeader>

          <FeatureGrid>
            {features.map((feature) => (
              <FeatureCard key={feature.title}>
                <FeatureIconWrap $gradient={feature.gradient}>
                  <FeatureIcon>{feature.icon}</FeatureIcon>
                </FeatureIconWrap>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureText>{feature.description}</FeatureText>
              </FeatureCard>
            ))}
          </FeatureGrid>
        </FeatureSection>
      </PageShell>

      <BottomFade />

      <LoginComponent />
      <RegisterComponent />
      <ForgotPasswordComponent />
      <ResetPasswordComponent />
    </LandingPageContainer>
  );
}

LandingPage.namespacesRequired = [...defaultNamespaces];

export default LandingPage;
