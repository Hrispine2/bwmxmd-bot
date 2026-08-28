const { bwmxmd } = require('../adams/commandHandler');
const axios = require('axios');

const API_BASE = 'https://ockvxxtnzryvsjtiakqi.supabase.co/functions/v1/bot-remaining-days';

bwmxmd({
  pattern: "botdays",
  aliases: ["remainingdays", "daysremaining", "botexpiry", "expiry", "botlife"],
  description: "Check how many days your bot deployment has remaining",
  category: "System",
  filename: __filename
}, async (from, client, conText) => {
  const { reply } = conText;

  const appName = process.env.HEROKU_APP_NAME;

  if (!appName) {
    return reply(
      `*Bot Days Info*\n\n` +
      `We did not found your app, may be this bot was deployed outside bwm xmd main deployment site\n\n` +
      `*Main deployment site*\n` +
      `pro.bwmxmd.co.ke`
    );
  }

  try {
    const url = `${API_BASE}/${appName}`;
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data;

    if (!data || data.found === false || data.status === 'not_found' || data.error) {
      return reply(
        `*Bot Days Info*\n\n` +
        `We did not found your app, may be this bot was deployed outside bwm xmd main deployment site\n\n` +
        `*Main deployment site*\n` +
        `pro.bwmxmd.co.ke`
      );
    }

    const remainingDays = data.remaining_days ?? data.remainingDays ?? data.days_remaining ?? data.days ?? 'N/A';
    const rawDate = data.expiry_date ?? data.expiryDate ?? data.expires_at ?? data.expiry ?? null;

    let expiryDate = 'N/A';
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d)) {
        expiryDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      } else {
        expiryDate = rawDate;
      }
    }

    return reply(
      `*Bot Days Info*\n\n` +
      `Remaining days: ${remainingDays} day(s)\n` +
      `Expires on: ${expiryDate}\n\n` +
      `_Deployed from main site_\n` +
      `pro.bwmxmd.co.ke`
    );

  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 400)) {
      return reply(
        `*Bot Days Info*\n\n` +
        `We did not found your app, may be this bot was deployed outside bwm xmd main deployment site\n\n` +
        `*Main deployment site*\n` +
        `pro.bwmxmd.co.ke`
      );
    }

    return reply(
      `*Bot Days Info*\n\n` +
      `Could not reach the server. Please try again later.`
    );
  }
});
