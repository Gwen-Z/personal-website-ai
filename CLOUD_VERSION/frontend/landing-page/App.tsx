import { Navigation } from "./components/Navigation";
import { HeroSection } from "./components/HeroSection";
import { BubbleChart } from "./components/BubbleChart";
import { FeatureSection } from "./components/FeatureSection";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-100 to-blue-100">
      <Navigation />
      <main>
        <HeroSection />
        <BubbleChart />
        <FeatureSection />
      </main>
      <Footer />
    </div>
  );
}