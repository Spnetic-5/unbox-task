require("dotenv").config();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function randn() {
  // Box–Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} failed: ${res.status} ${text}`);
  }
}

async function main() {
  const apiBase = (process.env.API_BASE_URL || "http://localhost:8080").replace(
    /\/$/,
    "",
  );
  const endpoint = `${apiBase}/api/speeds`;

  const maxSpeed = Number(process.env.SIM_MAX_SPEED_MPS || 28); // ~100 km/h
  const accel = Number(process.env.SIM_ACCEL_MPS2 || 1.6);
  const noise = Number(process.env.SIM_NOISE_STD_MPS || 0.25);

  // Simple speed profile: up, cruise, down, repeat
  let phase = 0; // 0 up, 1 cruise, 2 down
  let speed = 0;

  // eslint-disable-next-line no-console
  console.log(`simulator posting to ${endpoint}`);

  while (true) {
    if (phase === 0) {
      speed += accel;
      if (speed >= maxSpeed) {
        speed = maxSpeed;
        phase = 1;
      }
    } else if (phase === 1) {
      if (Math.random() < 0.15) phase = 2;
    } else if (phase === 2) {
      speed -= accel * 1.2;
      if (speed <= 0) {
        speed = 0;
        phase = 0;
      }
    }

    const speed_mps = clamp(speed + randn() * noise, 0, maxSpeed + 2);
    await postJson(endpoint, { speed_mps, source: "sim" });
    await sleep(1000);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
