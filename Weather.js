const fs = require("fs");

const LAT = 43.6532;
const LON = -79.3832;

async function run() {

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,precipitation,cloud_cover,uv_index` +
    `&hourly=precipitation_probability,precipitation,time` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&timezone=auto`;

  const response = await fetch(url);
  const data = await response.json();

  console.log(JSON.stringify(data, null, 2));
  process.exit(1);

  const now = new Date();

  const temp = Math.round(data.current.temperature_2m);
  const precipNow = data.current.precipitation || 0;
  const cloud = data.current.cloud_cover || 0;
  const uv = Math.round(data.current.uv_index || 0);

  let icon = "☀️";

  if (precipNow > 1) {
    icon = "⛈";
  } else if (precipNow > 0.1) {
    icon = "🌧";
  } else if (cloud > 85) {
    icon = "☁️";
  } else if (cloud > 40) {
    icon = "⛅️";
  }

  const times = data.hourly.time;
  const pops = data.hourly.precipitation_probability;
  const precs = data.hourly.precipitation;

  let currentIndex = 0;
  let bestDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]) - now);

    if (diff < bestDiff) {
      bestDiff = diff;
      currentIndex = i;
    }
  }

  let dynamic = "";

  // RAINING NOW
  if (precipNow > 0.1) {

    let stopMinutes = null;

    for (let i = currentIndex; i < times.length; i++) {

      if ((precs[i] || 0) < 0.1) {

        stopMinutes =
          Math.round(
            (new Date(times[i]) - now) /
            60000
          );

        break;
      }
    }

    dynamic =
      stopMinutes
        ? `↓${stopMinutes}m`
        : "↓all day";
  }

  // RAIN STARTING WITHIN NEXT HOUR
  else {

    let startMinutes = null;

    for (let i = currentIndex; i < times.length; i++) {

      const mins =
        (new Date(times[i]) - now) /
        60000;

      if (
        mins > 0 &&
        mins <= 60 &&
        (pops[i] || 0) >= 40
      ) {
        startMinutes = Math.round(mins);
        break;
      }
    }

    if (startMinutes !== null) {
      dynamic = `↑${startMinutes}m`;
    }
  }

  // UV
  if (!dynamic && uv > 5) {
    dynamic = `UV${uv}`;
  }

  // HIGH / LOW
  if (!dynamic) {

    const hi =
      Math.round(
        data.daily.temperature_2m_max[0]
      );

    const lo =
      Math.round(
        data.daily.temperature_2m_min[0]
      );

    dynamic = `${hi}°/${lo}°`;
  }

  const display =
    `${icon} ${temp}° ${dynamic}`;

  fs.writeFileSync(
    "Weather.json",
    JSON.stringify(
      { display },
      null,
      2
    )
  );

  console.log(display);
}

run();
