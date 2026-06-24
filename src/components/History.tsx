import React, { useState } from "react";
import { ExtraHoursRecord, Rates, calculateRecordBreakdown, formatCurrency, formatDateLabel, formatPayrollMonth, getPayrollMonth, getWeekNumber, isWeekend } from "../types";
import { Calendar, Search, FileDown, Eye, Edit2, Trash2, ShieldAlert, Award, Coffee, Clock, X, Save, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface HistoryProps {
  records: ExtraHoursRecord[];
  rates: Rates;
  onUpdateRecord: (updatedRecord: ExtraHoursRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export default function History({ records, rates, onUpdateRecord, onDeleteRecord }: HistoryProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Image Viewer Modal State
  const [activeImage, setActiveImage] = useState<string | null>(null);
  
  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ExtraHoursRecord | null>(null);

  // Grouping expanded/collapsed states
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  // Get unique payroll months for filtering
  const payrollMonths = Array.from(new Set(records.map(r => r.payrollMonth))).sort().reverse();

  // Filter records
  const filteredRecords = records.filter(record => {
    const matchesMonth = selectedMonth === "all" || record.payrollMonth === selectedMonth;
    const matchesSearch = searchQuery === "" || 
      record.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.date.includes(searchQuery) ||
      formatDateLabel(record.date).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMonth && matchesSearch;
  });

  // Group records by payroll month
  const groupedRecords: Record<string, ExtraHoursRecord[]> = {};
  filteredRecords.forEach(record => {
    if (!groupedRecords[record.payrollMonth]) {
      groupedRecords[record.payrollMonth] = [];
    }
    groupedRecords[record.payrollMonth].push(record);
  });

  // Sort grouped records by date descending
  Object.keys(groupedRecords).forEach(month => {
    groupedRecords[month].sort((a, b) => b.date.localeCompare(a.date));
  });

  // Toggle group collapse
  const toggleMonthCollapse = (month: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  // Calculate totals for a group of records
  const getGroupTotals = (groupRecords: ExtraHoursRecord[]) => {
    let totalNormalHours = 0;
    let totalFestiveHours = 0;
    let totalMoney = 0;
    let totalRetens = 0;
    let totalDietas = 0;
    let totalReclutas = 0;

    groupRecords.forEach(r => {
      const breakdown = calculateRecordBreakdown(r, rates);
      totalNormalHours += r.hoursNormal;
      totalFestiveHours += r.hoursFestive;
      totalMoney += breakdown.total;
      if (r.hasReten) totalRetens++;
      if (r.hasMediaDieta) totalDietas++;
      if (r.hasReclutamiento) totalReclutas++;
    });

    return {
      normalHours: totalNormalHours,
      festiveHours: totalFestiveHours,
      money: totalMoney,
      retens: totalRetens,
      dietas: totalDietas,
      reclutas: totalReclutas,
    };
  };

  // Export to Spanish Excel CSV
  const handleExportCSV = () => {
    if (records.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }

    const headers = [
      "Fecha",
      "Dia de la semana",
      "Semana del Ano",
      "Periodo Nomina",
      "Horas Extras Normales",
      "Precio Hora Normal",
      "Importe Horas Normales",
      "Horas Extras Festivas",
      "Precio Hora Festiva",
      "Importe Horas Festivas",
      "Reten",
      "Importe Reten",
      "Media Dieta",
      "Importe Media Dieta",
      "Reclutamiento",
      "Importe Reclutamiento",
      "Importe Total",
      "Observaciones"
    ];

    const rows = records.map(r => {
      const breakdown = calculateRecordBreakdown(r, rates);
      const isWknd = isWeekend(r.date);
      const dayName = new Date(r.date).toLocaleDateString("es-ES", { weekday: "long" });
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      
      return [
        r.date,
        capitalizedDay,
        r.weekNumber,
        formatPayrollMonth(r.payrollMonth),
        r.hoursNormal,
        rates.hoursNormal.toFixed(2),
        breakdown.hoursNormalAmount.toFixed(2),
        r.hoursFestive,
        rates.hoursFestive.toFixed(2),
        breakdown.hoursFestiveAmount.toFixed(2),
        r.hasReten ? (isWknd ? "SI (Finde)" : "SI (Diario)") : "NO",
        breakdown.retenAmount.toFixed(2),
        r.hasMediaDieta ? "SI" : "NO",
        breakdown.mediaDietaAmount.toFixed(2),
        r.hasReclutamiento ? "SI" : "NO",
        breakdown.reclutamientoAmount.toFixed(2),
        breakdown.total.toFixed(2),
        r.notes || ""
      ];
    });

    // Use semicolon for Spanish Excel compatibility, and prefix with UTF-8 BOM
    const csvContent = "\uFEFF" + 
      [headers.join(";"), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Registro_Horas_Extras_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar permanentemente este registro del historial?")) {
      onDeleteRecord(id);
    }
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      onUpdateRecord({
        ...editingRecord,
        payrollMonth: getPayrollMonth(editingRecord.date),
        weekNumber: getWeekNumber(editingRecord.date),
      });
      setEditingRecord(null);
    }
  };

  return (
    <div id="history-section" className="space-y-6">
      
      {/* Search and Filters panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          
          {/* Filter by Month */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm cursor-pointer appearance-none"
            >
              <option value="all">📅 Todos los períodos</option>
              {payrollMonths.map(month => (
                <option key={month} value={month}>
                  {formatPayrollMonth(month)}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por notas o fecha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

        </div>

        {/* Export Button */}
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          <span>Exportar a Excel (CSV)</span>
        </button>
      </div>

      {/* Empty State */}
      {records.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <FileText className="w-16 h-16 text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">Historial de Partes Vacío</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            Aún no has registrado ningún parte de horas. Sube una captura en la sección de "Escáner" para empezar.
          </p>
        </div>
      )}

      {/* Grouped Records List */}
      {records.length > 0 && filteredRecords.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          Ningún registro coincide con los filtros seleccionados.
        </div>
      )}

      {Object.keys(groupedRecords).sort().reverse().map(monthKey => {
        const groupRecs = groupedRecords[monthKey];
        const totals = getGroupTotals(groupRecs);
        const isCollapsed = !!collapsedMonths[monthKey];

        return (
          <div key={monthKey} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Header of Month group */}
            <div 
              onClick={() => toggleMonthCollapse(monthKey)}
              className="flex items-center justify-between p-4 sm:p-5 bg-slate-950/50 border-b border-slate-800/80 cursor-pointer hover:bg-slate-950 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-200">
                    {formatPayrollMonth(monthKey)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {groupRecs.length} {groupRecs.length === 1 ? "registro" : "registros"} en este período
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium">Subtotal Estimado</div>
                  <div className="text-sm sm:text-base font-bold text-emerald-400">
                    {formatCurrency(totals.money)}
                  </div>
                </div>
                {isCollapsed ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
              </div>
            </div>

            {/* Quick summary strip */}
            {!isCollapsed && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 px-5 py-3 bg-slate-950/20 border-b border-slate-800 text-[11px] text-slate-400 font-medium text-center">
                <div>Normales: <span className="text-slate-200 font-bold">{totals.normalHours}h</span></div>
                <div>Festivas: <span className="text-emerald-400 font-bold">{totals.festiveHours}h</span></div>
                <div>Retenes: <span className="text-orange-400 font-bold">{totals.retens}</span></div>
                <div>Medias Dietas: <span className="text-yellow-500 font-bold">{totals.dietas}</span></div>
                <div>Reclutamientos: <span className="text-blue-400 font-bold">{totals.reclutas}</span></div>
              </div>
            )}

            {/* Records list inside month group */}
            {!isCollapsed && (
              <div className="divide-y divide-slate-800">
                {groupRecs.map(record => {
                  const breakdown = calculateRecordBreakdown(record, rates);
                  const isWknd = isWeekend(record.date);

                  return (
                    <div key={record.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/10 transition-colors">
                      {/* Left: date & details */}
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-slate-200">
                            {formatDateLabel(record.date)}
                          </span>
                          <span className="bg-slate-850 border border-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Semana {record.weekNumber}
                          </span>
                        </div>

                        {/* Badges of variables */}
                        <div className="flex flex-wrap gap-1.5">
                          {record.hoursNormal > 0 && (
                            <span className="inline-flex items-center gap-1 bg-slate-950 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3 text-slate-500" /> Normales: {record.hoursNormal}h
                            </span>
                          )}
                          {record.hoursFestive > 0 && (
                            <span className="inline-flex items-center gap-1 bg-emerald-950/30 border border-emerald-900/30 text-emerald-300 text-[10px] px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3 text-emerald-400" /> Festivas: {record.hoursFestive}h
                            </span>
                          )}
                          {record.hasReten && (
                            <span className="inline-flex items-center gap-1 bg-orange-950/30 border border-orange-900/30 text-orange-300 text-[10px] px-2 py-0.5 rounded-md">
                              <ShieldAlert className="w-3 h-3 text-orange-400" /> Retén {isWknd ? "(Finde)" : "(L-V)"}
                            </span>
                          )}
                          {record.hasMediaDieta && (
                            <span className="inline-flex items-center gap-1 bg-yellow-950/30 border border-yellow-900/30 text-yellow-300 text-[10px] px-2 py-0.5 rounded-md">
                              <Coffee className="w-3 h-3 text-yellow-500" /> Media Dieta
                            </span>
                          )}
                          {record.hasReclutamiento && (
                            <span className="inline-flex items-center gap-1 bg-blue-950/30 border border-blue-900/30 text-blue-300 text-[10px] px-2 py-0.5 rounded-md">
                              <Award className="w-3 h-3 text-blue-400" /> Reclutamiento
                            </span>
                          )}
                        </div>

                        {record.notes && (
                          <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/50 max-w-2xl">
                            "{record.notes}"
                          </p>
                        )}
                      </div>

                      {/* Right: money & action buttons */}
                      <div className="flex items-center justify-between md:justify-end gap-4 border-t border-slate-800/50 md:border-t-0 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <div className="text-[10px] text-slate-500 uppercase font-medium">Importe Calculado</div>
                          <div className="text-base sm:text-lg font-bold text-emerald-400">
                            {formatCurrency(breakdown.total)}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {/* View report Capture */}
                          {record.imageUrl && (
                            <button
                              onClick={() => setActiveImage(record.imageUrl || null)}
                              title="Ver Captura del Parte"
                              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit record */}
                          <button
                            onClick={() => setEditingRecord(record)}
                            title="Editar Datos"
                            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-blue-400 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete record */}
                          <button
                            onClick={() => handleDeleteClick(record.id)}
                            title="Eliminar Registro"
                            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Lightbox Modal: View Original Screenshot */}
      {activeImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveImage(null)}
        >
          <div className="absolute top-4 right-4 flex space-x-3">
            <button
              onClick={() => setActiveImage(null)}
              className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div 
            className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-xl bg-slate-950/50 p-2 border border-slate-800 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage}
              alt="Parte de Horas Original"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-slate-400 text-xs mt-3 select-none">
            Haz clic fuera de la imagen para cerrar el visor de captura.
          </p>
        </div>
      )}

      {/* Editing Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setEditingRecord(null)}
              className="absolute top-4 right-4 p-1 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base sm:text-lg font-bold text-slate-100 border-b border-slate-800 pb-3 mb-5">
              Editar Registro de Horas
            </h3>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editingRecord.date}
                  onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">H. Extras Normales</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingRecord.hoursNormal}
                    onChange={(e) => setEditingRecord({ ...editingRecord, hoursNormal: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">H. Extras Festivas</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingRecord.hoursFestive}
                    onChange={(e) => setEditingRecord({ ...editingRecord, hoursFestive: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="bg-slate-950 border border-slate-800/50 rounded-xl p-3 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Variables</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRecord.hasReten}
                      onChange={(e) => setEditingRecord({ ...editingRecord, hasReten: e.target.checked })}
                      className="rounded text-emerald-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-xs text-slate-300">Retén</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRecord.hasMediaDieta}
                      onChange={(e) => setEditingRecord({ ...editingRecord, hasMediaDieta: e.target.checked })}
                      className="rounded text-emerald-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-xs text-slate-300">Media Dieta</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRecord.hasReclutamiento}
                      onChange={(e) => setEditingRecord({ ...editingRecord, hasReclutamiento: e.target.checked })}
                      className="rounded text-emerald-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-xs text-slate-300">Reclutamiento</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  value={editingRecord.notes || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
