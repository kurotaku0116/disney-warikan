'use client';

import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { formatYen } from '@/lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export function CategoryPieChart({ dataMap }: { dataMap: Record<string, number> }) {
  const labels = Object.keys(dataMap);
  const values = Object.values(dataMap);

  return (
    <Pie
      data={{
        labels,
        datasets: [
          {
            data: values,
          },
        ],
      }}
      options={{
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${formatYen(Number(context.raw))}`,
            },
          },
        },
      }}
    />
  );
}

export function MemberBarChart({
  labels,
  paid,
  owed,
}: {
  labels: string[];
  paid: number[];
  owed: number[];
}) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: '支払額',
            data: paid,
          },
          {
            label: '負担額',
            data: owed,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${formatYen(Number(context.raw))}`,
            },
          },
        },
      }}
    />
  );
}
