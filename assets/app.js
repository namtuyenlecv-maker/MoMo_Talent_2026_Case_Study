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

Chart.defaults.font.family = 'Inter, "Be Vietnam Pro", "Helvetica Neue", Arial, sans-serif';
Chart.defaults.color = COLORS.muted;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.tooltip.backgroundColor = COLORS.ink;
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

const fmtNum = (value) => new Intl.NumberFormat("vi-VN").format(Number(value || 0));
const fmtShort = (value) => {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return fmtNum(n);
};
const fmtPct = (value, digits = 1) => `${(Number(value || 0) * 100).toFixed(digits)}%`;
const fmtMin = (value) => `${fmtNum(Math.round(Number(value || 0)))} phút`;
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

function kpiCard(label, value, sub, tone = "") {
  return `
    <article class="kpi-card ${tone}">
      <div class="kpi-label">${escapeHtml(label)}</div>
      <div class="kpi-value">${escapeHtml(value)}</div>
      <div class="kpi-sub">${escapeHtml(sub)}</div>
    </article>
  `;
}

function renderKpis(data) {
  const services = data.services || [];
  const worstService = [...services].sort((a, b) => a.SLA_On_Time_Rate - b.SLA_On_Time_Rate)[0];
  const aiTopic = (data.ai_topics || [])[0];
  const html = [
    kpiCard("Tổng ticket", fmtNum(data.kpi.Total_ticket), "Toàn bộ kỳ phân tích", "accent"),
    kpiCard("SLA đúng hạn", fmtPct(data.kpi.SLA_On_Time_Rate), `${fmtNum(data.kpi.On_time_ticket)} ticket on-time`, "good"),
    kpiCard("Ticket trễ SLA", fmtNum(data.kpi.Late_ticket), `Late rate ${fmtPct(data.kpi.Late_Rate)}`, "bad"),
    kpiCard("SLA ratio TB", `${Number(data.kpi.Avg_sla_ratio || 0).toFixed(2)}x`, `Delay TB ${fmtMin(data.kpi.Avg_delay_minutes)}`, "warn"),
    kpiCard("Trung bình / tuần", fmtNum(Math.round(data.kpi.Avg_ticket_per_week)), `${(data.weekly || []).length} tuần dữ liệu`, ""),
    kpiCard("Tuần cao điểm", data.kpi.Peak_week || "-", "Volume lớn nhất", "accent"),
    kpiCard("Dịch vụ rủi ro", shortLabel(worstService?.Level || "-", 18), `SLA ${fmtPct(worstService?.SLA_On_Time_Rate)}`, "bad"),
    kpiCard("AI topic ưu tiên", shortLabel(aiTopic?.topic_label || "-", 18), `Priority ${Number(aiTopic?.priority_score_new || 0).toFixed(1)}`, "warn"),
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
        },
        {
          type: "line",
          label: "SLA đúng hạn",
          data: weekly.map((row) => row.SLA_On_Time_Rate * 100),
          borderColor: COLORS.momo,
          backgroundColor: COLORS.momo,
          borderWidth: 3,
          pointRadius: 4,
          tension: 0.35,
          yAxisID: "y1",
        },
        {
          type: "line",
          label: "Late rate",
          data: weekly.map((row) => row.Late_Rate * 100),
          borderColor: COLORS.red,
          backgroundColor: COLORS.red,
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.35,
          yAxisID: "y1",
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
            label: (ctx) => `${ctx.dataset.label}: ${ctx.dataset.yAxisID === "y1" ? `${ctx.parsed.y.toFixed(1)}%` : fmtNum(ctx.parsed.y)}`,
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
        },
        {
          label: "Trễ SLA",
          data: weekly.map((row) => row.Late_ticket),
          backgroundColor: COLORS.red,
          borderRadius: 6,
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

  new Chart(document.querySelector("#weekdayBar"), {
    type: "bar",
    data: {
      labels: (data.weekday || []).map((row) => row.Created_weekday),
      datasets: [
        {
          label: "Ticket",
          data: (data.weekday || []).map((row) => row.Total_ticket),
          backgroundColor: COLORS.momo,
          borderRadius: 8,
        },
        {
          label: "Ticket trễ",
          data: (data.weekday || []).map((row) => row.Late_ticket),
          backgroundColor: COLORS.pink,
          borderRadius: 8,
        },
      ],
    },
    options: chartOptions(),
  });
}

function renderDelayDonut(data) {
  const buckets = (data.delay_buckets || []).filter((row) => row.Delay_Bucket !== "No delay");
  new Chart(document.querySelector("#delayDonut"), {
    type: "doughnut",
    data: {
      labels: buckets.map((row) => row.Delay_Bucket),
      datasets: [
        {
          data: buckets.map((row) => row.Total_ticket),
          backgroundColor: [COLORS.pink, COLORS.amber, COLORS.red, "#7B0000"],
          borderColor: "#fff",
          borderWidth: 4,
          hoverOffset: 8,
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
  const top = services.slice(0, 12).reverse();

  new Chart(document.querySelector("#servicePriority"), {
    type: "bar",
    data: {
      labels: top.map((row) => shortLabel(row.Level, 30)),
      datasets: [
        {
          label: "Priority Score",
          data: top.map((row) => row.Priority_Score),
          backgroundColor: top.map((_, index) => PALETTE[index % PALETTE.length]),
          borderRadius: 8,
        },
      ],
    },
    options: chartOptions({
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Priority: ${fmtShort(ctx.parsed.x)}`,
          },
        },
      },
    }),
  });

  const maxPriority = Math.max(...services.map((row) => row.Priority_Score), 1);
  new Chart(document.querySelector("#serviceMatrix"), {
    type: "bubble",
    data: {
      datasets: [
        {
          label: "Dịch vụ",
          data: services.map((row) => ({
            x: row.Total_ticket,
            y: row.Avg_delay_minutes / 60,
            r: 5 + Math.sqrt(row.Priority_Score / maxPriority) * 22,
            label: row.Level,
            late: row.Late_Rate,
            priority: row.Priority_Score,
          })),
          backgroundColor: "rgba(165, 0, 100, 0.55)",
          borderColor: COLORS.momo,
          borderWidth: 1,
        },
      ],
    },
    options: chartOptions({
      scales: {
        x: { beginAtZero: true, title: { display: true, text: "Tổng ticket" }, grid: { color: "#F0EDF0" } },
        y: { beginAtZero: true, title: { display: true, text: "Delay TB (giờ)" }, grid: { color: "#F0EDF0" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0].raw.label,
            label: (ctx) => [
              `Ticket: ${fmtNum(ctx.raw.x)}`,
              `Delay TB: ${ctx.raw.y.toFixed(1)} giờ`,
              `Late rate: ${(ctx.raw.late * 100).toFixed(1)}%`,
              `Priority: ${fmtShort(ctx.raw.priority)}`,
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
  new Chart(document.querySelector("#agentBubble"), {
    type: "bubble",
    data: {
      datasets: [
        {
          label: "Agent",
          data: agents.map((row) => ({
            x: row.Total_ticket,
            y: row.SLA_On_Time_Rate * 100,
            r: 6 + Math.sqrt(row.Total_ticket / maxTickets) * 24,
            label: row.Agent_tiep_nhan,
            late: row.Late_ticket,
            delay: row.Avg_delay_minutes,
          })),
          backgroundColor: "rgba(249, 83, 150, 0.48)",
          borderColor: COLORS.pinkPlus,
          borderWidth: 1,
        },
      ],
    },
    options: chartOptions({
      scales: {
        x: { beginAtZero: true, title: { display: true, text: "Tổng ticket" }, grid: { color: "#F0EDF0" } },
        y: { beginAtZero: true, max: 100, title: { display: true, text: "SLA đúng hạn (%)" }, grid: { color: "#F0EDF0" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0].raw.label,
            label: (ctx) => [
              `Ticket: ${fmtNum(ctx.raw.x)}`,
              `SLA: ${ctx.raw.y.toFixed(1)}%`,
              `Trễ SLA: ${fmtNum(ctx.raw.late)}`,
              `Delay TB: ${fmtMin(ctx.raw.delay)}`,
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
        <th>#</th><th>Agent</th><th>Ticket</th><th>SLA</th><th>Trễ</th><th>Delay TB</th><th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  `;
}

function topicColor(group) {
  if (group === "Nhóm rủi ro cao") return COLORS.red;
  if (group === "Nhóm xây dựng") return COLORS.green;
  return COLORS.pinkPlus;
}

function renderAi(data) {
  const topics = [...(data.ai_topics || [])].sort((a, b) => a.priority_score_new - b.priority_score_new);
  new Chart(document.querySelector("#aiPriority"), {
    type: "bar",
    data: {
      labels: topics.map((row) => shortLabel(row.topic_label, 30)),
      datasets: [
        {
          label: "Priority AI",
          data: topics.map((row) => row.priority_score_new),
          backgroundColor: topics.map((row) => topicColor(row.topic_group)),
          borderRadius: 8,
        },
      ],
    },
    options: chartOptions({
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Priority: ${ctx.parsed.x.toFixed(1)}`,
          },
        },
      },
    }),
  });

  const maxPriority = Math.max(...topics.map((row) => row.priority_score_new), 1);
  new Chart(document.querySelector("#aiMatrix"), {
    type: "bubble",
    data: {
      datasets: [
        {
          label: "AI topics",
          data: topics.map((row) => ({
            x: row.total_feedback,
            y: row.avg_pain_score,
            r: 6 + Math.sqrt(row.priority_score_new / maxPriority) * 24,
            label: row.topic_label,
            group: row.topic_group,
            priority: row.priority_score_new,
          })),
          backgroundColor: topics.map((row) => `${topicColor(row.topic_group)}88`),
          borderColor: topics.map((row) => topicColor(row.topic_group)),
          borderWidth: 1,
        },
      ],
    },
    options: chartOptions({
      scales: {
        x: { beginAtZero: true, title: { display: true, text: "Tổng phản hồi" }, grid: { color: "#F0EDF0" } },
        y: { beginAtZero: true, title: { display: true, text: "Pain score TB" }, grid: { color: "#F0EDF0" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0].raw.label,
            label: (ctx) => [
              `Feedback: ${fmtNum(ctx.raw.x)}`,
              `Pain: ${ctx.raw.y.toFixed(3)}`,
              `Priority: ${ctx.raw.priority.toFixed(1)}`,
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
          <strong>${escapeHtml(shortLabel(row.topic_label, 38))} · Pain ${Number(row.pain_score_new || 0).toFixed(3)}</strong>
          <p>"${escapeHtml(shortLabel(row.content_masked, 260))}"</p>
        </article>
      `
    )
    .join("");
  document.querySelector("#vocGrid").innerHTML = vocHtml;
}

function renderDeepDive(data) {
  const clusters = data.deep_clusters || [];
  const maxPain = Math.max(...clusters.map((row) => row.avg_pain_score), 1);
  const html = clusters
    .map((cluster, index) => {
      const tone = index === 0 ? "status-bad" : index === 1 ? "status-warn" : "status-good";
      const title = index === 0 ? "Pain cao nhất" : index === 1 ? "Pain cao" : "Theo dõi";
      const width = Math.max(4, (cluster.avg_pain_score / maxPain) * 100);
      const samples = (cluster.quotes || [])
        .slice(0, 2)
        .map((quote) => `<div class="sample">"${escapeHtml(shortLabel(quote.content_masked, 230))}"</div>`)
        .join("");
      return `
        <article class="cluster-card">
          <div class="cluster-top">
            <div>
              <h3>${escapeHtml(cluster.topic_label)}</h3>
              <div class="cluster-meta">${fmtNum(cluster.total_feedback)} phản hồi · pain TB ${Number(cluster.avg_pain_score || 0).toFixed(3)}</div>
            </div>
            <span class="status-pill ${tone}">${title}</span>
          </div>
          <div class="pain-bar" aria-label="Pain score bar">
            <div class="pain-fill" style="width:${width}%"></div>
          </div>
          <div class="sample-grid">${samples}</div>
        </article>
      `;
    })
    .join("");
  document.querySelector("#clusterList").innerHTML = html;
}

function renderSwatches() {
  const swatches = [
    ["Hồng MoMo", "#A50064", "Primary / logo"],
    ["Hồng +1", "#F95396", "CTA / highlight"],
    ["Hồng", "#FF9DBE", "Data accent"],
    ["Hồng -1", "#FEC8DC", "Soft surface"],
    ["Hồng -2", "#FFEFF4", "Background"],
    ["Đỏ", "#E5303F", "SLA risk"],
    ["Cam", "#FF9064", "Warning"],
    ["Vàng", "#FBDE33", "Positive alert"],
    ["Xanh lá", "#5EA12A", "Success"],
    ["Xanh dương", "#1C66BB", "Information"],
  ];
  document.querySelector("#swatchGrid").innerHTML = swatches
    .map(
      ([name, hex, note]) => `
        <article class="swatch-card">
          <div class="swatch-color" style="background:${hex}"></div>
          <div class="swatch-info">
            <strong>${name}</strong>
            <span>${hex}</span>
            <span>${note}</span>
          </div>
        </article>
      `
    )
    .join("");
}

async function init() {
  try {
    const response = await fetch("Data/dashboard.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Không đọc được Data/dashboard.json (${response.status})`);
    const data = await response.json();
    document.querySelector("#generatedAt").textContent = `Build ${new Date(data.generated_at).toLocaleString("vi-VN")}`;
    renderKpis(data);
    renderWeeklyCharts(data);
    renderDelayDonut(data);
    renderServiceCharts(data);
    renderHeatmap(data);
    renderAgent(data);
    renderAi(data);
    renderDeepDive(data);
    renderSwatches();
  } catch (error) {
    document.querySelector("#generatedAt").textContent = "Lỗi dữ liệu";
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#FDECEB;color:#A50064;padding:12px 20px;font-weight:800">${escapeHtml(error.message)}</div>`
    );
    renderSwatches();
    console.error(error);
  }
}

window.addEventListener("DOMContentLoaded", init);
