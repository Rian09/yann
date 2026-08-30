const { Client, LocalAuth, Buttons, List } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'yonif-tp-953' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

const sessions = new Map();
const welcome = `*🇮🇩 SELAMAT DATANG DI PORTAL PENGADUAN DAN ASPIRASI MASYARAKAT
YONIF TP 953/HARIMAU RAWA 🇮🇩*

Portal ini merupakan sarana komunikasi masyarakat untuk menyampaikan laporan, pengaduan, informasi, serta aspirasi. Kami akan menerima dan menindaklanjutinya sesuai ketentuan yang berlaku

*Apakah ada yang bisa kami bantu?*`;

const menuText = `📋 *MENU LAYANAN MASYARAKAT*

Silakan pilih layanan yang Anda butuhkan:

1️⃣ *BUAT PENGADUAN*
2️⃣ *ASPIRASI MASYARAKAT*
3️⃣ *INFORMASI*
4️⃣ *CEK STATUS PENGADUAN*
5️⃣ *KONTAK PETUGAS*
6️⃣ *BANTUAN*

Balas dengan angka *1–6*.`;

async function sendMenu(msg) {
  // Buttons/List support varies by WhatsApp Web/client version.
  // If interactive messages are unavailable, numbered replies still work.
  try {
    const buttons = new Buttons(
      menuText,
      [
        { body: '1️⃣ Buat Pengaduan' },
        { body: '2️⃣ Aspirasi' },
        { body: '3️⃣ Informasi' }
      ],
      'Portal YONIF TP 953',
      'Pilih layanan'
    );
    await msg.reply(buttons);
    await msg.reply('➡️ Untuk layanan 4–6, balas angka *4*, *5*, atau *6*.');
  } catch {
    await msg.reply(menuText);
  }
}

async function startChat(msg) {
  await msg.reply(welcome);
  await sendMenu(msg);
}

async function handleChoice(msg, choice) {
  const chatId = msg.from;

  if (choice === '1') {
    sessions.set(chatId, { type: 'pengaduan', step: 1, data: {} });
    return msg.reply(`📝 *BUAT PENGADUAN*\n\nSilakan kirim *nama lengkap* Anda.`);
  }
  if (choice === '2') {
    sessions.set(chatId, { type: 'aspirasi', step: 1, data: {} });
    return msg.reply(`💡 *ASPIRASI MASYARAKAT*\n\nSilakan kirim *nama lengkap* Anda.`);
  }
  if (choice === '3') {
    return msg.reply(`ℹ️ *INFORMASI PELAYANAN*\n\nLayanan ini menerima pengaduan, laporan, informasi, dan aspirasi masyarakat.\n\nUntuk kembali ke menu, kirim pesan apa saja.`);
  }
  if (choice === '4') {
    return msg.reply(`🔎 *CEK STATUS PENGADUAN*\n\nSilakan kirim *nomor/tiket pengaduan* Anda.\n\nCatatan: versi tanpa database/admin belum dapat melakukan pencarian status secara nyata.`);
  }
  if (choice === '5') {
    return msg.reply(`👮 *KONTAK PETUGAS*\n\nSilakan hubungi petugas pelayanan melalui nomor WhatsApp resmi yang ditetapkan oleh satuan.\n\nGanti teks ini dengan nomor/kontak resmi Anda.`);
  }
  if (choice === '6') {
    return msg.reply(`❓ *BANTUAN*\n\nKetik angka:\n1️⃣ Pengaduan\n2️⃣ Aspirasi\n3️⃣ Informasi\n4️⃣ Cek Status\n5️⃣ Kontak Petugas\n6️⃣ Bantuan\n\nAnda tidak perlu mengetik kata “menu”.`);
  }
  return sendMenu(msg);
}

async function handleSession(msg, s) {
  if (s.step === 1) {
    s.data.nama = msg.body.trim();
    s.step = 2;
    return msg.reply('Silakan kirim *nomor HP yang dapat dihubungi*.');
  }
  if (s.step === 2) {
    s.data.hp = msg.body.trim();
    s.step = 3;
    return msg.reply('Silakan tuliskan *isi pengaduan/aspirasi* Anda.');
  }
  if (s.step === 3) {
    s.data.isi = msg.body.trim();
    s.step = 4;
    return msg.reply('Jika ada, kirim *lokasi/kejadian*. Jika tidak ada, balas *-*.');
  }
  if (s.step === 4) {
    s.data.lokasi = msg.body.trim();
    const kode = `953-${Date.now().toString().slice(-6)}`;
    sessions.delete(msg.from);
    return msg.reply(
      `✅ *DATA TELAH DITERIMA*\n\n` +
      `Nomor/Tiket: *${kode}*\n` +
      `Nama: ${s.data.nama}\n` +
      `HP: ${s.data.hp}\n` +
      `Isi: ${s.data.isi}\n` +
      `Lokasi: ${s.data.lokasi}\n\n` +
      `Terima kasih. Simpan nomor tiket tersebut untuk referensi.`
    );
  }
}

client.on('qr', qr => {
  console.log('\\nScan QR berikut menggunakan WhatsApp di HP Anda:\\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Bot WhatsApp YONIF TP 953 siap digunakan.');
});

client.on('auth_failure', msg => console.error('❌ Autentikasi gagal:', msg));
client.on('disconnected', reason => console.log('⚠️ WhatsApp terputus:', reason));

client.on('message', async msg => {
  if (msg.fromMe || msg.from.endsWith('@g.us') || msg.from === 'status@broadcast') return;

  const text = msg.body.trim();
  const existing = sessions.get(msg.from);

  try {
    // Jika sedang mengisi formulir, lanjutkan sesi.
    if (existing) return await handleSession(msg, existing);

    // Pesan pertama apa pun -> pembuka + menu.
    const chat = await msg.getChat();
    const lastMessages = await chat.fetchMessages({ limit: 5 });
    const isFirstBotInteraction = !lastMessages.some(m => m.fromMe);

    // Untuk memastikan menu selalu mudah diakses, angka 1-6 langsung diproses.
    if (/^[1-6]$/.test(text)) return await handleChoice(msg, text);

    await startChat(msg);
  } catch (err) {
    console.error(err);
    await msg.reply('⚠️ Terjadi kesalahan. Silakan kirim pesan kembali.');
  }
});

client.initialize();
