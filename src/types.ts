/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Rates {
  hoursNormal: number;
  hoursFestive: number;
  retenNormal: number;
  retenWeekend: number;
  mediaDieta: number;
  reclutamiento: number;
}

export const DEFAULT_RATES: Rates = {
  hoursNormal: 19.62,
  hoursFestive: 24.58,
  retenNormal: 18.54,
  retenWeekend: 37.08,
  mediaDieta: 24.02,
  reclutamiento: 77.17,
};

export interface ExtraHoursRecord {
  id: string;
  date: string; // ISO format: YYYY-MM-DD
  hoursNormal: number;
  hoursFestive: number;
  hasReten: boolean;
  hasMediaDieta: boolean;
  hasReclutamiento: boolean;
  imageUrl?: string; // Base64 representation of work report screenshot
  notes?: string;
  payrollMonth: string; // E.g., "2026-06" (Nómina Junio 2026)
  weekNumber: number; // Week number of the year
  createdAt: string; // ISO timestamp
}

export interface CalculatedBreakdown {
  hoursNormalAmount: number;
  hoursFestiveAmount: number;
  retenAmount: number;
  mediaDietaAmount: number;
  reclutamientoAmount: number;
  total: number;
}

// Helper to calculate the week of the year
export function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 1;
  
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  
  // Get first day of year
  const yearStart = new Date(d.getFullYear(), 0, 1);
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

// Helper to determine the payroll month
// Payroll period is 16th of previous month to 15th of current month
// E.g., May 16 to Jun 15 belongs to "2026-06" (Nómina Junio 2026)
export function getPayrollMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  const day = d.getDate();
  
  let targetYear = year;
  let targetMonth = month;
  
  if (day >= 16) {
    // Falls into the NEXT month's payroll
    targetMonth = month + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear = year + 1;
    }
  }
  
  // Format as YYYY-MM
  const monthStr = String(targetMonth + 1).padStart(2, "0");
  return `${targetYear}-${monthStr}`;
}

// Format the payroll month into a readable Spanish label
// E.g., "2026-06" -> "Nómina Junio 2026"
export function formatPayrollMonth(payrollStr: string): string {
  if (!payrollStr || !payrollStr.includes("-")) return payrollStr;
  
  const [yearStr, monthStr] = payrollStr.split("-");
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthName = monthNames[monthIndex] || monthStr;
  
  return `Nómina ${monthName} ${yearStr}`;
}

// Check if a date falls on a weekend
export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

// Calculate earnings breakdown for a single record
export function calculateRecordBreakdown(record: ExtraHoursRecord, rates: Rates): CalculatedBreakdown {
  const hoursNormalAmount = record.hoursNormal * rates.hoursNormal;
  const hoursFestiveAmount = record.hoursFestive * rates.hoursFestive;
  
  let retenAmount = 0;
  if (record.hasReten) {
    const isWknd = isWeekend(record.date);
    retenAmount = isWknd ? rates.retenWeekend : rates.retenNormal;
  }
  
  const mediaDietaAmount = record.hasMediaDieta ? rates.mediaDieta : 0;
  const reclutamientoAmount = record.hasReclutamiento ? rates.reclutamiento : 0;
  
  const total = hoursNormalAmount + hoursFestiveAmount + retenAmount + mediaDietaAmount + reclutamientoAmount;
  
  return {
    hoursNormalAmount,
    hoursFestiveAmount,
    retenAmount,
    mediaDietaAmount,
    reclutamientoAmount,
    total,
  };
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// Format date to readable Spanish string
export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  // Capitalize first letter
  const formatted = d.toLocaleDateString("es-ES", options);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
