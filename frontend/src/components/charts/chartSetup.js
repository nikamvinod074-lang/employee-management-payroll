import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Legend, Tooltip);

export const CHART_COLORS = ["#12203A", "#C9972E", "#2E6FC9", "#1E8E63", "#D64545", "#8393AE"];

export const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { font: { family: "Inter", size: 11.5 }, boxWidth: 10, usePointStyle: true } },
    tooltip: { titleFont: { family: "Inter" }, bodyFont: { family: "Inter" } },
  },
  scales: {
    x: { ticks: { font: { family: "IBM Plex Mono", size: 10.5 } }, grid: { display: false } },
    y: { ticks: { font: { family: "IBM Plex Mono", size: 10.5 } }, grid: { color: "#EEF0F3" } },
  },
};
