import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Dot } from 'recharts';
import { motion } from 'framer-motion';

const FinancialChart = ({ data }) => {
  const chartData = data.map(item => ({
    year: new Date(item.yearEndDate).getFullYear().toString(),
    income: item.totalGrossIncome,
    expenditure: item.totalExpenditure,
  }));

  const formatCurrency = (value) => `£${value.toLocaleString()}`;

  const incomeColor = 'hsl(var(--chart-3))';
  const expenditureColor = 'hsl(var(--chart-2))';

  const CustomDot = (props) => {
    const { cx, cy, stroke, payload, value, color } = props;
    if (payload && value !== undefined) {
      return <Dot cx={cx} cy={cy} r={5} fill={color} stroke={color} strokeWidth={1} />;
    }
    return null;
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full h-[400px] md:h-[500px] bg-gray-50 dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 20,
            left: 50, 
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" />
          <YAxis 
            tickFormatter={formatCurrency} 
            stroke="hsl(var(--muted-foreground))"
            width={80}
          />
          <Tooltip
            formatter={(value, name) => [formatCurrency(value), name.charAt(0).toUpperCase() + name.slice(1)]}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--foreground))'
            }}
            cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
          <Line 
            type="monotone" 
            dataKey="income" 
            name="Total Income" 
            stroke={incomeColor} 
            strokeWidth={3}
            dot={<CustomDot color={incomeColor} />}
            activeDot={{ r: 7, strokeWidth: 0, fill: incomeColor }}
          />
          <Line 
            type="monotone" 
            dataKey="expenditure" 
            name="Total Expenditure" 
            stroke={expenditureColor} 
            strokeWidth={3}
            dot={<CustomDot color={expenditureColor} />}
            activeDot={{ r: 7, strokeWidth: 0, fill: expenditureColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default FinancialChart;