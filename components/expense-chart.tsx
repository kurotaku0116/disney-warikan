"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

type Expense = {
  category: string;
  amount: number;
};

export default function ExpenseChart({
  expenses,
}: {
  expenses: Expense[];
}) {
  const categoryTotals: Record<string, number> = {};

  expenses.forEach((e) => {
    categoryTotals[e.category] =
      (categoryTotals[e.category] || 0) + e.amount;
  });

  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  if (labels.length === 0) {
    return <p className="text-gray-500">まだグラフ用の支出がありません</p>;
  }

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: ["#7dd3fc", "#a3e635", "#38bdf8", "#bef264"],
        borderWidth: 1,
      },
    ],
  };

  return <Pie data={data} />;
}