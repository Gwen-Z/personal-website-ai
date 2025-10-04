import { Navigation } from "./components/Navigation";
import { HeroSection } from "./components/HeroSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { NoteTagCloud } from "./components/NoteTagCloud";
import { HandwrittenDecorations } from "./components/HandwrittenDecorations";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-100 to-blue-100 relative">
      <HandwrittenDecorations />
      <Navigation />
      <main>
        <HeroSection />
        <FeaturesSection />
        <NoteTagCloud />
      </main>
      <Footer />
    </div>
  );
}


