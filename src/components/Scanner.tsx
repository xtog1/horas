import React, { useState, useRef } from "react";
import { ExtraHoursRecord, Rates, calculateRecordBreakdown, formatCurrency, getPayrollMonth, getWeekNumber, isWeekend } from "../types";
import { Upload, Sparkles, AlertCircle, FileText, Calendar, Clock, ShieldAlert, Award, Coffee, Save, RefreshCw, CheckCircle } from "lucide-react";

interface ScannerProps {
  rates: Rates;
  onSaveRecord: (record: Omit<ExtraHoursRecord, "id" | "createdAt"> & { id?: string }) => void;
}

export default function Scanner({ rates, onSaveRecord }: ScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Extracted/editable state
  const [extractedData, setExtractedData] = useState<{
    date: string;
    hoursNormal: number;
    hoursFestive: number;
    hasReten: boolean;
    hasMediaDieta: boolean;
    hasReclutamiento: boolean;
    notes: string;
  } | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setScanError(null);
    setExtractedData(null);
    setIsSaved(false);

    // Validate type
    if (!file.type.startsWith("image/")) {
      setScanError("Por favor, selecciona únicamente un archivo de imagen (PNG, JPG, JPEG o captura).");
      return;
    }

    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      // Automatically trigger scan once image is loaded
      triggerOCR(reader.result as string, file.type);
    };
    reader.onerror = () => {
      setScanError("Error al leer el archivo de imagen.");
    };
    reader.readAsDataURL(file);
  };

  const triggerOCR = async (base64Image: string, type: string) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch("/api/parse-parte", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
          mimeType: type,
        }),
      });

      let resData: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        resData = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          response.status === 504 || response.status === 502
            ? "El servidor de Inteligencia Artificial tardó demasiado en responder (Tiempo de espera agotado). Por favor, reintenta en unos instantes o añade el registro de horas de forma manual."
            : `Error del servidor (${response.status}): ${text.slice(0, 100) || "No JSON response received."}`
        );
      }

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || resData.details || "Error desconocido al procesar el parte.");
      }

      const data = resData.data;
      setExtractedData({
        date: data.date || new Date().toISOString().split("T")[0],
        hoursNormal: typeof data.hoursNormal === "number" ? data.hoursNormal : 0,
        hoursFestive: typeof data.hoursFestive === "number" ? data.hoursFestive : 0,
        hasReten: !!data.hasReten,
        hasMediaDieta: !!data.hasMediaDieta,
        hasReclutamiento: !!data.hasReclutamiento,
        notes: data.notes || "",
      });
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || "No se pudo conectar con el servidor de Inteligencia Artificial.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Live calculations for the editable form
  const getLiveCalculations = () => {
    if (!extractedData) return null;
    
    // Construct mock record
    const mockRecord: ExtraHoursRecord = {
      id: "temp",
      date: extractedData.date,
      hoursNormal: extractedData.hoursNormal,
      hoursFestive: extractedData.hoursFestive,
      hasReten: extractedData.hasReten,
      hasMediaDieta: extractedData.hasMediaDieta,
      hasReclutamiento: extractedData.hasReclutamiento,
      payrollMonth: getPayrollMonth(extractedData.date),
      weekNumber: getWeekNumber(extractedData.date),
      createdAt: "",
    };

    return {
      breakdown: calculateRecordBreakdown(mockRecord, rates),
      payrollMonth: getPayrollMonth(extractedData.date),
      weekNo: getWeekNumber(extractedData.date),
      isWknd: isWeekend(extractedData.date),
    };
  };

  const liveCalcs = getLiveCalculations();

  const handleSave = () => {
    if (!extractedData) return;

    onSaveRecord({
      date: extractedData.date,
      hoursNormal: extractedData.hoursNormal,
      hoursFestive: extractedData.hoursFestive,
      hasReten: extractedData.hasReten,
      hasMediaDieta: extractedData.hasMediaDieta,
      hasReclutamiento: extractedData.hasReclutamiento,
      notes: extractedData.notes,
      imageUrl: image || undefined,
      payrollMonth: getPayrollMonth(extractedData.date),
      weekNumber: getWeekNumber(extractedData.date),
    });

    setIsSaved(true);
    // Reset scanner after short delay
    setTimeout(() => {
      setImage(null);
      setMimeType(null);
      setExtractedData(null);
      setIsSaved(false);
    }, 2000);
  };

  return (
    <div id="scanner-section" className="max-w-4xl mx-auto space-y-6">
      
      {/* Dynamic Header with Manual Entry Option */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Registro de Partes de Trabajo
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sube una captura de pantalla de tu parte para que la IA extraiga los datos, o regístralo manualmente en segundos.
          </p>
        </div>
        <button
          onClick={() => {
            setExtractedData({
              date: new Date().toISOString().split("T")[0],
              hoursNormal: 0,
              hoursFestive: 0,
              hasReten: false,
              hasMediaDieta: false,
              hasReclutamiento: false,
              notes: image ? "Registro manual con captura" : "Registro manual",
            });
            // Preserve the uploaded image (do not clear image and mimeType)
            setScanError(null);
            setIsSaved(false);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-emerald-500/20 active:scale-[0.98]"
        >
          <FileText className="w-4 h-4" />
          Añadir Registro Manual
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Image Upload & Preview */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[350px]">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Captura del Parte</h3>
            
            {!image ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950 rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 group"
              >
                <div className="p-4 bg-slate-900 rounded-full text-slate-400 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300 mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  Arrastra tu captura o haz clic para subir
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
                  Soporta imágenes de partes de horas enviados por WhatsApp o email
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                  <img
                    src={image}
                    alt="Parte de horas"
                    className="max-h-[220px] object-contain"
                    referrerPolicy="no-referrer"
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-400">
                      <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-emerald-400 rounded-full animate-spin"></div>
                        <Sparkles className="absolute inset-0 m-auto w-6 h-6 animate-pulse" />
                      </div>
                      <span className="text-sm font-semibold tracking-wider animate-pulse">
                        ESCANEANDO PARTE...
                      </span>
                      <span className="text-xs text-slate-400 mt-1.5 px-6 text-center">
                        Gemini AI está extrayendo horas, fechas y variables
                      </span>
                    </div>
                  )}
                </div>
                
                {!isScanning && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-xs text-center text-slate-400 hover:text-emerald-400 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Subir otra imagen</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Extracted Data / Editor */}
        <div className="lg:col-span-7">
          {isScanning && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center h-full text-center min-h-[350px]">
              <Sparkles className="w-10 h-10 text-emerald-400 animate-bounce mb-4" />
              <h4 className="text-slate-200 font-semibold mb-2">Lectura Inteligente Activa</h4>
              <p className="text-sm text-slate-400 max-w-sm">
                Procesando la captura con el motor Gemini. En unos instantes verás aquí el desglose matemático automatizado para que lo confirmes.
              </p>
            </div>
          )}

          {!isScanning && !extractedData && !scanError && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center h-full text-center min-h-[350px]">
              <FileText className="w-12 h-12 text-slate-600 mb-4" />
              <h4 className="text-slate-300 font-semibold mb-2">Esperando archivo</h4>
              <p className="text-sm text-slate-500 max-w-sm">
                Sube la captura de pantalla de tu parte de trabajo en la columna izquierda para iniciar la extracción automatizada de horas extras y variables.
              </p>
            </div>
          )}

          {scanError && (
            <div className="bg-slate-900 border border-red-950/40 rounded-2xl p-6 flex flex-col items-center justify-center h-full text-center min-h-[350px] space-y-5">
              <div className="p-3 bg-rose-500/10 rounded-full text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-slate-200 font-semibold text-base">
                  {scanError.includes("503") || scanError.includes("demand") || scanError.includes("UNAVAILABLE")
                    ? "Servicio Saturado Temporalmente"
                    : "No se pudo procesar la imagen"}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  {scanError.includes("503") || scanError.includes("demand") || scanError.includes("UNAVAILABLE")
                    ? "La Inteligencia Artificial de Google (Gemini) está experimentando un volumen de solicitudes excepcionalmente alto en este momento. Hemos implementado reintentos automáticos en el servidor, pero la saturación persiste temporalmente."
                    : scanError}
                </p>
                <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-xl max-w-md mx-auto">
                  <p className="text-xs text-emerald-400 font-medium">
                    💡 Consejo: Puedes añadir este registro manualmente pulsando el botón <span className="underline font-bold">"Añadir Registro Manual"</span> en la parte superior derecha de la aplicación. ¡No perderás tu progreso!
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-md justify-center pt-2">
                {image && mimeType && (
                  <button
                    onClick={() => triggerOCR(image, mimeType)}
                    className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/30"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reintentar Escaneo
                  </button>
                )}
                <button
                  onClick={() => {
                    setExtractedData({
                      date: new Date().toISOString().split("T")[0],
                      hoursNormal: 0,
                      hoursFestive: 0,
                      hasReten: false,
                      hasMediaDieta: false,
                      hasReclutamiento: false,
                      notes: "Registro manual tras error de escaneo",
                    });
                    setScanError(null);
                    setIsSaved(false);
                  }}
                  className="flex-1 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-emerald-500/20 flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Rellenar Manualmente (Mantener Imagen)
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all cursor-pointer border border-slate-700/50 flex items-center justify-center gap-1.5"
                >
                  Subir otra
                </button>
              </div>
            </div>
          )}

          {/* Extracted Form Editor */}
          {!isScanning && extractedData && liveCalcs && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              
              {/* Header & Payroll info */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Confirmar Datos Extraídos
                  </h3>
                  <p className="text-xs text-slate-400">Revisa y ajusta los valores antes de guardar</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-right">
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Período de Nómina</div>
                  <div className="text-xs text-emerald-400 font-bold">
                    {liveCalcs.payrollMonth.split("-")[1]}/{liveCalcs.payrollMonth.split("-")[0]} (Semana {liveCalcs.weekNo})
                  </div>
                </div>
              </div>

              {isSaved ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center py-12 space-y-3">
                  <CheckCircle className="w-12 h-12 text-emerald-400 animate-scale-up" />
                  <h4 className="text-emerald-400 font-bold text-lg">¡Guardado con éxito!</h4>
                  <p className="text-sm text-slate-400 max-w-sm">
                    El registro ha sido incorporado a tu historial. Los totales de nómina se han recalculado.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Row 1: Date & Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Fecha */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Fecha del Parte
                      </label>
                      <input
                        type="date"
                        value={extractedData.date}
                        onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                      />
                      {liveCalcs.isWknd && (
                        <p className="text-[10px] text-orange-400 mt-1">⚠️ Fin de semana (aplica retén de fin de semana)</p>
                      )}
                    </div>

                    {/* Horas Extra Normales */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Horas Extra Normales
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={extractedData.hoursNormal}
                          onChange={(e) => setExtractedData({ ...extractedData, hoursNormal: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-slate-500 text-xs font-medium">horas</span>
                      </div>
                    </div>

                    {/* Horas Extra Festivas */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" /> Horas Festivas / Noct.
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={extractedData.hoursFestive}
                          onChange={(e) => setExtractedData({ ...extractedData, hoursFestive: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-slate-500 text-xs font-medium">horas</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Variables checkboxes */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Variables y Pluses Detectados</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Reten */}
                      <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-slate-900 transition-colors">
                        <input
                          type="checkbox"
                          checked={extractedData.hasReten}
                          onChange={(e) => setExtractedData({ ...extractedData, hasReten: e.target.checked })}
                          className="w-4.5 h-4.5 text-emerald-500 rounded-md bg-slate-800 border-slate-700 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                          <ShieldAlert className={`w-4 h-4 ${extractedData.hasReten ? "text-orange-400" : "text-slate-500"}`} />
                          <span>Retén {liveCalcs.isWknd ? "(Finde)" : "(Diario)"}</span>
                        </span>
                      </label>

                      {/* Media Dieta */}
                      <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-slate-900 transition-colors">
                        <input
                          type="checkbox"
                          checked={extractedData.hasMediaDieta}
                          onChange={(e) => setExtractedData({ ...extractedData, hasMediaDieta: e.target.checked })}
                          className="w-4.5 h-4.5 text-emerald-500 rounded-md bg-slate-800 border-slate-700 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                          <Coffee className={`w-4 h-4 ${extractedData.hasMediaDieta ? "text-yellow-500" : "text-slate-500"}`} />
                          <span>Media Dieta</span>
                        </span>
                      </label>

                      {/* Reclutamiento */}
                      <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-slate-900 transition-colors">
                        <input
                          type="checkbox"
                          checked={extractedData.hasReclutamiento}
                          onChange={(e) => setExtractedData({ ...extractedData, hasReclutamiento: e.target.checked })}
                          className="w-4.5 h-4.5 text-emerald-500 rounded-md bg-slate-800 border-slate-700 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                          <Award className={`w-4 h-4 ${extractedData.hasReclutamiento ? "text-blue-400" : "text-slate-500"}`} />
                          <span>Reclutamiento</span>
                        </span>
                      </label>

                    </div>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Observaciones / Notas</label>
                    <textarea
                      rows={2}
                      value={extractedData.notes}
                      onChange={(e) => setExtractedData({ ...extractedData, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm resize-none"
                      placeholder="Añade algún comentario o detalle del parte..."
                    />
                  </div>

                  {/* Financial Live Preview Breakdown */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Desglose Económico Estimado</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
                      
                      <div className="pt-2 md:pt-0">
                        <div className="text-[10px] text-slate-500 font-medium">Horas Normales</div>
                        <div className="text-xs text-slate-400">{extractedData.hoursNormal}h x {rates.hoursNormal}€</div>
                        <div className="text-sm text-slate-200 font-semibold">{formatCurrency(liveCalcs.breakdown.hoursNormalAmount)}</div>
                      </div>

                      <div className="pt-2 md:pt-0">
                        <div className="text-[10px] text-slate-500 font-medium">Horas Festivas</div>
                        <div className="text-xs text-slate-400">{extractedData.hoursFestive}h x {rates.hoursFestive}€</div>
                        <div className="text-sm text-slate-200 font-semibold">{formatCurrency(liveCalcs.breakdown.hoursFestiveAmount)}</div>
                      </div>

                      <div className="pt-2 md:pt-0">
                        <div className="text-[10px] text-slate-500 font-medium">Plus Retén</div>
                        <div className="text-xs text-slate-400">
                          {extractedData.hasReten ? (liveCalcs.isWknd ? "Weekend" : "Daily") : "No"}
                        </div>
                        <div className="text-sm text-slate-200 font-semibold">{formatCurrency(liveCalcs.breakdown.retenAmount)}</div>
                      </div>

                      <div className="pt-2 md:pt-0">
                        <div className="text-[10px] text-slate-500 font-medium">Media Dieta</div>
                        <div className="text-xs text-slate-400">{extractedData.hasMediaDieta ? "1 día" : "No"}</div>
                        <div className="text-sm text-slate-200 font-semibold">{formatCurrency(liveCalcs.breakdown.mediaDietaAmount)}</div>
                      </div>

                      <div className="pt-2 md:pt-0">
                        <div className="text-[10px] text-slate-500 font-medium">Reclutamiento</div>
                        <div className="text-xs text-slate-400">{extractedData.hasReclutamiento ? "1 día" : "No"}</div>
                        <div className="text-sm text-slate-200 font-semibold">{formatCurrency(liveCalcs.breakdown.reclutamientoAmount)}</div>
                      </div>

                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 mt-4 pt-3 text-right">
                      <span className="text-xs text-slate-400">TOTAL ECONÓMICO DEL PARTE:</span>
                      <span className="text-lg font-bold text-emerald-400">
                        {formatCurrency(liveCalcs.breakdown.total)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-800 pt-4 flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setMimeType(null);
                        setExtractedData(null);
                      }}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs sm:text-sm transition-all"
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/15 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar en Historial</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
