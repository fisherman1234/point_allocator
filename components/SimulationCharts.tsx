import React from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area
} from 'recharts';
import { SimulationHistoryRow } from '../types';
import { MONTHS } from '../constants';

interface SimulationChartsProps {
  history: SimulationHistoryRow[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white p-4 rounded-xl shadow-xl border border-slate-700 backdrop-blur-sm z-50 min-w-[200px]">
        <div className="text-sm font-bold border-b border-slate-700 pb-2 mb-2 flex justify-between">
          <span>{label} Summary</span>
        </div>
        <div className="space-y-2 text-xs">
          {payload.map((entry: any, index: number) => {
             // Filter out hidden or specific lines if needed
             if (entry.dataKey === 'BiltCashBalance') {
                 return (
                    <div key={index} className="border-t border-slate-700 pt-2 mt-2">
                        <div className="flex justify-between items-center text-emerald-400">
                            <span className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Cash Bal
                            </span>
                            <span className="font-mono font-medium">${entry.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                 );
             }
             return (
                <div key={index} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div> 
                        {entry.name}
                    </span>
                    <span className="font-mono font-medium">{entry.value.toLocaleString()}</span>
                </div>
             )
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const SimulationCharts: React.FC<SimulationChartsProps> = ({ history }) => {
  // Map month index to name
  const data = history.map((h, i) => ({
    ...h,
    name: MONTHS[i]
  }));

  return (
    <div className="w-full h-[400px] bg-white rounded-xl p-4 border border-slate-100">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            yAxisId="left" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={(value) => new Intl.NumberFormat('en', { notation: "compact", compactDisplay: "short" }).format(value)}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: '#10b981', fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          
          <Line yAxisId="left" type="monotone" dataKey="Chase" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Chase Pts" />
          <Line yAxisId="left" type="monotone" dataKey="Citi" stroke="#0d9488" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Citi Pts" />
          <Line yAxisId="left" type="monotone" dataKey="Bilt" stroke="#57534e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Bilt Pts" />
          <Line yAxisId="left" type="monotone" dataKey="Amazon" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Amazon Pts" />
          
          {/* Cash Balance as an Area or distinct Line */}
          <Area 
            yAxisId="right" 
            type="monotone" 
            dataKey="BiltCashBalance" 
            fill="#10b981" 
            stroke="#10b981" 
            fillOpacity={0.1} 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Cash Balance ($)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
