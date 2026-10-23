import React from 'react';
import AboutDetails from './AboutDetails';
import FinancialChart from '@/components/sections/financials/FinancialChart';
import { FINANCIAL_RECORDS } from '@/content/data/financials';
import { financialHistory, financialMoney, financialDate } from '@/lib/financialHistory';

const rows = financialHistory(FINANCIAL_RECORDS);
const latest = rows.at(-1);
export default function FinancialSection() {
  return (
    <>
      <div className="about-section-intro">
        <p className="about-eyebrow">Supporting our community</p>
        <h2>Our finances, clearly.</h2>
      </div>
      {latest && (
        <section aria-labelledby="finance-latest-title">
          <p id="finance-latest-title" className="about-eyebrow">
            Latest published year · {financialDate(latest.yearEndDate)}
          </p>
          <dl className="about-financial-totals">
            <div>
              <dt>Income</dt>
              <dd>{financialMoney(latest.totalGrossIncome)}</dd>
            </div>
            <div>
              <dt>Expenditure</dt>
              <dd>{financialMoney(latest.totalExpenditure)}</dd>
            </div>
            <div>
              <dt>Surplus / deficit</dt>
              <dd>{financialMoney(latest.totalGrossIncome - latest.totalExpenditure)}</dd>
            </div>
          </dl>
        </section>
      )}
      <AboutDetails label="Annual figures & chart" anchors={['finances']}>
        <FinancialChart data={rows} />
        <section aria-labelledby="finance-records-title">
          <h3 id="finance-records-title">Annual figures</h3>
          <div className="about-financial-table">
            <table>
              <caption className="sr-only">
                Annual income, expenditure and surplus or deficit in pounds sterling
              </caption>
              <thead>
                <tr>
                  <th scope="col">Year ending</th>
                  <th scope="col">Income</th>
                  <th scope="col">Expenditure</th>
                  <th scope="col">Surplus / deficit</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((row) => (
                  <tr key={row.yearEndDate}>
                    <th scope="row">{financialDate(row.yearEndDate)}</th>
                    <td>{financialMoney(row.totalGrossIncome)}</td>
                    <td>{financialMoney(row.totalExpenditure)}</td>
                    <td>{financialMoney(row.totalGrossIncome - row.totalExpenditure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AboutDetails>
    </>
  );
}
