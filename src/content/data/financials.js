/**
 * ============================================================
 *  FINANCIAL DATA  —  src/content/data/financials.js
 * ============================================================
 *  Add a new row each year. Format: DD/MM/YYYY, amounts as £k strings.
 *  The chart and summary cards on /financial-history read from here.
 * ============================================================
 */

export const FINANCIAL_RECORDS = [
  { yearEndDate: '31/03/2020', totalGrossIncome: '218.59k', totalExpenditure: '239.82k' },
  { yearEndDate: '31/03/2021', totalGrossIncome: '199.44k', totalExpenditure: '148.80k' },
  { yearEndDate: '31/03/2022', totalGrossIncome: '330.34k', totalExpenditure: '210.01k' },
  { yearEndDate: '31/03/2023', totalGrossIncome: '371.94k', totalExpenditure: '238.75k' },
  { yearEndDate: '31/03/2024', totalGrossIncome: '545.03k', totalExpenditure: '241.52k' },
  // Add next year here ↓
  // { yearEndDate: '31/03/2025', totalGrossIncome: '???k',    totalExpenditure: '???k' },
];
