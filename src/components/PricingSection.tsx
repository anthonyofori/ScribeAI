import React from 'react';
import { Check, Sparkles, Zap, Shield, ArrowRight } from 'lucide-react';
import { SubscriptionPlan, UserProfile } from '../types';

interface PricingSectionProps {
  userProfile: UserProfile | null;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  userProfile,
  onSelectPlan,
  onOpenAuth,
}) => {
  const currentPlan = userProfile?.plan || 'free';

  const plans: {
    id: SubscriptionPlan;
    name: string;
    price: string;
    period: string;
    tagline: string;
    minutes: number;
    popular?: boolean;
    features: string[];
    cta: string;
  }[] = [
    {
      id: 'free',
      name: 'Starter Free',
      price: '$0',
      period: 'forever',
      tagline: 'Ideal for students, creators & casual transcriptions.',
      minutes: 60,
      features: [
        '60 minutes transcription every month',
        '30+ world language recognition',
        'Automatic speaker diarization',
        'SRT and TXT subtitle exports',
        'Basic executive summaries & notes',
        'Microphone recording & YouTube import',
        'Local & cloud session storage',
      ],
      cta: userProfile ? (currentPlan === 'free' ? 'Current Plan' : 'Downgrade') : 'Start Free Now',
    },
    {
      id: 'pro',
      name: 'Creator Pro',
      price: '$19',
      period: 'per month',
      tagline: 'Built for podcasters, YouTubers, and video editors.',
      minutes: 300,
      popular: true,
      features: [
        '300 minutes transcription / month',
        'Priority high-throughput Gemini Flash processing',
        'All 10 AI summary & notes frameworks',
        'Full subtitle editor with split & merge blocks',
        'SRT, WebVTT, Word (.docx), & PDF exports',
        'Multilingual subtitle translation',
        'Unlimited cloud project history',
      ],
      cta: userProfile ? (currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro') : 'Get Creator Pro',
    },
    {
      id: 'business',
      name: 'Business Studio',
      price: '$49',
      period: 'per month',
      tagline: 'For production agencies, studios, and team workflows.',
      minutes: 1200,
      features: [
        '1,200 minutes transcription / month',
        'High-capacity background batch processing',
        'Custom vocabulary & acoustic fine-tuning',
        'Dedicated API key access token',
        'Team project sharing & collaboration',
        'Priority 24/7 engineering support',
        'SOC2 & GDPR enterprise compliance',
      ],
      cta: userProfile ? (currentPlan === 'business' ? 'Current Plan' : 'Upgrade to Business') : 'Get Studio Plan',
    },
  ];

  const handleAction = (planId: SubscriptionPlan) => {
    if (!userProfile) {
      onOpenAuth('signup');
    } else {
      onSelectPlan(planId);
    }
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 border-t border-slate-200/70 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2">
            Transparent Pricing
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white" style={{ textWrap: 'balance' }}>
            Flexible Plans for Every Creator and Studio
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2.5">
            Start with 60 complimentary minutes every month. Upgrade as your video and audio production expands.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((p) => {
            const isCurrent = Boolean(userProfile && currentPlan === p.id);
            return (
              <div
                key={p.id}
                className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                  p.popular
                    ? 'border-2 border-cyan-500 bg-white dark:bg-slate-900 shadow-xl shadow-cyan-500/10 -translate-y-1'
                    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span>Most Popular</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.tagline}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                      {p.price}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/{p.period}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/40 text-xs font-semibold text-cyan-800 dark:text-cyan-300 flex items-center justify-between">
                    <span>Monthly Quota</span>
                    <span className="font-mono font-bold">{p.minutes} Minutes</span>
                  </div>

                  <ul className="space-y-2.5 pt-2 text-xs text-slate-700 dark:text-slate-300">
                    {p.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => handleAction(p.id)}
                    disabled={isCurrent}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                      isCurrent
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-default'
                        : p.popular
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
                        : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span>{p.cta}</span>
                    {!isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
