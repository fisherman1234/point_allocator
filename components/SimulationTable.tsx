import React from 'react';
import { Table as TableIcon } from 'lucide-react';
import { SimulationHistoryRow } from '../types';
import { MONTHS } from '../constants';

interface SimulationTableProps {
  history: SimulationHistoryRow[];
}

export const SimulationTable: React.FC<SimulationTableProps> = ({ history }) => {
  return (
    <div className="overflow-x-auto mt-8 border rounded-xl border-slate-200 shadow-sm">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <TableIcon size={16} className="text-slate-500" />
        <h4 className="text-sm font-bold text-slate-700">Monthly Breakdown & Verification</h4>
      </div>
      <table className="w-full text-xs text-right whitespace-nowrap">
        <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200">
          <tr>
            <th className="px-3 py-2 text-left bg-slate-50/50 sticky left-0 z-10">Month</th>
            <th className="px-3 py-2 text-blue-600 bg-blue-50/10">Chase</th>
            <th className="px-3 py-2 text-teal-600 bg-teal-50/10">Citi</th>
            <th className="px-3 py-2 text-slate-600 bg-slate-50/10">Amazon</th>
            <th className="px-3 py-2 text-stone-600 border-l border-slate-200 bg-stone-50/10" colSpan={5}>Bilt Points Breakdown</th>
            <th className="px-3 py-2 text-emerald-600 border-l border-slate-200 bg-emerald-50/10" colSpan={5}>Bilt Cash Flow ($)</th>
          </tr>
          <tr className="text-[10px] text-slate-400 bg-slate-50 border-b border-slate-200">
            <th className="sticky left-0 bg-slate-50 z-10"></th>
            <th className="px-2 py-1 font-normal bg-blue-50/10">+Spend</th>
            <th className="px-2 py-1 font-normal bg-teal-50/10">+Spend</th>
            <th className="px-2 py-1 font-normal bg-slate-50/10">+Cash($)</th>
            {/* Bilt Points Subheaders */}
            <th className="px-2 py-1 border-l border-slate-200 bg-stone-50/10 font-normal">Spend</th>
            <th className="px-2 py-1 bg-amber-50/50 font-normal text-amber-700">Accel.</th>
            <th className="px-2 py-1 bg-stone-50/10 font-normal">Rent</th>
            <th className="px-2 py-1 font-bold bg-stone-50/20 text-stone-700">Total</th>
            <th className="px-2 py-1 bg-stone-50/10 font-normal text-stone-400">Cumul.</th>
             {/* Bilt Cash Subheaders */}
            <th className="px-2 py-1 border-l border-slate-200 bg-emerald-50/10 font-normal">Start</th>
            <th className="px-2 py-1 bg-emerald-50/10 font-normal">+Earned</th>
            <th className="px-2 py-1 bg-emerald-100/50 font-bold text-emerald-700">+Bonus</th>
            <th className="px-2 py-1 bg-emerald-50/10 font-normal">-Burnt</th>
            <th className="px-2 py-1 font-bold bg-emerald-50/20 text-emerald-700">End</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {history.map((row, i) => (
            <tr key={row.month} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 text-left font-medium text-slate-700 sticky left-0 bg-white shadow-[1px_0_5px_-2px_rgba(0,0,0,0.1)]">{MONTHS[i]}</td>
              
              <td className="px-3 py-2 font-mono text-slate-600 bg-blue-50/5">
                +{row.monthlyChase.toLocaleString()}
                {row.cspAnniversaryBonus > 0 && <div className="text-[9px] text-orange-600 font-bold">+{row.cspAnniversaryBonus.toLocaleString()} CSP Anniv.</div>}
                {row.boostBonusChase > 0 && <div className="text-[9px] text-indigo-600 font-bold">+{row.boostBonusChase.toLocaleString()} Boost</div>}
              </td>
              <td className="px-3 py-2 font-mono text-slate-600 bg-teal-50/5">
                +{row.monthlyCiti.toLocaleString()}
                {row.boostBonusCiti > 0 && <div className="text-[9px] text-indigo-600 font-bold">+{row.boostBonusCiti.toLocaleString()} Boost</div>}
              </td>
              <td className="px-3 py-2 font-mono text-slate-600 bg-slate-50/5">+${(row.monthlyAmazon / 100).toLocaleString(undefined, {minimumFractionDigits:0})}</td>
              
              <td className="px-2 py-2 font-mono text-slate-500 border-l border-slate-100 bg-stone-50/5">+{row.monthlyBiltSpend.toLocaleString()}</td>
              <td className="px-2 py-2 font-mono text-amber-600 bg-amber-50/20">{row.acceleratorBonus > 0 ? `+${row.acceleratorBonus.toLocaleString()}` : '-'}</td>
              <td className="px-2 py-2 font-mono text-emerald-600 bg-stone-50/5">{row.monthlyBiltRent > 0 ? `+${Math.round(row.monthlyBiltRent).toLocaleString()}` : '-'}</td>
              <td className="px-2 py-2 font-mono font-bold text-stone-700 bg-stone-50/10">
                {(row.monthlyBiltSpend + row.monthlyBiltRent + row.acceleratorBonus).toLocaleString()}
                {row.boostBonusBilt > 0 && <div className="text-[9px] text-indigo-600 font-bold">+{row.boostBonusBilt.toLocaleString()} Boost</div>}
              </td>
              <td className="px-2 py-2 font-mono text-stone-400 bg-stone-50/5 text-[10px]">{row.grossBiltPoints.toLocaleString()}</td>

              <td className="px-2 py-2 font-mono text-slate-400 border-l border-slate-100 bg-emerald-50/5">${row.startCash.toFixed(0)}</td>
              <td className="px-2 py-2 font-mono text-emerald-600/70 bg-emerald-50/5">+{row.earnedCash.toFixed(0)}</td>
              <td className={`px-2 py-2 font-mono bg-emerald-100/30 ${row.milestoneBonusCash > 0 ? 'text-emerald-700 font-bold' : 'text-slate-300'}`}>
                {row.milestoneBonusCash > 0 ? `+$${row.milestoneBonusCash}` : '-'}
              </td>
              <td className="px-2 py-2 font-mono text-red-400 bg-emerald-50/5">
                {row.redeemedCash > 0 ? (
                  <span title={`Rent: $${row.cashForRent.toFixed(0)}, Accel: $${row.cashForAccelerator.toFixed(0)}, Lyft: $${row.cashForLyft.toFixed(0)}, Boost: $${row.cashForBoost.toFixed(0)}`}>
                    -{row.redeemedCash.toFixed(0)}
                  </span>
                ) : '-'}
              </td>
              <td className="px-2 py-2 font-mono font-bold text-emerald-700 bg-emerald-50/10">${row.endCash.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
