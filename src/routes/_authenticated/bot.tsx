import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Sparkles, Brain, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/bot")({
  head: () => ({
    meta: [
      { title: "AI Assistant & Trainer — In&out" },
      { name: "description", content: "AI-powered personal finance insights and custom ML model trainer." },
      { property: "og:title", content: "AI Assistant & Trainer — In&out" },
      { property: "og:description", content: "AI-powered personal finance insights and custom ML model trainer." },
    ],
  }),
  component: BotPage,
});

function BotPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Assistant & Trainer"
        description="Configure ML models and converse with your custom AI financial advisor."
      />

      <div className="flex min-h-[450px] items-center justify-center py-6">
        {/* Sleek, Glowing Card UI */}
        <section className="card-surface relative flex w-full max-w-md flex-col items-center justify-center overflow-hidden p-8 text-center shadow-xl border border-border/40 bg-gradient-to-b from-card to-muted/20 rounded-2xl">
          {/* Radial blur decorations for premium feel */}
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-success/5 blur-3xl pointer-events-none" />

          {/* Glowing Animated Icon Container */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 shadow-inner">
            <Bot className="h-8 w-8 animate-pulse text-primary" />
            <Sparkles className="absolute -right-1 -top-1 h-4.5 w-4.5 text-warning animate-bounce" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            Feature Rolling Out Soon
          </span>

          <h2 className="text-xl font-bold tracking-tight mb-2">AI Financial Advisor</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-6">
            We are fine-tuning our localized financial intelligence models to offer you real-time personalized spending recommendations and automated planning advice.
          </p>

          <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto font-semibold rounded-xl gap-2 shadow hover:scale-[1.01] transition-transform cursor-pointer">
            View Development Roadmap <ArrowRight className="h-4 w-4" />
          </Button>
        </section>
      </div>

      {/* Auto-opening dialog explaining the coming soon status */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md text-center rounded-2xl border border-border/50 bg-card p-6 shadow-2xl">
          <DialogHeader className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1 relative">
              <Brain className="h-7 w-7 text-primary" />
              <Star className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-warning fill-warning" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">Feature Rolling Soon!</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
              We are currently calibrating the model trainer and fine-tuning neural networks. Once released, the AI Bot will help you:
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 text-left space-y-3.5 border-y border-border/50 my-2">
            <div className="flex items-start gap-3">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success text-[10px] font-bold">
                ✓
              </div>
              <p className="text-xs text-foreground font-medium leading-normal">
                Analyze expense categories, identify spending anomalies, and get real-time recommendations.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success text-[10px] font-bold">
                ✓
              </div>
              <p className="text-xs text-foreground font-medium leading-normal">
                Train your custom machine learning model on your historical transaction data locally.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success text-[10px] font-bold">
                ✓
              </div>
              <p className="text-xs text-foreground font-medium leading-normal">
                Predict future cash flow patterns and receive early warnings for upcoming debt obligations.
              </p>
            </div>
          </div>

          <DialogFooter className="sm:justify-center pt-2">
            <Button onClick={() => setIsOpen(false)} className="w-full sm:w-auto font-semibold rounded-xl px-6 cursor-pointer">
              Awesome, I'll wait!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
