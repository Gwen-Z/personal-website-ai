import { Settings, Brain, BarChart3 } from "lucide-react";
import { Card, CardContent } from "./ui/card";

const features = [
  {
    icon: Settings,
    title: "自定义组件",
    description: "灵活的自定义功能，让记录更符合个人习惯",
  },
  {
    icon: Brain,
    title: "AI整理分析",
    description: "智能分析笔记内容，发现隐藏的思维模式",
  },
  {
    icon: BarChart3,
    title: "笔记可视化",
    description: "将文字转化为直观图表，洞察生活规律",
  },
];

export function FeatureSection() {
  return (
    <section className="w-full py-20 bg-white/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl text-primary mb-4">核心功能</h2>
          <p className="text-lg text-muted-foreground">让每一次记录都有意义</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl bg-white/80 backdrop-blur-sm"
            >
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl text-primary">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}