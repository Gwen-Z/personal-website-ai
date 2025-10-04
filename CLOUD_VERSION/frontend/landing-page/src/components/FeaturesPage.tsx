import { BubbleChart } from "./BubbleChart";
import { FeatureSection } from "./FeatureSection";

export function FeaturesPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-100 to-blue-100">
      <main>
        <BubbleChart />
        <FeatureSection />
      </main>
    </div>
  );
}
