import Deploy from "@/components/landing/Deploy";
import Engines from "@/components/landing/Engines";
import Features from "@/components/landing/Features";
import Hero from "@/components/landing/Hero";
import Marquee from "@/components/landing/Marquee";
import Quotes from "@/components/landing/Quotes";
import Stats from "@/components/landing/Stats";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <Marquee />
      <Features />
      <Engines />
      <Quotes />
      <Deploy />
    </>
  );
}
