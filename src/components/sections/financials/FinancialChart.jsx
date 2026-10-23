import React from 'react';
import { financialMoney } from '@/lib/financialHistory';

export default function FinancialChart({ data }) {
  const maximum = Math.max(
    1,
    ...data.flatMap((row) => [row.totalGrossIncome, row.totalExpenditure]),
  );
  return (
    <figure className="about-financial-chart" aria-labelledby="finance-chart-title">
      <figcaption id="finance-chart-title">
        <h2>Income & expenditure</h2>
        <span>
          <i className="income" /> Income <i className="expenditure" /> Expenditure
        </span>
      </figcaption>
      <div className="about-financial-bars">
        {data.map((row) => (
          <div key={row.yearEndDate} className="about-financial-year">
            <span>{row.yearEndDate.slice(0, 4)}</span>
            <div>
              {[
                ['income', row.totalGrossIncome],
                ['expenditure', row.totalExpenditure],
              ].map(([kind, value]) => (
                <div
                  key={kind}
                  className="about-financial-track"
                  title={`${kind === 'income' ? 'Income' : 'Expenditure'}: ${financialMoney(value)}`}
                >
                  <span className={kind} style={{ width: `${(value / maximum) * 100}%` }} />
                  <span className="sr-only">
                    {kind}: {financialMoney(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p>Year ending 31 March · Exact figures below</p>
    </figure>
  );
}
