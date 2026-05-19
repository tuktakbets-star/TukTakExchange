import { VercelRequest, VercelResponse } from '@vercel/node';

// Standard Node fetch is available in Vercel Node 18+
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers just in case
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- GET Method for Testing ---
  if (req.method === 'GET') {
    const token = process.env.TELEGRAM_BOT_TOKEN ? 'Set (Hidden)' : 'NOT SET ❌';
    const chatId = process.env.TELEGRAM_CHAT_ID ? 'Set (Hidden)' : 'NOT SET ❌';
    return res.status(200).json({ 
      status: 'API is online 🚀', 
      config: { token, chatId },
      note: 'Send a POST request with order data to notify Telegram.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Missing Telegram configuration on Vercel');
    return res.status(500).json({ 
      error: 'Missing Telegram configuration', 
      details: 'Ensure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set in Vercel Env Vars' 
    });
  }

  try {
    const payload = req.body || {};
    // Handle both direct transactions and Supabase webhook records
    const record = payload.record || payload.new || payload;

    if (!record || (typeof record === 'object' && Object.keys(record).length < 2)) {
      console.log('Skipping: No data found in payload');
      return res.status(200).json({ status: "ignored", reason: "no_data_found" });
    }

    const userName = record.user_name || record.userName || record.full_name || record.name || "Customer";
    const orderType = (record.type || record.order_type || "Transaction").replace('_', ' ').toUpperCase();
    const amount = record.amount || record.source_amount || record.total_amount || 0;
    const currency = record.currency || (record.type?.includes('withdraw') ? 'BDT' : 'VND');
    const country = record.country || record.target_country || "Bangladesh";
    const txId = record.id || record.uid || record.tx_id || "tx_" + Date.now();
    
    let bankInfo: any = {};
    try {
      bankInfo = typeof record.bank_info === 'string' ? JSON.parse(record.bank_info) : (record.bank_info || record.bankInfo || record.receiver_info || {});
    } catch (e) {
      bankInfo = record;
    }
    
    const bankName = (bankInfo as any).bankName || (bankInfo as any).bank_name || record.method || record.account_type || "N/A";
    const holderName = (bankInfo as any).accountName || (bankInfo as any).account_name || (bankInfo as any).name || record.receiverName || "N/A";
    const accNumber = (bankInfo as any).accountNumber || (bankInfo as any).account_number || record.receiver_number || record.receiverPhone || (bankInfo as any).account_no || "N/A";

    const now = new Date();
    // Offset for Bangladesh time (approximate)
    const timeStr = now.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const currentBaseUrl = `${protocol}://${host}`;
    const appUrl = (process.env.APP_URL || currentBaseUrl).replace(/\/$/, ''); // Remove trailing slash

    const message = `🚀 <b>New ${orderType} Received!</b>\n\n` +
                    `👤 <b>User:</b> ${userName}\n` +
                    `🌍 <b>Country:</b> ${country}\n` +
                    `💰 <b>Amount:</b> ${Number(amount).toLocaleString()} ${currency}\n` +
                    (record.target_currency && record.target_amount ? `🎯 <b>Target:</b> ${Number(record.target_amount).toLocaleString()} ${record.target_currency}\n` : '') +
                    `💳 <b>Method:</b> ${bankName}\n` +
                    `🔢 <b>Number:</b> <code>${accNumber}</code>\n` +
                    `👤 <b>Holder:</b> ${holderName}\n` +
                    `🆔 <b>ID:</b> <code>${txId}</code>\n` +
                    `⏰ <b>Time:</b> ${timeStr}\n\n` +
                    `<a href="${appUrl}/admin-dashboard">📥 ক্লেইম করুন (View Admin)</a>`;

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [[{ text: "📥 ক্লেইম করুন (Claim Now)", callback_data: `claim_${txId}` }]]
        }
      }),
    });

    const data: any = await response.json();
    console.log('Telegram API Response:', data);

    if (!data.ok) {
      return res.status(502).json({ success: false, error: data.description });
    }

    return res.status(200).json({ success: true, record_id: txId });
  } catch (error: any) {
    console.error('Vercel API Notifier Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
