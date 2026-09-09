/**
 * Financial History page — figures come from src/content/data/financials.js
 * To add a year: edit that file, not this one.
 */
import React from 'react';
import { motion } from 'framer-motion';
import FinancialChart from '@/components/sections/financials/FinancialChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react';
import { FINANCIAL_RECORDS } from '@/content/data/financials';

// ── Parse helpers (keep here — not content) ──────────────────
const parseK = (v) =>
  typeof v === 'string' && v.toLowerCase().includes('k')
    ? parseFloat(v) * 1000
    : parseFloat(v);

const parseDate = (s) => {
  const [d, m, y] = s.split('/');
  return new Date(Number(y), Number(m) - 1, Number(d));
};

const financialData = FINANCIAL_RECORDS
  .map((r) => ({
    yearEndDate:       parseDate(r.yearEndDate).toISOString().split('T')[0],
    totalGrossIncome:  parseK(r.totalGrossIncome),
    totalExpenditure:  parseK(r.totalExpenditure),
  }))
  .sort((a, b) => new Date(a.yearEndDate) - new Date(b.yearEndDate));

const formatGBP = (n) => `£${n.toLocaleString()}`;
const fmtDate = (s) =>
  new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });

export default function FinancialHistoryPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }} className="page-transition container mx-auto px-4 py-8 md:py-12">

      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">Financial History</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          An overview of Jamatia Islamic Centre's income and expenditure over the past years.
        </p>
      </header>

      <section className="mb-12">
        <FinancialChart data={financialData} />
      </section>

      <section>
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-white mb-8 text-center">Annual Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {financialData.map((item, i) => {
            const net = item.totalGrossIncome - item.totalExpenditure;
            return (
              <motion.div key={item.yearEndDate} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 + 0.3 }}>
                <Card className="h-full shadow-lg hover:shadow-xl transition-shadow bg-white dark:bg-gray-800">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl text-primary">Year Ending {new Date(item.yearEndDate).getFullYear()}</CardTitle>
                      <CalendarDays className="h-6 w-6 text-gray-400" />
                    </div>
                    <CardDescription>{fmtDate(item.yearEndDate)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
                      <div className="flex items-center"><TrendingUp className="h-5 w-5 text-green-600 mr-2" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Income:</span></div>
                      <span className="font-semibold text-green-700 dark:text-green-300">{formatGBP(item.totalGrossIncome)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/30 rounded-md">
                      <div className="flex items-center"><TrendingDown className="h-5 w-5 text-red-600 mr-2" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Expenditure:</span></div>
                      <span className="font-semibold text-red-700 dark:text-red-300">{formatGBP(item.totalExpenditure)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                      <div className="flex items-center"><DollarSign className="h-5 w-5 text-blue-600 mr-2" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Net Balance:</span></div>
                      <span className={`font-semibold ${net >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>{formatGBP(net)}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}
