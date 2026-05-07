import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Supabase Admin Client
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const TELEGRAM_BOT_TOKEN = "8057725957:AAHTq11nuL7JPjz_t-7OsuvZvfZIVDeEYGU";
  const TELEGRAM_CHAT_ID = "-1003961332934";

  // Health check
  app.get("/api/health", (req, res) => {
    console.log("HEALTH CHECK REQUEST");
    res.json({ status: "ok", message: "Server is running" });
  });

  // Debug tracking
  const eventLogs: string[] = [];
  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    eventLogs.push(entry);
    if (eventLogs.length > 20) eventLogs.shift();
    console.log(entry);
  };

  // API 0: Webhook Status (Check if bot is receiving anything)
  let lastUpdate: any = null;
  app.get("/api/telegram-status", async (req, res) => {
    let botInfo = null;
    let webhookInfo = null;
    try {
      const bRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
      botInfo = await bRes.json();
      const wRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
      webhookInfo = await wRes.json();
    } catch (e) {}

    res.json({
      server_time: new Date().toLocaleTimeString(),
      server_status: "Running (Production Mode: " + (process.env.NODE_ENV === "production") + ")",
      last_received_at: lastUpdate ? new Date().toISOString() : "Never",
      recent_logs: eventLogs,
      bot_identity: botInfo,
      telegram_webhook_config: webhookInfo,
      last_payload_summary: lastUpdate ? { 
        type: lastUpdate.callback_query ? "Button Click" : "Message",
        from: lastUpdate.message?.from?.id || lastUpdate.callback_query?.from?.id || "Unknown"
      } : "No updates received.",
      setup: {
        bot_token_present: !!TELEGRAM_BOT_TOKEN,
        webhook_url: `https://ais-pre-xohuxgtddbjjowtpqv33s5-712030939353.asia-southeast1.run.app/api/telegram-webhook`
      }
    });
  });

  // API: Auto Webhook Setup endpoint
  app.get("/api/setup-webhook", async (req, res) => {
    log("Manual Webhook Setup triggered");
    const webhookUrl = "https://ais-pre-xohuxgtddbjjowtpqv33s5-712030939353.asia-southeast1.run.app/api/telegram-webhook";
    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${webhookUrl}&drop_pending_updates=true`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      res.json({
        message: "Webhook setup attempted",
        telegram_response: data,
        webhook_url: webhookUrl
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // API 1: Transaction Notifier (Called by Supabase Webhook)
  app.post("/api/telegram-notifier", async (req, res) => {
    try {
      const record = req.body?.record || req.body;
      console.log("🔔 New Transaction received:", record.id);

      const userName = record.user_name || record.userName || record.full_name || "Customer";
      const orderType = (record.type || "Transaction").toUpperCase();
      const amount = record.amount || "0";
      const currency = record.currency || "BDT";
      const txId = record.id;

      const message = `🚨 <b>New Order এসেছে!</b>\n\n👤 <b>User:</b> ${userName}\n💱 <b>Type:</b> ${orderType}\n💰 <b>Amount:</b> ${amount} ${currency}\n⏰ <b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}`;

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "📥 Claim Order", callback_data: `claim_${txId}` }]]
          }
        }),
      });

      const data = await response.json();
      console.log("Telegram API Response:", data);
      res.json({ success: data.ok });
    } catch (error: any) {
      console.error("Notifier Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API 2: Telegram Webhook Handler (Button clicks & Registration)
  app.post("/api/telegram-webhook", async (req, res) => {
    log(`Incoming POST to webhook from ${req.ip}`);
    res.sendStatus(200); // Always OK immediately
    await processTelegramUpdate(req.body);
  });

  // API 3: Manual Logic Simulator (Test registration logic via browser)
  app.get("/api/simulate-register", async (req, res) => {
    const { username, chat_id, telegram_id } = req.query;
    if (!username || !chat_id || !telegram_id) {
      return res.status(400).send("Missing username, chat_id or telegram_id");
    }

    log(`🧪 Simulation: Registering ${username} with ID ${telegram_id}`);
    const { data, error } = await supabase
      .from('sub_admins')
      .update({ telegram_id: telegram_id as string })
      .eq('username', username as string)
      .select()
      .single();

    if (!error && data) {
      await sendMsg(TELEGRAM_BOT_TOKEN, chat_id as string, `✅ <b>[TEST]</b> অভিনন্দন ${data.full_name}! রেজিস্ট্রেশন সফল।`);
      res.json({ success: true, user: data });
    } else {
      res.json({ success: false, error: error?.message || "User not found" });
    }
  });

  // API 3: Manual Testing (Verify group button)
  app.get("/api/test-telegram", async (req, res) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: "🛠 <b>বাটন টেস্ট:</b> যদি নিচের বাটনটি দেখতে পান, তবে আপনার সিস্টেম কাজ করছে।",
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "📥 Test Claim", callback_data: "claim_test_123" }]]
          }
        }),
      });
      const data = await response.json();
      res.json({ instruction: "Check Telegram Group for button", data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- TELEGRAM POLLING ENGINE ---
  // Since AI Studio security blocks incoming Webhooks, we use Polling as a reliable alternative.
  let offset = 0;
  async function pollUpdates() {
    log("📡 Polling Engine Started...");
    
    // Clear any existing Webhook first to allow polling
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`);
      log("✅ Webhook deleted for polling");
    } catch (e) {}

    // Background task for timeouts (Every 30 seconds)
    setInterval(async () => {
      try {
        const now = new Date();
        const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
        
        log(`🔍 Checking for abandoned orders (Before ${fiveMinsAgo})...`);

        // 1. Find orders claimed from Telegram (pending + assigned) but not accepted in panel
        const { data: abandonedPending, error: e1 } = await supabase
          .from('transactions')
          .select('id, type, amount, currency, reclaim_notified')
          .eq('status', 'pending')
          .not('assigned_sub_admin_id', 'is', null)
          .lte('claim_time', fiveMinsAgo)
          .eq('reclaim_notified', false);

        // 2. Find orders accepted in panel but not started/processed within 5 mins
        const { data: abandonedAccepted, error: e2 } = await supabase
          .from('transactions')
          .select('id, type, amount, currency, reclaim_notified')
          .eq('status', 'accepted')
          .lte('updated_at', fiveMinsAgo)
          .eq('reclaim_notified', false);

        if (e1 || e2) log(`❌ Timeout Query Error: ${e1?.message || e2?.message}`);

        const allAbandoned = [...(abandonedPending || []), ...(abandonedAccepted || [])];

        if (allAbandoned.length > 0) {
          log(`⏰ Found ${allAbandoned.length} abandoned orders. Resetting...`);
          for (const tx of allAbandoned) {
            const { error: upError } = await supabase.from('transactions')
              .update({ 
                status: 'pending',
                assigned_sub_admin_id: null,
                claim_time: null,
                reclaim_notified: true, 
                updated_at: new Date().toISOString()
              })
              .eq('id', tx.id);

            if (upError) {
              log(`❌ Failed to reset TX ${tx.id}: ${upError.message}`);
              continue;
            }

            const message = `⚠️ <b>অর্ডার রিসেট (Timeout)</b>\n\n💰 <b>পরিমান:</b> ${tx.amount} ${tx.currency}\n🛠 <b>টাইপ:</b> ${tx.type?.replace('_', ' ').toUpperCase()}\n\nনির্ধারিত ৫ মিনিটের মধ্যে এজেন্ট অর্ডারটি শুরু না করায় এটি পুনরায় সবার জন্য উন্মুক্ত করা হয়েছে।`;
            const keyboard = {
              inline_keyboard: [[{ text: "📥 পুনরায় ক্লেইম করুন", callback_data: `claim_${tx.id}` }]]
            };

            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML', reply_markup: keyboard })
            });

            log(`📢 Transaction ${tx.id} has been reset due to timeout.`);
          }
        }
      } catch (e: any) {
        log(`❌ Global Timeout Logic Error: ${e.message}`);
      }
    }, 30000);

    while (true) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`);
        const data: any = await response.json();
        
        if (data.ok && data.result.length > 0) {
          log(`📥 Received ${data.result.length} updates via Polling`);
          for (const update of data.result) {
            offset = update.update_id + 1;
            await processTelegramUpdate(update);
          }
        }
      } catch (e: any) {
        log(`❌ Polling Error: ${e.message}`);
        await new Promise(r => setTimeout(r, 5000));
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // Main Update Processor
  async function processTelegramUpdate(body: any) {
    try {
      if (!body) return;
      lastUpdate = body; 
      
      // 1. REGISTRATION HANDLER
      const msg = body.message || body.edited_message;
      if (msg?.text) {
        const text = msg.text;
        const chatId = msg.chat.id;
        const telegramId = msg.from.id.toString();

        if (text.includes("/start_")) {
          const username = text.split("_")[1]?.split(" ")[0].trim();
          log(`👤 Registration attempt: ${username} (ID: ${telegramId})`);

          // Clear conflicts
          await supabase.from('sub_admins').update({ telegram_id: null }).eq('telegram_id', telegramId);

          const { data: subAdmin, error } = await supabase
            .from('sub_admins')
            .update({ telegram_id: telegramId })
            .eq('username', username)
            .select()
            .maybeSingle();
          
          if (error || !subAdmin) {
            log(`❌ Registration failed for ${username}: ${error?.message || 'Not found'}`);
            await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `❌ <b>Error:</b> আপনার ইউজারনেম (<b>${username}</b>) ডাটাবেসে পাওয়া যায়নি। সঠিক ইউজারনেম দিয়ে আবার ট্রাই করুন।`);
          } else {
            log(`✅ Registration success: ${subAdmin.full_name}`);
            await sendMsg(TELEGRAM_BOT_TOKEN, chatId, `✅ <b>অভিনন্দন ${subAdmin.full_name}!</b>\nরেজিস্ট্রেশন সফল হয়েছে। এখন আপনি গ্রুপ থেকে অর্ডার ক্লেইম করতে পারবেন।`);
          }
          return;
        }

        if (text === "/start" || text === "/start@TukTakExchangeBot") {
          log(`👋 Start received from ${telegramId}`);
          await sendMsg(TELEGRAM_BOT_TOKEN, chatId, "👋 স্বাগতম! রেজিস্ট্রেশন করতে লিখুন: <code>/start_your_username</code>\n\nউদাহরণ: <code>/start_shohag</code>");
          return;
        }
      }

      // 2. CLAIM BUTTON HANDLER
      if (body.callback_query) {
        const cb = body.callback_query;
        const telegramId = cb.from.id.toString();
        const cbData = cb.data;

        log(`🖱 Button Click: ${cbData} by ${telegramId}`);

        // STOP LOADING SPINNER
        await answerCb(TELEGRAM_BOT_TOKEN, cb.id, "প্রসেসিং হচ্ছে...", false);

        if (cbData.startsWith("claim_")) {
          const txId = cbData.split("_")[1];
          const { data: subAdmin } = await supabase
            .from('sub_admins')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle();
          
          if (!subAdmin) {
            log(`⚠️ Unregistered click from ${telegramId}`);
            await sendMsg(TELEGRAM_BOT_TOKEN, cb.from.id, "❌ আপনি নিবন্ধিত নন! দয়া করে আপনার প্রাইভেট বটে রেজিস্ট্রেশন সম্পন্ন করুন।");
            return;
          }

          const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).maybeSingle();
          if (!tx) {
            await sendMsg(TELEGRAM_BOT_TOKEN, cb.from.id, "❌ Order পাওয়া যায়নি।");
            return;
          }

          // PERMISSION CHECK (Enhanced)
          const allowedServices = subAdmin.allowed_services || [];
          const txType = tx.type?.toLowerCase(); // ensure lowercase matching
          
          // If sub-admin has restrictions, check if txType is allowed
          if (allowedServices.length > 0 && !allowedServices.includes(txType)) {
            log(`🚫 Access Denied: ${subAdmin.username} attempted to claim ${txType}`);
            await sendMsg(TELEGRAM_BOT_TOKEN, cb.from.id, `❌ <b>নিষেধাজ্ঞা:</b> আপনি ${txType.replace('_', ' ').toUpperCase()} অর্ডার ক্লেইম করার জন্য অনুমোদিত নন।`);
            return;
          }

          if (tx.assigned_sub_admin_id) {
            log(`⏳ Already claimed: ${txId}`);
            await sendMsg(TELEGRAM_BOT_TOKEN, cb.from.id, "⏳ দুঃখিত, এটি অলরেডি অন্য একজন ক্লেইম করেছেন।");
            return;
          }

          // DB Update
          log(`✍️ Updating DB for Claim: ${txId} by ${subAdmin.full_name}`);
          const { error: upError } = await supabase.from('transactions').update({ 
            assigned_sub_admin_id: subAdmin.id, 
            status: 'pending', 
            claim_time: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            reclaim_notified: false
          }).eq('id', txId);

          if (!upError) {
            const originalText = cb.message.text || "";
            const updatedText = originalText + `\n\n📌 <b>Claimed By:</b> ${subAdmin.full_name}\n⏳ <b>Status:</b> Claimed (Please Accept in Panel)`;
            
            await editMsg(TELEGRAM_BOT_TOKEN, cb.message.chat.id, cb.message.message_id, updatedText);
            await sendMsg(TELEGRAM_BOT_TOKEN, cb.from.id, `✅ আপনি অর্ডারটি (ID: ${txId}) ক্লেইম করেছেন। প্যানেলে গিয়ে ৫ মিনিটের মধ্যে একশন না নিলে এটি পুনরায় ওপেন হয়ে যাবে।`);
            log(`🎉 Order ${txId} claimed by agent via Telegram`);
          } else {
            log(`🔥 DB Update Error: ${upError.message}`);
          }
        }
      }
    } catch (e: any) {
      log(`🔥 Update Process Error: ${e.message}`);
    }
  }

  // Start Polling in background
  pollUpdates();

  // Serve Frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server on port ${PORT}`));
}

// Helpers
const sendMsg = async (t: string, c: any, text: string, mode = "HTML") => {
  const res = await fetch(`https://api.telegram.org/bot${t}/sendMessage`, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({ chat_id: c, text, parse_mode: mode }) 
  });
  const data = await res.json();
  if (!data.ok) console.error("❌ sendMsg Error:", data);
  return data;
};

const answerCb = async (t: string, id: string, text: string, show: boolean) => {
  const res = await fetch(`https://api.telegram.org/bot${t}/answerCallbackQuery`, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({ callback_query_id: id, text, show_alert: show }) 
  });
  const data = await res.json();
  if (!data.ok) console.error("❌ answerCb Error:", data);
  return data;
};

const editMsg = async (t: string, c: any, m: any, text: string) => {
  const res = await fetch(`https://api.telegram.org/bot${t}/editMessageText`, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({ 
      chat_id: c, 
      message_id: m, 
      text, 
      parse_mode: "HTML", 
      reply_markup: { 
        inline_keyboard: [[{ text: "✅ Claimed (Action Required)", callback_data: `claimed_lock` }]] 
      } 
    }) 
  });
  const data = await res.json();
  if (!data.ok) console.error("❌ editMsg Error:", data);
  return data;
};

startServer();
