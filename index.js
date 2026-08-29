import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import fs from "fs";

const logger = pino({ level: "silent" });

// ==============================
// KONFIGURASI
// ==============================
const ADMIN_NUMBER = "6281266602031"; // GANTI dengan nomor admin, contoh: 6281234567890
const DATA_FILE = "./data/laporan.json";

if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

const welcomeMessage = `*🇮🇩 SELAMAT DATANG DI PORTAL PENGADUAN DAN ASPIRASI MASYARAKAT*
*YONIF TP 953/HARIMAU RAWA 🇮🇩*

Portal ini merupakan sarana komunikasi masyarakat untuk menyampaikan laporan, pengaduan, informasi, serta aspirasi. Kami akan menerima dan menindaklanjutinya sesuai ketentuan yang berlaku.

*Apakah ada yang bisa kami bantu?*`;

const menuText = `*📋 MENU LAYANAN MASYARAKAT*

Silakan pilih layanan yang Anda butuhkan melalui menu di bawah.

🇮🇩 *YONIF TP 953/HARIMAU RAWA*`;

const menuSections = [{
  title: "LAYANAN MASYARAKAT",
  rows: [
    { title: "📢 Pengaduan Masyarakat", rowId: "menu_pengaduan", description: "Sampaikan pengaduan atau keluhan." },
    { title: "💬 Aspirasi Masyarakat", rowId: "menu_aspirasi", description: "Sampaikan aspirasi dan usulan." },
    { title: "📝 Laporan", rowId: "menu_laporan", description: "Kirim laporan kejadian/informasi." },
    { title: "ℹ️ Informasi", rowId: "menu_informasi", description: "Dapatkan informasi pelayanan." },
    { title: "💡 Saran & Masukan", rowId: "menu_saran", description: "Berikan kritik, saran dan masukan." },
    { title: "👮 Hubungi Petugas", rowId: "menu_petugas", description: "Hubungi petugas pelayanan." }
  ]
}];

const sessions = new Map();

function getData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return []; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function ticket() {
  return "Y953-" + Date.now().toString().slice(-8);
}

async function sendMainMenu(sock, jid) {
  await sock.sendMessage(jid, { text: menuText });
  // List message. Baileys/WhatsApp client support can vary by version.
  await sock.sendMessage(jid, {
    text: "Tekan tombol di bawah untuk membuka daftar layanan.",
    footer: "YONIF TP 953/HARIMAU RAWA",
    title: "📋 MENU LAYANAN",
    buttonText: "BUKA MENU",
    sections: menuSections
  });
}

async function sendWelcome(sock, jid) {
  await sock.sendMessage(jid, { text: welcomeMessage });
  await new Promise(r => setTimeout(r, 700));
  await sendMainMenu(sock, jid);
}

async function handleSelection(sock, jid, id) {
  const replies = {
    menu_pengaduan: `*📢 PENGADUAN MASYARAKAT*

Silakan kirim pengaduan Anda.

Format yang disarankan:
*Nama:*
*Alamat:*
*No. HP:*
*Isi Pengaduan:*
*Lokasi Kejadian:*
*Waktu Kejadian:*

Jika ada foto/video/dokumen pendukung, silakan lampirkan.

Ketik *SELESAI* setelah semua data dikirim.
Ketik *MENU* untuk kembali ke menu utama.`,

    menu_aspirasi: `*💬 ASPIRASI MASYARAKAT*

Silakan sampaikan aspirasi, harapan, atau usulan Anda secara jelas.

Ketik *MENU* untuk kembali ke menu utama.`,

    menu_laporan: `*📝 LAYANAN LAPORAN*

Silakan kirim laporan kejadian atau informasi yang ingin disampaikan.

Mohon sertakan lokasi, waktu kejadian, uraian kejadian, dan bukti pendukung jika ada.

Ketik *MENU* untuk kembali ke menu utama.`,

    menu_informasi: `*ℹ️ INFORMASI PELAYANAN*

Silakan tuliskan pertanyaan atau informasi yang ingin Anda ketahui.

Ketik *MENU* untuk kembali ke menu utama.`,

    menu_saran: `*💡 SARAN & MASUKAN*

Silakan sampaikan kritik, saran, atau masukan Anda untuk peningkatan pelayanan.

Ketik *MENU* untuk kembali ke menu utama.`,

    menu_petugas: `*👮 HUBUNGI PETUGAS*

Silakan tuliskan keperluan Anda. Pesan akan diteruskan kepada petugas.

Ketik *MENU* untuk kembali ke menu utama.`
  };

  if (replies[id]) {
    sessions.set(jid, { type: id });
    await sock.sendMessage(jid, { text: replies[id] });
    return true;
  }
  return false;
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    auth: state,
    logger,
    browser: ["Yonif TP 953", "Chrome", "1.0.0"],
    markOnlineOnConnect: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nSCAN QR WHATSAPP:\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") console.log("\n✅ BOT YONIF TP 953 AKTIF\n");
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log("Koneksi terputus, mencoba menyambung kembali...");
        setTimeout(connect, 2000);
      } else {
        console.log("Session logout. Hapus folder auth_info lalu jalankan kembali.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages?.[0];
    if (!msg?.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (!jid || jid === "status@broadcast") return;

    const text = (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
      msg.message.buttonsResponseMessage?.selectedButtonId ||
      msg.message.templateButtonReplyMessage?.selectedId ||
      ""
    ).trim();

    if (!text) return;
    const lower = text.toLowerCase();

    console.log(`[${jid}] ${text}`);

    // Perintah utama
    if (["menu", "start", "/start", "halo", "hai", "hello"].includes(lower)) {
      sessions.delete(jid);
      await sendWelcome(sock, jid);
      return;
    }

    // Pilihan list
    if (await handleSelection(sock, jid, text)) return;

    // Angka 1-6 sebagai fallback
    const numeric = {
      "1": "menu_pengaduan",
      "2": "menu_aspirasi",
      "3": "menu_laporan",
      "4": "menu_informasi",
      "5": "menu_saran",
      "6": "menu_petugas"
    };
    if (numeric[lower]) {
      await handleSelection(sock, jid, numeric[lower]);
      return;
    }

    const session = sessions.get(jid);

    // Kumpulkan pesan untuk layanan yang dipilih
    if (session) {
      if (lower === "selesai") {
        const data = getData();
        const nomor = ticket();
        const record = {
          tiket: nomor,
          pengirim: jid,
          layanan: session.type,
          isi: session.messages || [],
          waktu: new Date().toISOString()
        };
        data.push(record);
        saveData(data);

        await sock.sendMessage(jid, {
          text: `*✅ PESAN TELAH DITERIMA*

Nomor tiket: *${nomor}*

Terima kasih. Pesan Anda telah diterima dan akan ditindaklanjuti sesuai ketentuan yang berlaku.

Ketik *MENU* untuk kembali ke menu utama.`
        });

        // Kirim notifikasi ringkas ke admin jika nomor sudah dikonfigurasi
        if (!ADMIN_NUMBER.includes("X")) {
          const summary = (record.isi || []).join("\n\n");
          await sock.sendMessage(ADMIN_NUMBER + "@s.whatsapp.net", {
            text: `*📥 LAPORAN BARU - ${nomor}*

Layanan: ${session.type}
Pengirim: ${jid}

${summary}`
          });
        }

        sessions.delete(jid);
        return;
      }

      session.messages = session.messages || [];
      session.messages.push(text);
      sessions.set(jid, session);

      await sock.sendMessage(jid, {
        text: `✅ Pesan diterima.

Silakan lanjutkan data Anda. Ketik *SELESAI* jika sudah selesai atau *MENU* untuk kembali.`
      });
      return;
    }

    // Jika tidak dikenali
    await sock.sendMessage(jid, {
      text: `❗ *PILIHAN TIDAK DIKENALI*

Silakan ketik *MENU* untuk membuka menu layanan.`
    });
  });
}

connect();
