require('dotenv').config();
const WebSocket = require('ws');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

const TOKEN = process.env.TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const WS_URL = process.env.WS_URL;

const bot = new TelegramBot(TOKEN, { polling: true });

let history = [];

function connectWS() {
  const ws = new WebSocket(WS_URL);

  ws.on('open', () => console.log('✅ WebSocket Connected!'));

  ws.on('message', (data) => {
    try {
      const msg = data.toString();
      if (!msg.startsWith('{')) return;

      const json = JSON.parse(msg);
      if (json.type === 'crash' && json.data?.crash_point) {
        const crash = parseFloat(json.data.crash_point);
        history.push(crash);
        if (history.length > 5) history.shift();

        console.log(`📉 Crash: ${crash}x`);

        if (history.length >= 3) {
          const [a, b, c] = history.slice(-3);
          const avg = ((a + b + c) / 3).toFixed(2);
          let txt = `📊 آخر 3 جولات: ${a}x, ${b}x, ${c}x\n📈 متوسط: ${avg}x\n`;

          if (avg < 2) txt += '🔻 توقع: منخفضة';
          else if (avg < 3) txt += '⚖️ توقع: متوسطة';
          else txt += '🟢 توقع: قوية';

          bot.sendMessage(CHAT_ID, txt, {
            reply_markup: {
              inline_keyboard: [[{ text: "🚀 توقع جديد", callback_data: "predict" }]]
            }
          });
        }
      }
    } catch (e) {
      console.error('❌ Error parsing:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('🔄 WebSocket Closed. Reconnect in 15s...');
    setTimeout(connectWS, 15000);
  });
}

bot.on('callback_query', (q) => {
  if (q.data === 'predict') {
    bot.sendMessage(CHAT_ID, `⏳ نحتاج 3 جولات على الأقل لبدء التوقع...`);
  }
});

connectWS();

app.get("/", (req, res) => {
  res.send("✅ Crash Bot is running...");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
