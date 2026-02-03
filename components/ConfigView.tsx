import React from 'react';
import { CARDS } from '../constants';

interface ConfigViewProps {
  creditValues: Record<string, number>;
  onUpdateCreditValue: (cardId: string, creditId: string, value: number) => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({ creditValues, onUpdateCreditValue }) => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Card Configurations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CARDS.map(card => {
          const totalCredits = card.credits ? card.credits.reduce((sum, c) => {
             const userVal = creditValues[`${card.id}-${c.id}`] ?? c.defaultUserValue;
             return sum + userVal;
          }, 0) : 0;
          
          const netValue = totalCredits - card.annualFee;

          return (
            <div key={card.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
              <div className={`${card.color} px-4 py-3 text-white flex items-center gap-3`}>
                <card.icon size={20} />
                <h3 className="font-bold text-lg">{card.name}</h3>
              </div>
              <div className="p-4 flex-grow">
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
                  <div className="mt-4 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Credits Configuration</h4>
                    <div className="space-y-2">
                       <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 text-[10px] font-bold text-slate-400 uppercase">
                          <span>Name</span>
                          <span className="text-right">Face Val</span>
                          <span className="text-right">User Val</span>
                       </div>
                       {card.credits.map((credit) => {
                          const overrideKey = `${card.id}-${credit.id}`;
                          const currentUserVal = creditValues[overrideKey] ?? credit.defaultUserValue;
                          
                          return (
                            <div key={credit.id} className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 items-center text-xs">
                                <span className="font-medium text-slate-700 truncate" title={credit.label}>{credit.label}</span>
                                <span className="text-right text-slate-400 font-mono">${credit.faceValue}</span>
                                <div className="flex justify-end">
                                    <div className="relative w-16">
                                        <span className="absolute left-1.5 top-1 text-slate-400">$</span>
                                        <input 
                                            type="number"
                                            className="w-full pl-3.5 py-0.5 text-right border-b border-slate-200 focus:border-blue-500 outline-none font-bold text-emerald-600 bg-transparent"
                                            value={currentUserVal}
                                            onChange={(e) => onUpdateCreditValue(card.id, credit.id, parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            </div>
                          );
                       })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex justify-between items-center">
                 <span className="text-xs font-bold text-slate-500 uppercase">Net Cost (Credits - Fee)</span>
                 <span className={`text-sm font-black ${netValue >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {netValue >= 0 ? '+' : '-'}${Math.abs(netValue)}
                 </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}