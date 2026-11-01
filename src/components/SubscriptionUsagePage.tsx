import React, { useState } from 'react';
import { Check, Zap, Shield, Sparkles, ArrowRight, ArrowLeft, Clock } from 'lucide-react';
import { SubscriptionPlan, UserProfile } from '../types';

interface SubscriptionUsagePageProps {
  userProfile: UserProfile | null;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  onBack: () => void;
}

export const SubscriptionUsagePage: React.FC<SubscriptionUsagePageProps> = ({
  userProfile,
  onSelectPlan,
  onBack,
}) => {
  const currentPlan = userProfile?.plan || 'free';
  const used = userProfile?.transcriptionMinutesUsed ?? 0;
  const limit = userProfile?.transcriptionMinutesLimit ?? 60;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  const plans: {
    id: SubscriptionPlan;
    name: string;
    price: string;
    period: string;
    desc: string;
    minutes: number;
    fileLimit: string;
    features: string[];
    isPopular?: boolean;
  }[] = [
    {
      id: 'free',
      name: 'Free Starter',
      price: '$0',
      period: 'forever',
      desc: 'Essential speech-to-text for casual creators and students.',
      minutes: 60,
      fileLimit: '100 MB per upload',
      features: [
        '60 minutes transcription / month',
        '30+ language speech recognition',
        'Automatic speaker identification',
        'SRT and TXT subtitle exports',
        'Basic executive summaries',
        'Microphone recording & YouTube import',
      ],
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$19',
      period: 'per month',
      desc: 'High-throughput transcription and subtitle tools for podcasters & teams.',
      minutes: 300,
      fileLimit: '500 MB per upload',
      isPopular: true,
      features: [
        '300 minutes transcription / month',
        'Priority high-speed Gemini Flash processing',
        'Full 10 AI summary & notes models',
        'Multilingual subtitle translation',
        'SRT, WebVTT, Word (.docx), PDF, & JSON',
        'Custom vocabulary and diarization tags',
        'Unlimited saved project history',
      ],
    },
    {
      id: 'business',
      name: 'Business Scale',
      price: '$49',
      period: 'per month',
      desc: 'Enterprise volume and shared team workflows for studios and agencies.',
      minutes: 1200,
      fileLimit: '2 GB per upload',
      features: [
        '1,200 minutes transcription / month',
        'High-capacity background batch processing',
        'All Pro intelligence features included',
        'Collaborative workspace & shared projects',
        'Dedicated API access token',
        'Priority SLA & customer assistance',
      ],
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Subscription & Usage Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transparent transcription allowances with no hidden fees.
          </p>
        </div>
      </div>

      {/* Live Usage Meter Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Plan</span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 font-bold text-xs capitalize">
                {currentPlan}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {used} <span className="text-sm font-normal text-slate-500">of {limit} minutes used</span>
            </h2>
          </div>

          <div className="text-right font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">
            {Math.max(0, limit - used)} minutes remaining
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            style={{ width: `${pct}%` }}
            className={`h-full transition-all duration-500 rounded-full ${
              pct > 90 ? 'bg-amber-500' : 'bg-cyan-500'
            }`}
          />
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = currentPlan === p.id;

          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-6 sm:p-8 flex flex-col justify-between relative transition-all ${
                p.isPopular
                  ? 'border-cyan-500 bg-white dark:bg-slate-900 shadow-lg ring-1 ring-cyan-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
              }`}
            >
              {p.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-cyan-500 text-white text-[10px] font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">{p.desc}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{p.price}</span>
                  <span className="text-xs text-slate-500">/ {p.period}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-500" />
                    <span>{p.minutes} minutes included monthly</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Up to {p.fileLimit}</div>
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 pt-2 text-xs text-slate-600 dark:text-slate-300">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onSelectPlan(p.id)}
                  disabled={isCurrent}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                      : p.isPopular
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                      : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : `Switch to ${p.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
