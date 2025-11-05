import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    question: 'Is it legal to use FPL Companion?',
    answer: 'Yes, absolutely! FPL Companion uses the public Fantasy Premier League API, which is freely available for developers. We don\'t violate any terms of service and don\'t provide any unfair advantages—just better data analysis tools.'
  },
  {
    question: 'Do I need to share my password?',
    answer: 'No, never! We only need your FPL Team ID, which is a public number visible in your team\'s URL. We never ask for passwords or login credentials. Your account security is never compromised.'
  },
  {
    question: 'How accurate are the predictions?',
    answer: 'Our predictions are conservative by design, with an average accuracy of 95% (within 5% of actual scores). We combine multiple data sources including betting odds, form data, fixture difficulty, and team strength to provide the most realistic forecasts possible.'
  },
  {
    question: 'Can I use it on mobile?',
    answer: 'Yes! FPL Companion is fully responsive and works seamlessly on all devices—desktop, tablet, and mobile. Access your predictions and squad analysis anywhere, anytime.'
  },
  {
    question: 'How often is the data updated?',
    answer: 'Our system updates every 15 minutes to ensure you have the latest player prices, injury news, and prediction data. Major updates (like team news) are reflected in real-time.'
  },
  {
    question: 'Is it really free?',
    answer: 'Yes, 100% free with no hidden costs, premium tiers, or paywalls. We believe every FPL manager should have access to advanced analytics tools, regardless of budget.'
  },
  {
    question: 'What makes this better than ICT index?',
    answer: 'While the ICT index is useful, it doesn\'t account for fixture difficulty, opponent strength, or real-world betting market intelligence. We combine multiple data sources including betting odds, form trends, and contextual factors for more accurate predictions.'
  },
  {
    question: 'Can I plan for multiple gameweeks?',
    answer: 'Yes! One of our key features is multi-gameweek planning. You can see optimal squad selections for the next 3-5 gameweeks, helping you plan transfers strategically rather than week-to-week.'
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="relative py-24 sm:py-32 bg-gradient-to-b from-white to-cyan-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 text-transparent bg-clip-text">
              Questions
            </span>
          </h2>
          <p className="text-xl text-slate-600">
            Everything you need to know about FPL Companion
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-fuchsia-500/50 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="text-lg font-semibold text-slate-900 pr-8">{faq.question}</span>
                <div className="shrink-0 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  {openIndex === idx ? (
                    <Minus className="w-5 h-5 text-fuchsia-400" />
                  ) : (
                    <Plus className="w-5 h-5 text-slate-600" />
                  )}
                </div>
              </button>

              {openIndex === idx && (
                <div className="px-6 pb-6">
                  <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">Still have questions?</p>
          <button className="text-fuchsia-400 hover:text-fuchsia-300 font-semibold transition-colors">
            Contact Support →
          </button>
        </div>
      </div>
    </section>
  );
}
