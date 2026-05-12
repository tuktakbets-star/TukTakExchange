# Telegram Order Claim System (Update: Automatic) 📥

আপনার বটের সমস্যা সমাধানের জন্য সিস্টেমটি আপডেট করা হয়েছে। এখন এটি **Automatic Polling** ব্যবহার করে, তাই কোনো Webhook সেটআপ করার প্রয়োজন নেই।

---

### ধাপ ১: বট কানেকশন চেক করা
প্রথমে আপনার টেলিগ্রাম বটে (TukTakExchangeBot) গিয়ে নিচের কমান্ডটি দিন:
` /start `
যদি বট রিপ্লাই দেয়, তবে বুঝবেন কানেকশন ঠিক আছে।

---

### ধাপ ২: সাব-অ্যাডমিন রেজিস্ট্রেশন
অর্ডার ক্লেইম করার জন্য প্রতিটি সাব-অ্যাডমিনকে অবশ্যই বটের সাথে নিজেকে নিবন্ধন করতে হবে:
১. বটের মেসেজ বক্সে লিখুন: `/start_your_username` (যেমন: `/start_shohag`)
২. বট যদি অভিনন্দন বার্তা দেয়, তবে আপনি সফলভাবে নিবন্ধিত হয়েছেন।

---

### ধাপ ৩: সুপাবেস (Supabase) ক্লিন-আপ (পুরাতন সব ট্রিকার মোছা)
আপনার গ্রুপে এখনো পুরাতন মেসেজ আসার কারণ হলো আগের কিছু ট্রিকার ডাটাবেসে রয়ে গেছে। এগুলো মুছতে নিচের ধাপটি অনুসরণ করুন:

১. Supabase ড্যাশবোর্ডে **SQL Editor** এ যান।
২. **`Nuclear Cleanup`** নামে একটি নতুন কুয়েরি (New Query) খুলুন এবং নিচের কোডটি পেস্ট করে **Run** করুন:
   ```sql
   -- ১. আগে সব পরিচিত ট্রিকার ডিলিট করুন
   DROP TRIGGER IF EXISTS "alpha_final_v3" ON transactions;
   DROP TRIGGER IF EXISTS "v4_final_fix" ON transactions;
   DROP TRIGGER IF EXISTS "v4_final_test" ON transactions;
   DROP TRIGGER IF EXISTS "trigger_new_order_telegram" ON transactions;
   DROP TRIGGER IF EXISTS "notify_v2" ON transactions;
   DROP TRIGGER IF EXISTS "supabase_functions_notify_order" ON transactions;
   DROP TRIGGER IF EXISTS "notify_telegram" ON transactions;

   -- ২. ডিলিট হয়েছে কি না চেক করুন (ফলাফল বা রেজাল্ট খালি হতে হবে)
   SELECT trigger_name 
   FROM information_schema.triggers 
   WHERE event_object_table = 'transactions';
   ```

---

### ধাপ ৪: নতুন Webhook সেটআপ (V3 Final)
এখনই নতুন ডিজাইনের মেসেজ এবং ক্লেইম বাটন পেতে নিচের কাজটি নির্ভুলভাবে করুন:

১. Supabase-এ **Database > Webhooks** এ যান। যদি আগে কোনো হুক থেকে থাকে তবে তা **Delete** করে দিন।
২. এরপর **`CREATE NEW WEBHOOK`** এ ক্লিক করুন।
৩. **Name:** `v3_live_notifier`
৪. **Table:** `transactions`
৫. **Events:** শুধুমাত্র `Insert` (অর্ডার ক্রিয়েট হলে মেসেজ যাবে)
৬. **Webhook Type:** `HTTP Request`
৭. **Method:** `POST`
৮. **URL (হুবহু নিচের লিঙ্কটি কপি করে পেস্ট করুন):**
   `https://ais-dev-xohuxgtddbjjowtpqv33s5-712030939353.asia-southeast1.run.app/api/telegram-notifier`
৯. **Confirm / Save** করুন।

---

### ধাপ ৫: সব কিছু পরীক্ষা করা (Testing)
সব কাজ শেষ হলে নিচের ধাপগুলো একে একে করুন:

১. **ডিজাইন টেস্ট:** [এখানে ক্লিক করুন](https://ais-dev-xohuxgtddbjjowtpqv33s5-712030939353.asia-southeast1.run.app/api/test-telegram) - যদি গ্রুপে মেসেজ আসে, তবে বট একদম ঠিক আছে।
২. **সার্ভার টেস্ট:** [এখানে ক্লিক করুন](https://ais-dev-xohuxgtddbjjowtpqv33s5-712030939353.asia-southeast1.run.app/api/telegram-notifier?user_name=Testing_Manual&amount=1000&type=deposit) - এটি ব্রাউজারে রান করলে যদি গ্রুপে নতুন মেসেজ আসে, তবে বুঝবেন **Notifier URL** ঠিক আছে।
৩. **Webhook Debugging:** যদি উপরের দুটি ঠিক থাকে কিন্তু রিয়েল অর্ডারে মেসেজ না আসে, তবে Supabase-এ আপনার তৈরি করা Webhook এর পাশে **"History"** বাটনে ক্লিক করে দেখুন কোনো এরর দেখাচ্ছে কি না।

যদি কোনো সমস্যা হয়, তবে এই নিচের লিঙ্কটি ব্রাউজারে রান করে আমাকে এর স্ক্রিনশট দিন:
👉 [চেক বর্তমান স্ট্যাটাস ও লগ](https://ais-dev-xohuxgtddbjjowtpqv33s5-712030939353.asia-southeast1.run.app/api/telegram-status)

---

### সাধারণ সমস্যা সমাধান (Troubleshooting)

#### ১. বটে রিপ্লাই দিচ্ছে না:
সার্ভার অনেক সময় স্লিপ মোডে চলে যায়। স্ট্যাটাস লিঙ্কে ভিসিট করলে এটি আবার চালু হবে।

#### ২. ক্লেইম করলে এরর দেয়:
নিশ্চিত করুন যে আপনি সঠিক ইউজারনেম দিয়ে রেজিস্ট্রেশন করেছেন। এবং রেজিস্ট্রেশন মেসেজটি বটে পাঠানোর পর বট থেকে একটি রিপ্লাইও পেয়েছেন।

#### ৩. অর্ডারে বাটন আসছে না:
Supabase-এ ওয়েব হুক ডিলিট করে আবার নতুন করে উল্লিখিত লিঙ্কে (ais-pre) সেটআপ করুন।
