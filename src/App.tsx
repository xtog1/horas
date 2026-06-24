import React, { useState, useEffect } from "react";
import { Rates, ExtraHoursRecord, DEFAULT_RATES, calculateRecordBreakdown, formatCurrency, getPayrollMonth, formatPayrollMonth } from "./types";
import Scanner from "./components/Scanner";
import History from "./components/History";
import Stats from "./components/Stats";
import RatesConfig from "./components/RatesConfig";
import { Sparkles, History as HistoryIcon, BarChart3, Settings, Database, Download, Upload, Wallet, Clock, RefreshCw, Smartphone } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"scan" | "history" | "stats" | "rates">("scan");
  
  // Load initial rates
  const [rates, setRates] = useState<Rates>(() => {
    try {
      const saved = localStorage.getItem("mis_extras_rates");
      return saved ? JSON.parse(saved) : DEFAULT_RATES;
    } catch {
      return DEFAULT_RATES;
    }
  });

  // Load initial records
  const [records, setRecords] = useState<ExtraHoursRecord[]>(() => {
    try {
      const saved = localStorage.getItem("mis_extras_records");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading saved records:", e);
    }
    
    // Seed sample data for an exquisite first-run experience if empty
    return [
      {
        id: "seed-1",
        date: "2026-06-15",
        hoursNormal: 2,
        hoursFestive: 3,
        hasReten: true,
        hasMediaDieta: false,
        hasReclutamiento: false,
        notes: "Parte del Lunes. 3h nocturnas/fin de semana y retén ordinario.",
        payrollMonth: "2026-06", // Nómina Junio
        weekNumber: 25,
        createdAt: new Date().toISOString()
      },
      {
        id: "seed-2",
        date: "2026-06-20",
        hoursNormal: 0,
        hoursFestive: 4,
        hasReten: true,
        hasMediaDieta: true,
        hasReclutamiento: false,
        notes: "Sábado de guardia. 4h fin de semana, media dieta y retén de fin de semana.",
        payrollMonth: "2026-07", // Nómina Julio
        weekNumber: 25,
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Sync rates to LocalStorage
  useEffect(() => {
    localStorage.setItem("mis_extras_rates", JSON.stringify(rates));
  }, [rates]);

  // Sync records to LocalStorage
  useEffect(() => {
    localStorage.setItem("mis_extras_records", JSON.stringify(records));
  }, [records]);

  // Handle saving parsed or edited records
  const handleSaveRecord = (newRecord: Omit<ExtraHoursRecord, "id" | "createdAt"> & { id?: string }) => {
    if (newRecord.id) {
      // Edit existing
      setRecords(prev => prev.map(r => r.id === newRecord.id ? { ...r, ...newRecord } as ExtraHoursRecord : r));
    } else {
      // Add new
      const id = "rec-" + Math.random().toString(36).substr(2, 9);
      const createdAt = new Date().toISOString();
      setRecords(prev => [...prev, { ...newRecord, id, createdAt } as ExtraHoursRecord]);
    }
  };

  const handleUpdateRecord = (updatedRecord: ExtraHoursRecord) => {
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  const handleDeleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateRates = (newRates: Rates) => {
    setRates(newRates);
  };

  // Compute stats for the current/active payroll month
  // We use today's calculated payroll month as default
  const currentTodayDate = "2026-06-24"; // Locked to metadata local time anchor
  const currentPayrollMonthKey = getPayrollMonth(currentTodayDate); // "2026-07" (Nómina Julio 2026)

  const getCurrentMonthStats = () => {
    const currentMonthRecords = records.filter(r => r.payrollMonth === currentPayrollMonthKey);
    let totalMoney = 0;
    let totalHours = 0;
    
    currentMonthRecords.forEach(r => {
      const breakdown = calculateRecordBreakdown(r, rates);
      totalMoney += breakdown.total;
      totalHours += r.hoursNormal + r.hoursFestive;
    });

    return {
      money: totalMoney,
      hours: totalHours,
      count: currentMonthRecords.length
    };
  };

  const currentMonthStats = getCurrentMonthStats();

  // Backup data (Export to JSON file)
  const handleExportBackup = () => {
    const backupData = {
      version: 1,
      rates,
      records
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Copia_Seguridad_MisExtras_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Restore data (Import from JSON file)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.rates && Array.isArray(parsed.records)) {
          if (window.confirm("Se va a importar la copia de seguridad. Esto reemplazará las tarifas y registros actuales de tu dispositivo. ¿Continuar?")) {
            setRates(parsed.rates);
            setRecords(parsed.records);
            alert("✓ Datos importados con éxito.");
          }
        } else {
          alert("Archivo de copia de seguridad no válido.");
        }
      } catch {
        alert("Error al leer el archivo. Asegúrate de que sea un archivo JSON válido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="app-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/25 selection:text-emerald-300">
      
      {/* Premium Elegant Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-4 sm:px-6 sticky top-0 z-40 shadow-xl backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Brand/Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20">
                ME
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
                  MisExtras <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">PRO</span>
                </h1>
                <p className="text-[10px] text-slate-400">Calculador y Escáner IA de Partes de Trabajo</p>
              </div>
            </div>

            {/* Mobile Backup buttons */}
            <div className="flex items-center space-x-1.5 md:hidden">
              <button
                onClick={handleExportBackup}
                title="Hacer Copia de Seguridad"
                className="p-2 bg-slate-850 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <label className="p-2 bg-slate-850 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer block">
                <Upload className="w-4 h-4" />
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>

          {/* Quick Realtime Nomina Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-6 px-4 md:min-w-[340px]">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {formatPayrollMonth(currentPayrollMonthKey)}
                </div>
                <div className="text-sm font-black text-slate-100">
                  {formatCurrency(currentMonthStats.money)}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Extras Logueadas</div>
                <div className="text-sm font-black text-slate-100">{currentMonthStats.hours} horas</div>
              </div>
            </div>
          </div>

          {/* Desktop Backup buttons */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={handleExportBackup}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Copia de seguridad</span>
            </button>
            <label className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Importar copia</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-6">
        
        {/* Navigation Tabs (Desktop only top-aligned, mobile-friendly design) */}
        <div className="hidden md:flex space-x-2 mb-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "scan" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Escáner IA</span>
          </button>
          
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "history" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>Historial</span>
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "stats" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Estadísticas</span>
          </button>

          <button
            onClick={() => setActiveTab("rates")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "rates" 
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Tarifas</span>
          </button>
        </div>

        {/* Tab content rendering */}
        <div className="animate-fade-in duration-300">
          {activeTab === "scan" && (
            <Scanner rates={rates} onSaveRecord={handleSaveRecord} />
          )}
          {activeTab === "history" && (
            <History records={records} rates={rates} onUpdateRecord={handleUpdateRecord} onDeleteRecord={handleDeleteRecord} />
          )}
          {activeTab === "stats" && (
            <Stats records={records} rates={rates} />
          )}
          {activeTab === "rates" && (
            <RatesConfig rates={rates} onUpdateRates={handleUpdateRates} />
          )}
        </div>

      </main>

      {/* Floating Bottom Navigation Bar (For Mobile & Tablet looks like native app) */}
      <nav id="mobile-navigation" className="md:hidden fixed bottom-0 inset-x-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 py-2 px-4 z-40 flex items-center justify-around shadow-2xl">
        
        <button
          onClick={() => setActiveTab("scan")}
          className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            activeTab === "scan" ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-bold">Escáner IA</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            activeTab === "history" ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <HistoryIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold">Historial</span>
        </button>

        <button
          onClick={() => setActiveTab("stats")}
          className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            activeTab === "stats" ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[9px] font-bold">Estadísticas</span>
        </button>

        <button
          onClick={() => setActiveTab("rates")}
          className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            activeTab === "rates" ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold">Tarifas</span>
        </button>

      </nav>

      {/* Progressive Web App Install Instructions Tip Banner */}
      <div className="hidden md:flex bg-slate-950 border-t border-slate-900 py-3 text-center text-[10px] text-slate-500 items-center justify-center space-x-2">
        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
        <span><b>Consejo PWA:</b> Puedes instalar esta aplicación directamente en la pantalla de inicio de tu iPhone (Safari → Compartir ↑ → Añadir a pantalla de inicio) o Android para usarla como una App nativa.</span>
      </div>

    </div>
  );
}
