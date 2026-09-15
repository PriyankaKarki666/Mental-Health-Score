const API_BASE_URL = "https://mental-health-score-2-x3pp.onrender.com";

const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const errorMsg = document.getElementById("error-msg");

const stateIdle = document.getElementById("state-idle");
const stateLoading = document.getElementById("state-loading");
const stateResult = document.getElementById("state-result");

const gaugeFill = document.getElementById("gauge-fill");
const gaugeMarker = document.getElementById("gauge-marker");
const scoreNumber = document.getElementById("score-number");
const signalLabel = document.getElementById("signal-label");
const signalDesc = document.getElementById("signal-desc");

const GAUGE_CX = 110;
const GAUGE_CY = 110;
const GAUGE_R = 90;
const GAUGE_LENGTH = Math.PI * GAUGE_R; // semicircle arc length

// --- Stress level pill selection ---
const stressButtons = document.getElementById("stress-buttons");
const stressInput = document.getElementById("stressLevel");

stressButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  stressButtons.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  stressInput.value = btn.dataset.value;
});

// --- Helpers ---
function showState(state) {
  stateIdle.hidden = state !== "idle";
  stateLoading.hidden = state !== "loading";
  stateResult.hidden = state !== "result";
}

function setGauge(scoreOutOf10) {
  const fraction = Math.min(Math.max(scoreOutOf10 / 10, 0), 1);
  const offset = GAUGE_LENGTH * (1 - fraction);
  gaugeFill.style.opacity = "1";
  gaugeMarker.style.opacity = "1";
  requestAnimationFrame(() => {
    gaugeFill.style.strokeDashoffset = String(offset);
  });

  const theta = (Math.PI / 180) * (180 - fraction * 180);
  const mx = GAUGE_CX + GAUGE_R * Math.cos(theta);
  const my = GAUGE_CY - GAUGE_R * Math.sin(theta);
  gaugeMarker.setAttribute("cx", mx.toFixed(1));
  gaugeMarker.setAttribute("cy", my.toFixed(1));
}

function resetGauge() {
  gaugeFill.style.opacity = "0";
  gaugeMarker.style.opacity = "0";
  gaugeFill.style.strokeDashoffset = String(GAUGE_LENGTH);
}

function signalFromScore(score) {
  if (score >= 7.5) {
    return {
      label: "Signal: strong",
      desc: "Your habits point to a well-supported, resilient baseline. Keep it up.",
    };
  }
  if (score >= 5) {
    return {
      label: "Signal: steady",
      desc: "Your habits are broadly balanced, with some room to build stronger routines.",
    };
  }
  if (score >= 2.5) {
    return {
      label: "Signal: strained",
      desc: "A few habits may be pulling on your wellbeing. Small adjustments could help.",
    };
  }
  return {
    label: "Signal: at risk",
    desc: "Your current habits suggest real strain. Consider reaching out for support.",
  };
}

function setError(message) {
  errorMsg.textContent = message || "";
}

// --- Submit ---
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const payload = {
    age: Number(form.age.value),
    gender: form.gender.value,
    country: form.country.value.trim(),
    academic_Level: form.academic_Level.value,
    most_used_platform: form.most_used_platform.value,
    purpose_Of_Use: form.purpose_Of_Use.value,
    avg_Daily_usage_hours: Number(form.avg_Daily_usage_hours.value),
    daily_unlocks: Number(form.daily_unlocks.value),
    study_hours: Number(form.study_hours.value),
    physical_activity_hours: Number(form.physical_activity_hours.value),
    sleep_hours_per_night: Number(form.sleep_hours_per_night.value),
    stress_level: form.stress_level.value,
  };

  if (!payload.country) {
    setError("Please enter a country.");
    return;
  }

  submitBtn.disabled = true;
  showState("loading");

  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = `Request failed (${response.status})`;
      try {
        const errBody = await response.json();
        if (errBody && errBody.detail) {
          detail = Array.isArray(errBody.detail)
            ? errBody.detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
            : String(errBody.detail);
        }
      } catch (_) {
        /* ignore parse failure, keep generic message */
      }
      throw new Error(detail);
    }

    const data = await response.json();
    const score = Number(data.predicted_mental_health_score);

    const signal = signalFromScore(score);
    scoreNumber.textContent = score.toFixed(2);
    signalLabel.textContent = signal.label;
    signalDesc.textContent = signal.desc;

    setGauge(score);
    showState("result");
  } catch (err) {
    showState("idle");
    setError(
      err && err.message
        ? `Couldn't reach the model: ${err.message}`
        : "Couldn't reach the model. Please check the API is running and try again."
    );
  } finally {
    submitBtn.disabled = false;
  }
});

// --- Reset ---
resetBtn.addEventListener("click", () => {
  resetGauge();
  setError("");
  showState("idle");
});

// initial state
resetGauge();
showState("idle");