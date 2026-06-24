import React, { useState } from "react";
import { ExtraHoursRecord, Rates, calculateRecordBreakdown, formatCurrency, formatPayrollMonth } from "../types";
import { TrendingUp, BarChart3, Clock, HelpCircle, DollarSign, Award, ShieldAlert, Coffee } from "lucide-react";

interface StatsProps {
  records: ExtraHoursRecord[];
  rates: Rates;
}

export default function Stats({ records, rates }: StatsProps) {
  const [activeStatPeriod, setActiveStatPeriod] = useState<string>("all");

  // Get list of payroll periods
  const payrollPeriods = Array.from(new Set(records.map(r => r.payrollMonth))).sort();

  // Filter records based on selected period
  const filteredRecords = activeStatPeriod === "all" 
    ? records 
    : records.filter(r => r.payrollMonth === activeStatPeriod);

  // Aggregated calculations
  let totalNormalHours = 0;
  let totalFestiveHours = 0;
  let totalNormalAmount = 0;
  let totalFestiveAmount = 0;
  let totalRetenAmount = 0;
  let totalMediaDietaAmount = 0;
  let totalReclutamientoAmount = 0;
  let totalEarnings = 0;

  let countRetens = 0;
  let countMediaDietas = 0;
  let countReclutamientos = 0;

  filteredRecords.forEach(r => {
    const b = calculateRecordBreakdown(r, rates);
    totalNormalHours += r.hoursNormal;
    totalFestiveHours += r.hoursFestive;
    totalNormalAmount += b.hoursNormalAmount;
    totalFestiveAmount += b.hoursFestiveAmount;
    totalRetenAmount += b.retenAmount;
    totalMediaDietaAmount += b.mediaDietaAmount;
    totalReclutamientoAmount += b.reclutamientoAmount;
    totalEarnings += b.total;

    if (r.hasReten) countRetens++;
    if (r.hasMediaDieta) countMediaDietas++;
    if (r.hasReclutamiento) countReclutamientos++;
  });

  // Calculate stats by Month for the bar chart
  const monthlyStats = payrollPeriods.map(month => {
    const monthRecs = records.filter(r => r.payrollMonth === month);
    let total = 0;
    let normalH = 0;
    let festiveH = 0;

    monthRecs.forEach(r => {
      const b = calculateRecordBreakdown(r, rates);
      total += b.total;
      normalH += r.hoursNormal;
      festiveH += r.hoursFestive;
    });

    return {
      month,
      label: formatPayrollMonth(month).replace("Nómina ", ""),
      total,
      normalH,
      festiveH
    };
  });

  // Find max value in monthly stats for scaling the chart
  const maxMonthlyEarnings = Math.max(...monthlyStats.map(m => m.total), 1);

  return (
    <div id="stats-panel" className="space-y-6">
      
      {/* Period selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" /> Estadísticas y Rendimiento
          </h2>
          <p className="text-xs text-slate-400">Visualiza de forma analítica el impacto de tus variables y horas en tu nómina</p>
        </div>

        <select
          value={activeStatPeriod}
          onChange={(e) => setActiveStatPeriod(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 text-xs sm:text-sm cursor-pointer focus:outline-none focus:border-emerald-500"
        >
          <option value="all">📊 Datos Históricos Completos</option>
          {payrollPeriods.map(p => (
            <option key={p} value={p}>{formatPayrollMonth(p)}</option>
          ))}
        </select>
      </div>

      {/* Bento Grid KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Money */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Ingresos Totales</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {formatCurrency(totalEarnings)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Suma total de horas y pluses registrados</p>
          </div>
        </div>

        {/* Total Hours */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Horas Extras</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {totalNormalHours + totalFestiveHours}h
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
              <span>{totalNormalHours}h normales</span>
              <span>•</span>
              <span className="text-emerald-400">{totalFestiveHours}h festivas</span>
            </div>
          </div>
        </div>

        {/* Total Retenes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Retenes Activos</span>
            <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {countRetens} días
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Importe retén: {formatCurrency(totalRetenAmount)}</p>
          </div>
        </div>

        {/* Other Variables */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Otros Pluses</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {countMediaDietas + countReclutamientos} pluses
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
              <span>{countMediaDietas} dietas</span>
              <span>•</span>
              <span className="text-blue-400">{countReclutamientos} reclut.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Monthly Evolution (Bar Chart) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Evolución de Ingresos por Nómina
          </h3>

          {monthlyStats.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 py-16">
              Registra partes para ver el histórico de nóminas.
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-end min-h-[220px]">
              {/* Bar Layout */}
              <div className="flex items-end justify-between gap-4 h-44 border-b border-slate-800 pb-2">
                {monthlyStats.map(m => {
                  const percent = (m.total / maxMonthlyEarnings) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                      {/* Tooltip */}
                      <div className="absolute -top-12 scale-0 group-hover:scale-100 bg-slate-950 border border-slate-800 text-[10px] text-slate-200 p-2 rounded-lg shadow-xl text-center pointer-events-none transition-all duration-200 z-10 w-28">
                        <div className="font-bold">{m.label}</div>
                        <div className="text-emerald-400 font-bold">{formatCurrency(m.total)}</div>
                        <div className="text-[8px] text-slate-500">{m.normalH}h norm. | {m.festiveH}h fest.</div>
                      </div>

                      {/* Bar Fill */}
                      <div className="w-full bg-slate-950/40 rounded-t-lg overflow-hidden h-36 flex items-end">
                        <div 
                          style={{ height: `${percent}%` }}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 rounded-t-md transition-all duration-500 relative"
                        >
                          <div className="absolute inset-x-0 top-0 h-1 bg-white/20"></div>
                        </div>
                      </div>

                      {/* Bar Label */}
                      <span className="text-[10px] text-slate-400 mt-2 text-center whitespace-nowrap truncate w-full">
                        {m.label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Income distribution breakdown */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-5">
            Distribución de Ingresos
          </h3>

          {totalEarnings === 0 ? (
            <div className="flex items-center justify-center text-xs text-slate-500 py-16">
              Aún sin datos económicos suficientes.
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Progress split bar */}
              <div className="h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                <div style={{ width: `${(totalNormalAmount/totalEarnings)*100}%` }} className="bg-slate-300" title="Horas Normales"></div>
                <div style={{ width: `${(totalFestiveAmount/totalEarnings)*100}%` }} className="bg-emerald-500" title="Horas Festivas"></div>
                <div style={{ width: `${(totalRetenAmount/totalEarnings)*100}%` }} className="bg-orange-500" title="Retenes"></div>
                <div style={{ width: `${(totalMediaDietaAmount/totalEarnings)*100}%` }} className="bg-yellow-500" title="Media Dieta"></div>
                <div style={{ width: `${(totalReclutamientoAmount/totalEarnings)*100}%` }} className="bg-blue-500" title="Reclutamiento"></div>
              </div>

              {/* Legends list */}
              <div className="space-y-3 pt-2 text-xs">
                
                {/* Horas Normales */}
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span>Horas Extras Normales</span>
                  </div>
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(totalNormalAmount)} ({((totalNormalAmount/totalEarnings)*100).toFixed(0)}%)
                  </span>
                </div>

                {/* Horas Festivas */}
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>Horas Extras Festivas</span>
                  </div>
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(totalFestiveAmount)} ({((totalFestiveAmount/totalEarnings)*100).toFixed(0)}%)
                  </span>
                </div>

                {/* Retenes */}
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span>Plus Retenes</span>
                  </div>
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(totalRetenAmount)} ({((totalRetenAmount/totalEarnings)*100).toFixed(0)}%)
                  </span>
                </div>

                {/* Media Dieta */}
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    <span>Media Dieta</span>
                  </div>
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(totalMediaDietaAmount)} ({((totalMediaDietaAmount/totalEarnings)*100).toFixed(0)}%)
                  </span>
                </div>

                {/* Reclutamiento */}
                <div className="flex items-center justify-between pb-1.5">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span>Reclutamiento</span>
                  </div>
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(totalReclutamientoAmount)} ({((totalReclutamientoAmount/totalEarnings)*100).toFixed(0)}%)
                  </span>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
