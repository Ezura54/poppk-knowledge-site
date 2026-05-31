(function () {
  const canvas = document.getElementById("pkCanvas");
  const ctx = canvas.getContext("2d");
  const populationCanvas = document.getElementById("populationCanvas");
  const popCtx = populationCanvas.getContext("2d");
  const clRange = document.getElementById("clRange");
  const vRange = document.getElementById("vRange");
  const kaRange = document.getElementById("kaRange");
  const curveReadout = document.getElementById("curveReadout");
  const patientReadout = document.getElementById("patientReadout");
  const layerStatus = document.getElementById("layerStatus");
  const dose = 100;
  let phase = 0;
  const patients = makePatients(24);

  function concentration(t, cl, v, ka) {
    const ke = cl / v;
    if (Math.abs(ka - ke) < 0.001) return 0;
    return (dose * ka / (v * (ka - ke))) * (Math.exp(-ke * t) - Math.exp(-ka * t));
  }

  function makePatients(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963;
      const etaCL = Math.sin(angle) * 0.34 + Math.cos(i * 0.73) * 0.12;
      const etaV = Math.cos(angle * 0.82) * 0.26;
      const etaKa = Math.sin(angle * 1.31) * 0.22;
      list.push({
        cl: 3.5 * Math.exp(etaCL),
        v: 30 * Math.exp(etaV),
        ka: 1.1 * Math.exp(etaKa),
        noise: (Math.sin(angle * 1.9) + Math.cos(angle * 0.6)) * 0.035
      });
    }
    return list;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(700, Math.floor(rect.width * ratio));
    canvas.height = Math.floor(420 * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const popRect = populationCanvas.getBoundingClientRect();
    populationCanvas.width = Math.max(700, Math.floor(popRect.width * ratio));
    populationCanvas.height = Math.floor(410 * ratio);
    popCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawGrid(w, h, pad) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#091012";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(238,245,239,0.08)";
    ctx.lineWidth = 1;
    for (let x = pad; x <= w - pad; x += (w - pad * 2) / 8) {
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, h - pad);
      ctx.stroke();
    }
    for (let y = pad; y <= h - pad; y += (h - pad * 2) / 5) {
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(238,245,239,0.72)";
    ctx.font = "12px Microsoft YaHei, sans-serif";
    ctx.fillText("浓度", pad, pad - 14);
    ctx.fillText("时间", w - pad - 18, h - pad + 34);
  }

  function drawCurve() {
    const w = canvas.clientWidth;
    const h = 420;
    const pad = w < 720 ? 42 : 58;
    const cl = Number(clRange.value);
    const v = Number(vRange.value);
    const ka = Number(kaRange.value);
    curveReadout.textContent = `CL ${cl.toFixed(1)} L/h · V ${v.toFixed(0)} L · Ka ${ka.toFixed(1)} h-1`;

    const points = [];
    let maxY = 0;
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * 24;
      const y = concentration(t, cl, v, ka);
      maxY = Math.max(maxY, y);
      points.push({ t, y });
    }
    const yTop = Math.max(1.2, maxY * 1.22);

    drawGrid(w, h, pad);

    function xScale(t) {
      return pad + (t / 24) * (w - pad * 2);
    }
    function yScale(y) {
      return h - pad - (y / yTop) * (h - pad * 2);
    }

    ctx.strokeStyle = "rgba(242,184,75,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xScale(p.t);
      const y = yScale(p.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const reveal = (Math.sin(phase) + 1) / 2;
    const cut = Math.floor(points.length * (0.2 + reveal * 0.8));
    const grad = ctx.createLinearGradient(pad, 0, w - pad, 0);
    grad.addColorStop(0, "#4fd1c5");
    grad.addColorStop(0.55, "#f2b84b");
    grad.addColorStop(1, "#ee6b73");

    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    points.slice(0, cut).forEach((p, i) => {
      const x = xScale(p.t);
      const y = yScale(p.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const peak = points.reduce((best, p) => (p.y > best.y ? p : best), points[0]);
    const px = xScale(peak.t);
    const py = yScale(peak.y);
    ctx.fillStyle = "#f2b84b";
    ctx.beginPath();
    ctx.arc(px, py, 6 + Math.sin(phase * 2) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(238,245,239,0.82)";
    ctx.font = "13px Microsoft YaHei, sans-serif";
    ctx.fillText(`Tmax ${peak.t.toFixed(1)} h`, px + 12, py - 12);
    ctx.fillText(`Cmax ${peak.y.toFixed(2)}`, px + 12, py + 8);

    const tracerIndex = Math.floor(((phase * 0.12) % 1) * (points.length - 1));
    const tracer = points[tracerIndex];
    ctx.strokeStyle = "rgba(79,209,197,0.28)";
    ctx.beginPath();
    ctx.moveTo(xScale(tracer.t), h - pad);
    ctx.lineTo(xScale(tracer.t), yScale(tracer.y));
    ctx.stroke();
    ctx.fillStyle = "#4fd1c5";
    ctx.beginPath();
    ctx.arc(xScale(tracer.t), yScale(tracer.y), 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(159,176,166,0.9)";
    ctx.font = "12px Microsoft YaHei, sans-serif";
    for (let i = 0; i <= 4; i++) {
      const t = i * 6;
      ctx.fillText(String(t), xScale(t) - 5, h - pad + 20);
    }
  }

  function drawPopulation() {
    const w = populationCanvas.clientWidth;
    const h = 410;
    const pad = w < 720 ? 42 : 58;
    const typical = { cl: 3.5, v: 30, ka: 1.1 };
    const allSeries = [];
    let maxY = 0;

    const typicalPoints = [];
    for (let i = 0; i <= 180; i++) {
      const t = (i / 180) * 24;
      const y = concentration(t, typical.cl, typical.v, typical.ka);
      maxY = Math.max(maxY, y);
      typicalPoints.push({ t, y });
    }

    patients.forEach((pt) => {
      const points = [];
      for (let i = 0; i <= 180; i++) {
        const t = (i / 180) * 24;
        const y = concentration(t, pt.cl, pt.v, pt.ka);
        maxY = Math.max(maxY, y);
        points.push({ t, y });
      }
      allSeries.push({ pt, points });
    });

    const yTop = Math.max(1.2, maxY * 1.18);
    popCtx.clearRect(0, 0, w, h);
    popCtx.fillStyle = "#091012";
    popCtx.fillRect(0, 0, w, h);

    popCtx.strokeStyle = "rgba(238,245,239,0.08)";
    popCtx.lineWidth = 1;
    for (let x = pad; x <= w - pad; x += (w - pad * 2) / 8) {
      popCtx.beginPath();
      popCtx.moveTo(x, pad);
      popCtx.lineTo(x, h - pad);
      popCtx.stroke();
    }
    for (let y = pad; y <= h - pad; y += (h - pad * 2) / 5) {
      popCtx.beginPath();
      popCtx.moveTo(pad, y);
      popCtx.lineTo(w - pad, y);
      popCtx.stroke();
    }

    function xScale(t) {
      return pad + (t / 24) * (w - pad * 2);
    }
    function yScale(y) {
      return h - pad - (y / yTop) * (h - pad * 2);
    }

    const reveal = Math.floor((0.18 + ((Math.sin(phase * 0.8) + 1) / 2) * 0.82) * 181);
    allSeries.forEach((series, index) => {
      popCtx.strokeStyle = `rgba(79, 209, 197, ${0.18 + (index % 5) * 0.045})`;
      popCtx.lineWidth = index % 7 === 0 ? 2.2 : 1.35;
      popCtx.beginPath();
      series.points.slice(0, reveal).forEach((p, i) => {
        const x = xScale(p.t);
        const y = yScale(p.y);
        if (i === 0) popCtx.moveTo(x, y);
        else popCtx.lineTo(x, y);
      });
      popCtx.stroke();
    });

    popCtx.strokeStyle = "#f2b84b";
    popCtx.lineWidth = 4;
    popCtx.lineCap = "round";
    popCtx.beginPath();
    typicalPoints.forEach((p, i) => {
      const x = xScale(p.t);
      const y = yScale(p.y);
      if (i === 0) popCtx.moveTo(x, y);
      else popCtx.lineTo(x, y);
    });
    popCtx.stroke();

    const sampleTimes = [1, 2, 4, 8, 12, 18, 24];
    popCtx.fillStyle = "#ee6b73";
    patients.slice(0, 10).forEach((pt, pi) => {
      sampleTimes.forEach((t, ti) => {
        const y = concentration(t, pt.cl, pt.v, pt.ka) * (1 + pt.noise + Math.sin(phase + pi + ti) * 0.04);
        popCtx.beginPath();
        popCtx.arc(xScale(t), yScale(Math.max(0, y)), 3.2, 0, Math.PI * 2);
        popCtx.fill();
      });
    });

    const spotlight = patients[Math.floor(((phase * 0.2) % 1) * patients.length)];
    patientReadout.textContent = `24 名虚拟受试者 · 当前高亮个体 CL ${spotlight.cl.toFixed(1)} L/h · V ${spotlight.v.toFixed(0)} L`;

    popCtx.fillStyle = "rgba(238,245,239,0.78)";
    popCtx.font = "12px Microsoft YaHei, sans-serif";
    popCtx.fillText("浓度", pad, pad - 14);
    popCtx.fillText("时间", w - pad - 18, h - pad + 34);
  }

  function animate() {
    phase += 0.025;
    drawCurve();
    drawPopulation();
    requestAnimationFrame(animate);
  }

  [clRange, vRange, kaRange].forEach((range) => {
    range.addEventListener("input", drawCurve);
  });

  const statusTexts = [
    "群体典型值正在生成个体曲线",
    "ETA 让每个人偏离群体均值",
    "EPS 让观测点围绕预测值波动",
    "三层分开后，诊断图才读得准"
  ];
  let statusIndex = 0;
  setInterval(() => {
    statusIndex = (statusIndex + 1) % statusTexts.length;
    layerStatus.textContent = statusTexts[statusIndex];
  }, 2400);

  document.querySelectorAll(".quiz-card").forEach((card) => {
    const answer = card.dataset.answer;
    const feedback = card.querySelector(".feedback");
    card.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        card.querySelectorAll("button").forEach((item) => {
          item.classList.remove("correct", "wrong");
        });
        if (button.dataset.choice === answer) {
          button.classList.add("correct");
          feedback.textContent = "答对了。这个判断是第一周最重要的基础。";
        } else {
          button.classList.add("wrong");
          const right = card.querySelector(`[data-choice="${answer}"]`);
          if (right) right.classList.add("correct");
          feedback.textContent = "再看一眼三层结构：群体、个体、观测噪声要分开。";
        }
      });
    });
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    drawCurve();
    drawPopulation();
  });

  resizeCanvas();
  animate();
})();
