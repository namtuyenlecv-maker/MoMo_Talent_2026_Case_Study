const COLORS = {
  momo: "#A50064",
  pinkPlus: "#F95396",
  pink: "#FF9DBE",
  pinkSoft: "#FEC8DC",
  pinkBg: "#FFEFF4",
  ink: "#202024",
  muted: "#6F6F78",
  line: "#E7E2E5",
  green: "#2EAD6B",
  amber: "#F59E0B",
  red: "#D92D20",
  blue: "#1C66BB",
  teal: "#19AC9A",
  purple: "#7759D2",
};

const PALETTE = [
  COLORS.momo,
  COLORS.pinkPlus,
  COLORS.pink,
  COLORS.green,
  COLORS.amber,
  COLORS.red,
  COLORS.blue,
  COLORS.teal,
  COLORS.purple,
  COLORS.pinkSoft,
];

const LABELS = {
  onTimeRate: "Tỷ lệ xử lý đúng hạn",
  lateRate: "Tỷ lệ xử lý trễ",
  priority: "Điểm ưu tiên",
  priorityScore: "Điểm ưu tiên xử lý",
  frustration: "Mức độ bức xúc",
  avgFrustration: "Mức độ bức xúc trung bình",
  avgDelay: "Trễ trung bình",
};

Chart.defaults.font.family = 'Inter, "Be Vietnam Pro", "Helvetica Neue", Arial, sans-serif';
Chart.defaults.color = COLORS.muted;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.tooltip.backgroundColor = COLORS.ink;
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

const directLabelPlugin = {
  id: "directLabelPlugin",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      if (dataset.showDataLabels === false) return;
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;

      meta.data.forEach((element, index) => {
        const raw = dataset.data[index];
        const parsed = chart.getDatasetMeta(datasetIndex).controller.getParsed(index);
        const formatter = dataset.dataLabelFormatter || defaultDataLabelFormatter;
        const label = formatter(raw, index, { chart, dataset, parsed });
        if (!label) return;

        ctx.font = dataset.dataLabelFont || "700 10px Inter, Arial, sans-serif";
        ctx.fillStyle = dataset.dataLabelColor || COLORS.ink;

        if (element.constructor.name === "ArcElement") {
          const props = element.getProps(["startAngle", "endAngle", "innerRadius", "outerRadius", "x", "y"], true);
          const angle = (props.startAngle + props.endAngle) / 2;
          const radius = (props.innerRadius + props.outerRadius) / 2;
          ctx.fillStyle = dataset.dataLabelColor || "#fff";
          ctx.fillText(label, props.x + Math.cos(angle) * radius, props.y + Math.sin(angle) * radius);
          return;
        }

        if (element.constructor.name === "PointElement") {
          if (dataset.type === "line" || chart.config.type === "line") {
            const isKeyPoint = index % 2 === 0 || index === meta.data.length - 1;
            if (!isKeyPoint) return;
            ctx.fillText(label, element.x, element.y - 14);
            return;
          }
          if (raw?.showLabel) {
            ctx.fillStyle = raw.labelColor || dataset.dataLabelColor || COLORS.ink;
            ctx.fillText(label, element.x, element.y - (element.options.radius || raw.r || 8) - 10);
          }
          return;
        }

        if (element.constructor.name === "BarElement") {
          const horizontal = chart.options.indexAxis === "y";
          const props = element.getProps(["x", "y", "base", "width", "height"], true);
          if (horizontal) {
            ctx.textAlign = "left";
            ctx.fillText(label, Math.max(props.x, props.base) + 8, props.y);
            ctx.textAlign = "center";
          } else {
            const value = Number(parsed.y || 0);
            const stacked = chart.options.scales?.x?.stacked || chart.options.scales?.y?.stacked;
            if (stacked && value > 0) {
              const middleY = props.y + (props.base - props.y) / 2;
              ctx.fillStyle = dataset.stackLabelColor || "#fff";
              ctx.fillText(label, props.x, middleY);
            } else {
              ctx.fillText(label, props.x, props.y - 10);
            }
          }
        }
      });
    });

    ctx.restore();
  },
};

const priorityZonePlugin = {
  id: "priorityZonePlugin",
  beforeDatasetsDraw(chart) {
    const zone = chart.options.plugins?.priorityZone;
    if (!zone?.enabled) return;
    const { ctx, chartArea, scales } = chart;
    const x = scales.x.getPixelForValue(zone.xStart);
    const y = scales.y.getPixelForValue(zone.yStart);
    ctx.save();
    ctx.fillStyle = zone.fill || "rgba(165, 0, 100, 0.08)";
    ctx.fillRect(x, chartArea.top, chartArea.right - x, y - chartArea.top);
    ctx.strokeStyle = zone.stroke || "rgba(165, 0, 100, 0.24)";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, chartArea.top, chartArea.right - x, y - chartArea.top);
    ctx.setLineDash([]);
    ctx.fillStyle = zone.color || COLORS.momo;
    ctx.font = "800 11px Inter, Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(zone.label || "Vùng cần ưu tiên", chartArea.right - 10, chartArea.top + 16);
    ctx.restore();
  },
};

Chart.register(directLabelPlugin, priorityZonePlugin);

const fmtNum = (value) => new Intl.NumberFormat("vi-VN").format(Number(value || 0));
const fmtShort = (value) => {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return fmtNum(n);
};
const fmtDecimal = (value, digits = 1) => Number(value || 0).toFixed(digits).replace(".", ",");
const fmtPct = (value, digits = 1) => `${fmtDecimal(Number(value || 0) * 100, digits)}%`;
const fmtPainPct = (value, digits = 1) => `${fmtDecimal(Number(value || 0) * 100, digits)}%`;
const fmtMin = (value) => `${fmtNum(Math.round(Number(value || 0)))} phút`;
const fmtScore = (value, digits = 1) => fmtDecimal(value, digits);
const shortLabel = (value, max = 26) => {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function chartOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { position: "bottom" },
      tooltip: {},
    },
    scales: {
      x: { grid: { color: "#F0EDF0" }, border: { display: false } },
      y: { grid: { color: "#F0EDF0" }, border: { display: false } },
    },
    ...extra,
  };
}

function bubbleRadius(value, maxValue, minRadius = 4, maxBoost = 14) {
  return minRadius + Math.sqrt(Number(value || 0) / Math.max(maxValue, 1)) * maxBoost;
}

function defaultDataLabelFormatter(raw, index, context) {
  const value = typeof raw === "object" ? raw?.y : raw;
  if (context.dataset.dataLabelType === "percent") return `${fmtDecimal(value, 0)}%`;
  if (context.dataset.dataLabelType === "score") return fmtShort(value);
  if (context.dataset.dataLabelType === "bubble") return raw?.showLabel ? shortLabel(raw.label, 20) : "";
  return fmtNum(value);
}

function kpiCard(label, value, sub, tone = "") {
  return `
    <article class="kpi-card ${tone}">
      <div class="kpi-label">${escapeHtml(label)}</div>
      <div class="kpi-value">${escapeHtml(value)}</div>
      <div class="kpi-sub">${escapeHtml(sub)}</div>
    </article>
  `;
}

function translateDelayBucket(bucket) {
  const map = {
    "Late <= 1h": "Trễ dưới 1 giờ",
    "Late 1h-4h": "Trễ 1-4 giờ",
    "Late 4h-1d": "Trễ 4 giờ-1 ngày",
    "Late > 1d": "Trễ trên 1 ngày",
  };
  return map[bucket] || bucket;
}

function translateWeekday(day) {
  const map = {
    Monday: "Thứ Hai",
    Tuesday: "Thứ Ba",
    Wednesday: "Thứ Tư",
    Thursday: "Thứ Năm",
    Friday: "Thứ Sáu",
    Saturday: "Thứ Bảy",
    Sunday: "Chủ Nhật",
  };
  return map[day] || day;
}

const WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function normalizeWeekdayRows(rows) {
  const lookup = new Map((rows || []).map((row) => [row.Created_weekday, row]));
  return WEEKDAY_ORDER.map((day) => {
    const row = lookup.get(day) || {};
    return {
      Created_weekday: day,
      Total_ticket: Number(row.Total_ticket || 0),
      Late_ticket: Number(row.Late_ticket || 0),
    };
  });
}

function delayBucketColor(bucket) {
  const map = {
    "Late 4h-1d": COLORS.pink,
    "Late 1h-4h": COLORS.amber,
    "Late > 1d": COLORS.red,
    "Late <= 1h": "#7B0000",
  };
  return map[bucket] || COLORS.pinkSoft;
}

function rankedServiceColor(row, index, total) {
  if (index < 4) return COLORS.momo;
  if (index < 8) return COLORS.amber;
  return COLORS.green;
}

function riskColor(value, thresholds = [0.33, 0.66]) {
  if (value >= thresholds[1]) return COLORS.red;
  if (value >= thresholds[0]) return COLORS.pinkPlus;
  return "#D9D9D9";
}

function renderKpis(data) {
  const services = data.services || [];
  const priorityService = services[0];
  const aiTopic = (data.ai_topics || [])[0];
  const weekly = data.weekly || [];
  const peakWeek = weekly.reduce((best, row) => (row.Total_ticket > (best?.Total_ticket || 0) ? row : best), null);
  const html = [
    kpiCard("Tổng ticket", fmtNum(data.kpi.Total_ticket), "Tổng số yêu cầu trong kỳ phân tích", "accent"),
    kpiCard("Xử lý đúng hạn", fmtPct(data.kpi.SLA_On_Time_Rate), `${fmtNum(data.kpi.On_time_ticket)} ticket được xử lý đúng cam kết`, "good"),
    kpiCard("Ticket xử lý trễ", fmtNum(data.kpi.Late_ticket), `Chiếm ${fmtPct(data.kpi.Late_Rate)} tổng số ticket`, "bad"),
    kpiCard("Thời gian xử lý so với cam kết", `${fmtScore(data.kpi.Avg_sla_ratio, 2)} lần`, `Trễ trung bình ${fmtMin(data.kpi.Avg_delay_minutes)}`, "warn"),
    kpiCard("Ticket trung bình mỗi tuần", fmtNum(Math.round(data.kpi.Avg_ticket_per_week)), `Dựa trên ${weekly.length} tuần dữ liệu`, ""),
    kpiCard("Tuần nhiều ticket nhất", peakWeek?.Created_week || data.kpi.Peak_week || "-", `${fmtNum(peakWeek?.Total_ticket)} ticket`, "accent"),
    kpiCard("Dịch vụ cần ưu tiên xử lý", shortLabel(priorityService?.Level || "-", 22), "Điểm ưu tiên cao nhất", "bad"),
    kpiCard("Vấn đề cần ưu tiên xử lý", "Ứng dụng bị lag hoặc chậm", `Điểm ưu tiên: ${fmtScore(aiTopic?.priority_score_new)}/100`, "warn"),
  ].join("");
  document.querySelector("#kpiGrid").innerHTML = html;
}

function renderWeeklyCharts(data) {
  const weekly = data.weekly || [];
  const labels = weekly.map((row) => row.Created_week);

  new Chart(document.querySelector("#weeklyCombo"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Tổng ticket",
          data: weekly.map((row) => row.Total_ticket),
          backgroundColor: COLORS.pinkSoft,
          borderRadius: 8,
          yAxisID: "y",
          dataLabelFormatter: (value) => fmtNum(value),
        },
        {
          type: "line",
          label: LABELS.onTimeRate,
          data: weekly.map((row) => row.SLA_On_Time_Rate * 100),
          borderColor: COLORS.green,
          backgroundColor: COLORS.green,
          borderWidth: 3,
          pointRadius: 4,
          tension: 0.35,
          yAxisID: "y1",
          dataLabelFormatter: (value) => `${fmtDecimal(value, 0)}%`,
          dataLabelColor: COLORS.green,
        },
        {
          type: "line",
          label: LABELS.lateRate,
          data: weekly.map((row) => row.Late_Rate * 100),
          borderColor: COLORS.red,
          backgroundColor: COLORS.red,
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.35,
          yAxisID: "y1",
          dataLabelFormatter: (value) => `${fmtDecimal(value, 0)}%`,
          dataLabelColor: COLORS.red,
        },
      ],
    },
    options: chartOptions({
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { beginAtZero: true, title: { display: true, text: "Ticket" }, grid: { color: "#F0EDF0" } },
        y1: {
          beginAtZero: true,
          max: 100,
          position: "right",
          title: { display: true, text: "Tỷ lệ %" },
          grid: { drawOnChartArea: false },
        },
      },
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.dataset.yAxisID === "y1" ? `${fmtDecimal(ctx.parsed.y)}%` : fmtNum(ctx.parsed.y)}`,
          },
        },
      },
    }),
  });

  new Chart(document.querySelector("#weeklyStack"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Đúng hạn",
          data: weekly.map((row) => row.On_time_ticket),
          backgroundColor: COLORS.green,
          borderRadius: 6,
          dataLabelFormatter: (value) => (Number(value) > 35 ? fmtNum(value) : ""),
        },
        {
          label: "Ticket xử lý trễ",
          data: weekly.map((row) => row.Late_ticket),
          backgroundColor: COLORS.red,
          borderRadius: 6,
          dataLabelFormatter: (value) => (Number(value) > 35 ? fmtNum(value) : ""),
        },
      ],
    },
    options: chartOptions({
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, grid: { color: "#F0EDF0" } },
      },
    }),
  });

  const weekdaySelect = document.querySelector("#weekdayWeekSelect");
  const weeklyWeekday = data.weekly_weekday || [];
  const weekOptions = [...new Set(weeklyWeekday.map((row) => row.Created_week).filter(Boolean))].sort();
  const getWeekdayRows = (week) => {
    if (week && week !== "all") {
      return normalizeWeekdayRows(weeklyWeekday.filter((row) => row.Created_week === week));
    }
    return normalizeWeekdayRows(data.weekday || []);
  };
  const initialWeekdayRows = getWeekdayRows("all");
  const weekdayChart = new Chart(document.querySelector("#weekdayBar"), {
    type: "bar",
    data: {
      labels: initialWeekdayRows.map((row) => translateWeekday(row.Created_weekday)),
      datasets: [
        {
          label: "Ticket",
          data: initialWeekdayRows.map((row) => row.Total_ticket),
          backgroundColor: COLORS.momo,
          borderRadius: 8,
          dataLabelFormatter: (value) => fmtNum(value),
        },
        {
          label: "Ticket trễ",
          data: initialWeekdayRows.map((row) => row.Late_ticket),
          backgroundColor: "#F2708F",
          borderRadius: 8,
          dataLabelFormatter: (value) => fmtNum(value),
        },
      ],
    },
    options: chartOptions(),
  });

  if (weekdaySelect && weekOptions.length) {
    weekdaySelect.insertAdjacentHTML(
      "beforeend",
      weekOptions.map((week) => `<option value="${escapeHtml(week)}">${escapeHtml(week)}</option>`).join("")
    );
    weekdaySelect.addEventListener("change", () => {
      const rows = getWeekdayRows(weekdaySelect.value);
      weekdayChart.data.labels = rows.map((row) => translateWeekday(row.Created_weekday));
      weekdayChart.data.datasets[0].data = rows.map((row) => row.Total_ticket);
      weekdayChart.data.datasets[1].data = rows.map((row) => row.Late_ticket);
      weekdayChart.update();
    });
  }
}

function renderDelayDonut(data) {
  const buckets = (data.delay_buckets || []).filter((row) => row.Delay_Bucket !== "No delay");
  const totalLate = buckets.reduce((sum, row) => sum + Number(row.Total_ticket || 0), 0) || 1;
  new Chart(document.querySelector("#delayDonut"), {
    type: "doughnut",
    data: {
      labels: buckets.map((row) => translateDelayBucket(row.Delay_Bucket)),
      datasets: [
        {
          data: buckets.map((row) => row.Total_ticket),
          backgroundColor: buckets.map((row) => delayBucketColor(row.Delay_Bucket)),
          borderColor: "#fff",
          borderWidth: 4,
          hoverOffset: 8,
          dataLabelFormatter: (value) => `${fmtDecimal((Number(value || 0) / totalLate) * 100, 0)}%`,
        },
      ],
    },
    options: chartOptions({
      cutout: "62%",
      scales: {},
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${fmtNum(ctx.raw)} ticket`,
          },
        },
      },
    }),
  });
}

function renderServiceCharts(data) {
  const services = [...(data.services || [])];
  const top = services.slice(0, 12);

  new Chart(document.querySelector("#servicePriority"), {
    type: "bar",
    data: {
      labels: top.map((row) => shortLabel(row.Level, 30)),
      datasets: [
        {
          label: LABELS.priorityScore,
          data: top.map((row) => row.Priority_Score),
          backgroundColor: top.map((row, index) => rankedServiceColor(row, index, top.length)),
          borderRadius: 8,
          dataLabelFormatter: (value) => fmtShort(value),
        },
      ],
    },
    options: chartOptions({
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${LABELS.priorityScore}: ${fmtShort(ctx.parsed.x)}`,
          },
        },
      },
    }),
  });

  const maxPriority = Math.max(...services.map((row) => row.Priority_Score), 1);
  const topServiceNames = new Set(services.slice(0, 8).map((row) => row.Level));
  const meanVolume = services.reduce((sum, row) => sum + Number(row.Total_ticket || 0), 0) / Math.max(services.length, 1);
  const meanDelayHours = services.reduce((sum, row) => sum + Number(row.Avg_delay_minutes || 0) / 60, 0) / Math.max(services.length, 1);
  new Chart(document.querySelector("#serviceMatrix"), {
    type: "bubble",
    data: {
      datasets: [
        {
          label: "Dịch vụ",
          data: services.map((row) => ({
            x: row.Total_ticket,
            y: row.Avg_delay_minutes / 60,
            r: bubbleRadius(row.Priority_Score, maxPriority, 4, 12),
            label: row.Level,
            late: row.Late_Rate,
            priority: row.Priority_Score,
            showLabel: topServiceNames.has(row.Level) || (row.Total_ticket >= meanVolume && row.Avg_delay_minutes / 60 >= meanDelayHours),
            labelColor: COLORS.ink,
          })),
          backgroundColor: services.map((row) => (topServiceNames.has(row.Level) ? "rgba(165, 0, 100, 0.68)" : "rgba(243, 217, 232, 0.74)")),
          borderColor: services.map((row) => (topServiceNames.has(row.Level) ? COLORS.momo : COLORS.pinkSoft)),
          borderWidth: 1,
          dataLabelType: "bubble",
          dataLabelFormatter: (raw) => (raw.showLabel ? shortLabel(raw.label, 20) : ""),
        },
      ],
    },
        layout: {
          padding: { top: 12, right: 16, bottom: 12, left: 16 },
        },
    options: chartOptions({
      scales: {
        x: { beginAtZero: true, title: { display: true, text: "Tổng ticket" }, grid: { color: "#F0EDF0" } },
        y: { beginAtZero: true, title: { display: true, text: "Trễ trung bình (giờ)" }, grid: { color: "#F0EDF0" } },
      },
      plugins: {
        legend: { display: false },
        priorityZone: {
          enabled: true,
          xStart: meanVolume,
          yStart: meanDelayHours,
          label: "Vùng cần ưu tiên",
        },
        tooltip: {
          callbacks: {
            title: (items) => items[0].raw.label,
            label: (ctx) => [
              `Ticket: ${fmtNum(ctx.raw.x)}`,
              `Trễ trung bình: ${fmtDecimal(ctx.raw.y)} giờ`,
              `Tỷ lệ xử lý trễ: ${fmtDecimal(ctx.raw.late * 100)}%`,
              `${LABELS.priorityScore}: ${fmtShort(ctx.raw.priority)}`,
            ],
          },
        },
      },
    }),
  });
}

function interpolateColor(rate) {
  const clamped = Math.max(0, Math.min(1, Number(rate || 0)));
  const stops = [
    [0, [217, 45, 32]],
    [0.5, [245, 158, 11]],
    [1, [46, 173, 107]],
  ];
  const start = clamped <= 0.5 ? stops[0] : stops[1];
  const end = clamped <= 0.5 ? stops[1] : stops[2];
  const local = (clamped - start[0]) / (end[0] - start[0]);
  const rgb = start[1].map((channel, index) => Math.round(channel + (end[1][index] - channel) * local));
  return `rgb(${rgb.join(",")})`;
}

function renderHeatmap(data) {
  const weeklyService = data.weekly_service || [];
  const weeks = [...new Set(weeklyService.map((row) => row.Created_week))].sort();
  const services = [...new Set(weeklyService.map((row) => row.Level))];
  const lookup = new Map(weeklyService.map((row) => [`${row.Level}__${row.Created_week}`, row]));
  const heatmap = document.querySelector("#slaHeatmap");
  heatmap.style.setProperty("--weeks", weeks.length);
  const header = `
    <div class="heatmap-row">
      <div class="heatmap-cell header">Dịch vụ</div>
      ${weeks.map((week) => `<div class="heatmap-cell header">${escapeHtml(week)}</div>`).join("")}
    </div>
  `;
  const rows = services
    .map((service) => {
      const cells = weeks
        .map((week) => {
          const row = lookup.get(`${service}__${week}`);
          if (!row) return `<div class="heatmap-cell" style="background:#F6F3F5;color:#AAA">-</div>`;
          const bg = interpolateColor(row.SLA_On_Time_Rate);
          const color = row.SLA_On_Time_Rate < 0.58 ? "#fff" : COLORS.ink;
          return `<div class="heatmap-cell" style="background:${bg};color:${color}" title="${escapeHtml(service)} ${week}">${fmtPct(row.SLA_On_Time_Rate, 0)}</div>`;
        })
        .join("");
      return `
        <div class="heatmap-row">
          <div class="heatmap-cell label">${escapeHtml(shortLabel(service, 30))}</div>
          ${cells}
        </div>
      `;
    })
    .join("");
  heatmap.innerHTML = header + rows;
}

function agentStatus(rate) {
  if (rate >= 0.75) return ["Tốt", "status-good"];
  if (rate >= 0.4) return ["Theo dõi", "status-warn"];
  return ["Cần cải thiện", "status-bad"];
}

function renderAgent(data) {
  const agents = data.agents || [];
  const maxTickets = Math.max(...agents.map((row) => row.Total_ticket), 1);
  const highVolumeThreshold = maxTickets * 0.5;
  new Chart(document.querySelector("#agentBubble"), {
    type: "bubble",
    data: {
      datasets: [
        {
          label: "Nhân viên",
          data: agents.map((row) => ({
            x: row.Total_ticket,
            y: row.SLA_On_Time_Rate * 100,
            r: bubbleRadius(row.Total_ticket, maxTickets),
            label: row.Agent_tiep_nhan,
            late: row.Late_ticket,
            delay: row.Avg_delay_minutes,
            showLabel: row.Total_ticket >= highVolumeThreshold || row.SLA_On_Time_Rate < 0.4,
            labelColor: COLORS.ink,
          })),
          backgroundColor: agents.map((row) => {
            if (row.SLA_On_Time_Rate < 0.4) return "rgba(217,45,32,0.62)";
            if (row.SLA_On_Time_Rate >= 0.75) return "rgba(46,173,107,0.62)";
            return "rgba(249,83,150,0.50)";
          }),
          borderColor: agents.map((row) => {
            if (row.SLA_On_Time_Rate < 0.4) return COLORS.red;
            if (row.SLA_On_Time_Rate >= 0.75) return COLORS.green;
            return COLORS.pinkPlus;
          }),
          borderWidth: 1,
          dataLabelType: "bubble",
          dataLabelFormatter: (raw) => (raw.showLabel ? shortLabel(raw.label, 18) : ""),
        },
      ],
    },
    options: chartOptions({
      layout: {
        padding: { top: 12, right: 16, bottom: 12, left: 16 },
      },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: "Tổng ticket" }, grid: { color: "#F0EDF0" } },
        y: { beginAtZero: true, max: 100, title: { display: true, text: "Tỷ lệ xử lý đúng hạn (%)" }, grid: { color: "#F0EDF0" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0].raw.label,
            label: (ctx) => [
              `Ticket: ${fmtNum(ctx.raw.x)}`,
              `Đúng hạn: ${fmtDecimal(ctx.raw.y)}%`,
              `Ticket trễ: ${fmtNum(ctx.raw.late)}`,
              `Trễ trung bình: ${fmtMin(ctx.raw.delay)}`,
            ],
          },
        },
      },
    }),
  });

  const rows = [...agents]
    .sort((a, b) => b.SLA_On_Time_Rate - a.SLA_On_Time_Rate)
    .map((row, index) => {
      const [label, cls] = agentStatus(row.SLA_On_Time_Rate);
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.Agent_tiep_nhan)}</td>
          <td>${fmtNum(row.Total_ticket)}</td>
          <td>${fmtPct(row.SLA_On_Time_Rate)}</td>
          <td>${fmtNum(row.Late_ticket)}</td>
          <td>${fmtMin(row.Avg_delay_minutes)}</td>
          <td><span class="status-pill ${cls}">${label}</span></td>
        </tr>
      `;
    })
    .join("");
  document.querySelector("#agentTable").innerHTML = `
    <thead>
      <tr>
        <th>#</th><th>Nhân viên</th><th>Ticket</th><th>Đúng hạn</th><th>Trễ</th><th>Trễ trung bình</th><th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  `;
}

function topicColor(group) {
  if (group === "Nhóm rủi ro cao") return COLORS.red;
  if (group === "Nhóm xây dựng") return COLORS.green;
  return "#D9D9D9";
}

function renderAi(data) {
  const topics = [...(data.ai_topics || [])].sort((a, b) => b.priority_score_new - a.priority_score_new);
  new Chart(document.querySelector("#aiPriority"), {
    type: "bar",
    data: {
      labels: topics.map((row) => shortLabel(row.topic_label, 30)),
      datasets: [
        {
          label: LABELS.priority,
          data: topics.map((row) => row.priority_score_new),
          backgroundColor: topics.map((row) => topicColor(row.topic_group)),
          borderRadius: 8,
          dataLabelFormatter: (value) => `${fmtDecimal(value)}/100`,
        },
      ],
    },
    options: chartOptions({
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${LABELS.priority}: ${fmtDecimal(ctx.parsed.x)}/100`,
          },
        },
      },
    }),
  });

  const maxPriority = Math.max(...topics.map((row) => row.priority_score_new), 1);
  const topTopics = new Set(topics.slice(0, 7).map((row) => row.topic_label));
  const meanFeedback = topics.reduce((sum, row) => sum + Number(row.total_feedback || 0), 0) / Math.max(topics.length, 1);
  const meanPainPct =
    (topics.reduce((sum, row) => sum + Number(row.avg_pain_score || 0), 0) / Math.max(topics.length, 1)) * 100;
  new Chart(document.querySelector("#aiMatrix"), {
    type: "bubble",
    data: {
      datasets: [
        {
          label: "Chủ đề phản hồi",
          data: topics.map((row) => ({
            x: row.total_feedback,
            y: Number(row.avg_pain_score || 0) * 100,
            r: bubbleRadius(row.priority_score_new, maxPriority),
            label: row.topic_label,
            group: row.topic_group,
            priority: row.priority_score_new,
            painRaw: row.avg_pain_score,
            showLabel: topTopics.has(row.topic_label) || row.topic_group === "Nhóm rủi ro cao",
            labelColor: COLORS.ink,
          })),
          backgroundColor: topics.map((row) => `${topicColor(row.topic_group)}88`),
          borderColor: topics.map((row) => topicColor(row.topic_group)),
          borderWidth: 1,
          dataLabelType: "bubble",
          dataLabelFormatter: (raw) => (raw.showLabel ? shortLabel(raw.label, 22) : ""),
        },
      ],
    },
    options: chartOptions({
      layout: {
        padding: { top: 12, right: 16, bottom: 12, left: 16 },
      },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: "Tổng phản hồi" }, grid: { color: "#F0EDF0" } },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Chỉ số bức xúc trung bình (%)" },
          grid: { color: "#F0EDF0" },
          ticks: { callback: (value) => `${fmtDecimal(value, 0)}%` },
        },
      },
      plugins: {
        legend: { display: false },
        priorityZone: {
          enabled: true,
          xStart: meanFeedback,
          yStart: meanPainPct,
          label: "Nhiều phản hồi và bức xúc cao",
        },
        tooltip: {
          callbacks: {
            title: (items) => items[0].raw.label,
            label: (ctx) => [
              `Phản hồi: ${fmtNum(ctx.raw.x)}`,
              `Chỉ số bức xúc: ${fmtDecimal(ctx.raw.y, 1)}%`,
              `${LABELS.priority}: ${fmtDecimal(ctx.raw.priority)}/100`,
              ctx.raw.group,
            ],
          },
        },
      },
    }),
  });

  const vocHtml = (data.voc || [])
    .map(
      (row) => `
        <article class="quote-card">
          <strong>${escapeHtml(shortLabel(row.topic_label, 38))} · Mức bức xúc ${fmtPainPct(row.pain_score_new)}</strong>
          <p>"${escapeHtml(shortLabel(row.content_masked, 260))}"</p>
        </article>
      `
    )
    .join("");
  document.querySelector("#vocGrid").innerHTML = vocHtml;
}

function displayClusterTitle(topic) {
  if (topic.includes("Cụm 6")) return "Hiệu năng ứng dụng (Cụm 6: Lag / Chậm / Cải)";
  if (topic.includes("Cụm 0")) return "Quy trình nhắc nợ & liên hệ (Cụm 0: Gọi / Điện / Thoại)";
  if (topic.includes("Cụm 2")) return "Trải nghiệm trò chơi & game (Cụm 2: Trò chơi / Xu / Game)";
  if (topic.includes("Cụm 11")) return "Chương trình tích xu & nhiệm vụ (Cụm 11: Xu / Nhiệm vụ / Tích xu)";
  return topic;
}

function clusterBadge(topic, index) {
  if (topic.includes("Cụm 6")) return ["Ví dụ phản hồi bức xúc nhất", "status-bad"];
  if (topic.includes("Cụm 0")) return ["Ví dụ phản hồi có mức bức xúc cao", "status-warn"];
  if (topic.includes("Cụm 2") || topic.includes("Cụm 11")) return ["Cơ hội phát triển", "status-good"];
  if (index === 0) return ["Ví dụ phản hồi bức xúc nhất", "status-bad"];
  if (index === 1) return ["Ví dụ phản hồi có mức bức xúc cao", "status-warn"];
  return ["Cơ hội phát triển", "status-good"];
}

function renderDeepDive(data) {
  const clusters = data.deep_clusters || [];
  const html = clusters
    .map((cluster, index) => {
      const [title, tone] = clusterBadge(cluster.topic_label, index);
      const painPercent = Math.max(0, Math.min(100, Number(cluster.avg_pain_score || 0) * 100));
      const width = Math.max(4, painPercent);
      const samples = (cluster.quotes || [])
        .slice(0, 2)
        .map((quote) => `<div class="sample">"${escapeHtml(shortLabel(quote.content_masked, 230))}"</div>`)
        .join("");
      return `
        <article class="cluster-card">
          <div class="cluster-top">
            <div>
              <h3>${escapeHtml(displayClusterTitle(cluster.topic_label))}</h3>
              <div class="cluster-meta">${fmtNum(cluster.total_feedback)} phản hồi · chỉ số bức xúc trung bình ${fmtPainPct(cluster.avg_pain_score)}</div>
            </div>
            <span class="status-pill ${tone}">${title}</span>
          </div>
          <div class="pain-bar" aria-label="Thanh mức độ bức xúc">
            <div class="pain-fill" style="width:${width}%"></div>
          </div>
          <div class="sample-grid">${samples}</div>
        </article>
      `;
    })
    .join("");
  document.querySelector("#clusterList").innerHTML = html;
}

function formatGeneratedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "không xác định";
  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const day = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${time}, ${day}`;
}

async function init() {
  try {
    const response = await fetch("Data/dashboard.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Không đọc được Data/dashboard.json (${response.status})`);
    const data = await response.json();
    document.querySelector("#generatedAt").textContent = `Cập nhật: ${formatGeneratedAt(data.generated_at)}`;
    renderKpis(data);
    renderWeeklyCharts(data);
    renderDelayDonut(data);
    renderServiceCharts(data);
    renderHeatmap(data);
    renderAgent(data);
    renderAi(data);
    renderDeepDive(data);
  } catch (error) {
    document.querySelector("#generatedAt").textContent = "Cập nhật: lỗi dữ liệu";
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#FDECEB;color:#A50064;padding:12px 20px;font-weight:800">${escapeHtml(error.message)}</div>`
    );
    console.error(error);
  }
}

window.addEventListener("DOMContentLoaded", init);
