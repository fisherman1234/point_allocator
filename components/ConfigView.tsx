import React from 'react';
import { CARDS } from '../constants';

export const ConfigView: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Card Configurations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CARDS.map(card => (
          <div key={card.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className={`${card.color} px-4 py-3 text-white flex items-center gap-3`}>
              <card.icon size={20} />
              <h3 className="font-bold text-lg">{card.name}</h3>
            </div>
            <div className="p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Earning Rules</h4>
              <div className="space-y-3">
                {card.categories.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="text-slate-400"><cat.icon size={16} /></div>
                      <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {cat.multiplier}x
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mapped Categories</h4>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(card.categories.flatMap(c => c.accepts))].map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded-full font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
              </div>
              {card.annualFee > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">Annual Fee</span>
                      <span className="text-sm font-bold text-red-500">-${card.annualFee}</span>
                  </div>
              )}
              {card.credits && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Credits</h4>
                  {card.credits.map((credit, i) => (
                    <div key={i} className="flex justify-between items-center text-xs text-emerald-600">
                      <span>{credit.label}</span>
                      <span className="font-bold">+${credit.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
