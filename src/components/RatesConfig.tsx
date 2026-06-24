import React, { useState } from "react";
import { Rates, DEFAULT_RATES, formatCurrency } from "../types";
import { Settings, RefreshCw, Save, DollarSign, Clock, ShieldAlert, Award, Coffee } from "lucide-react";

interface RatesConfigProps {
  rates: Rates;
  onUpdateRates: (newRates: Rates) => void;
}

export default function RatesConfig({ rates, onUpdateRates }: RatesConfigProps) {
  const [formData, setFormData] = useState<Rates>({ ...rates });
  const [isSaved, setIsSaved] = useState(false);

  const handleInputChange = (key: keyof Rates, value: string) => {
    const numValue = parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      [key]: isNaN(numValue) ? 0 : numValue,
    }));
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRates(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm("¿Seguro que quieres restablecer las tarifas por defecto?")) {
      setFormData({ ...DEFAULT_RATES });
      onUpdateRates(DEFAULT_RATES);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  return (
    <div id="rates-config-panel" className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Configuración de Tarifas</h2>
              <p className="text-sm text-slate-400">Personaliza los precios oficiales de horas y pluses</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors bg-slate-800 hover:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSaved && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium animate-fade-in">
              ✓ Tarifas actualizadas correctamente en tu dispositivo. Todos los cálculos se adaptarán de inmediato.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seccion Horas */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Horas Extraordinarias</h3>
              
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Hora Extra Normal
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hoursNormal}
                      onChange={(e) => handleInputChange("hoursNormal", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-4 pr-12 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
                    />
                    <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-medium">€/h</span>
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Hora Extra Festiva/Nocturna
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hoursFestive}
                      onChange={(e) => handleInputChange("hoursFestive", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-4 pr-12 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
                    />
                    <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-medium">€/h</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Aplica a nocturnas, fines de semana y festivos.</p>
                </label>
              </div>
            </div>

            {/* Seccion Pluses */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Variables y Pluses</h3>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-400" /> Retén Diario (L-V)
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.retenNormal}
                      onChange={(e) => handleInputChange("retenNormal", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-4 pr-12 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
                    />
                    <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-medium">€/día</span>
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Retén Fin de Semana (S-D)
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.retenWeekend}
                      onChange={(e) => handleInputChange("retenWeekend", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-4 pr-12 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
                    />
                    <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-medium">€/día</span>
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
                    <Coffee className="w-3.5 h-3.5 text-yellow-500" /> Media Dieta
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mediaDieta}
                      onChange={(e) => handleInputChange("mediaDieta", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-4 pr-12 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
                    />
                    <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-medium">€/día</span>
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-400" /> Plus Reclutamiento
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.reclutamiento}
                      onChange={(e) => handleInputChange("reclutamiento", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-4 pr-12 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
                    />
                    <span className="absolute right-4 top-2.5 text-slate-500 text-sm font-medium">€/día</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-semibold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Tarifas</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-xs text-slate-400 space-y-2">
        <h4 className="font-semibold text-slate-300 text-sm">💡 Nota de cálculo automático:</h4>
        <p>• Al subir el parte, la Inteligencia Artificial de la app leerá las horas directamente de la captura.</p>
        <p>• La app detecta automáticamente si el día del parte es Sábado o Domingo para asignarte la tarifa de <b>Retén de Fin de Semana ({formatCurrency(formData.retenWeekend)})</b> en lugar del <b>Retén Diario ({formatCurrency(formData.retenNormal)})</b>.</p>
        <p>• Las horas extras normales y festivas se calculan automáticamente multiplicando las horas registradas por sus respectivas tarifas vigentes.</p>
      </div>
    </div>
  );
}
