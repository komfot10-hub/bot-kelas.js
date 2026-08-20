hconst { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const cron = require('node-cron');

// 1. Nomor WA Bot Anda (Format: 628xxx)
const BOT_NUMBER = '628988094876';

// 2. Kode Tautan Saluran
const CHANNEL_INVITE_CODE = '0029Vb8brwHBfxoA4Novyd3t';
let TARGET_JID = null;

const jadwalPelajaran = {
    1: ["Bahasa Indonesia", "PJOK", "Matematika"],
    2: ["Informatika", "Matematika", "IPS"],
    3: ["SBDP", "Bahasa Inggris", "PKN"],
    4: ["Agama Islam", "IPA", "B. Inggris"],
    5: ["IPS", "Bahasa Indonesia", "IPA"]
};

const jadwalPiket = {
    1: ["Adul", "Afra", "Gibran", "Aisyah", "Ali", "Aulia", "Athallah", "Nura"],
    2: ["Aliva", "Auxilia", "Davina", "Debora", "Fairel", "Fajar", "Danish"],
    3: ["Farelio", "Gita", "Hizam", "Iluska", "Khalisa", "Deri", "Syifa"],
    4: ["Husen", "Kenji", "Syaqa", "Alfarizqi", "Herrafa", "Narulita", "Hariz"],
    5: ["Natasya", "Daffa", "Rangga", "Salsa", "Jati", "Kirana", "Maura"]
};

const jadwalSeragam = {
    1: "Putih Biru",
    2: "Putih Biru",
    3: "Pramuka",
    4: "Batik Ungu / Batik dari sekolah",
    5: "Busana Muslim"
};

// Fungsi Utama Pengirim Jadwal
async function kirimPesanJadwal(sock) {
    if (!TARGET_JID) {
        console.log('⚠️ Gagal: Saluran belum terhubung!');
        return;
    }

    const besok = new Date();
    besok.setDate(besok.getDate() + 1);
    const hariBesokIndex = besok.getDay();

    const mapel = jadwalPelajaran[hariBesokIndex];
    const piket = jadwalPiket[hariBesokIndex];
    const seragam = jadwalSeragam[hariBesokIndex] || "(sesuai hari)";

    if (mapel && piket) {
        const tglStr = besok.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const hariStr = besok.toLocaleDateString('id-ID', { weekday: 'long' });
        const hariFormatted = hariStr.charAt(0).toUpperCase() + hariStr.slice(1);

        const tanggalFormatted = `${tglStr}/${hariFormatted}`;

        const mapelFormatted = mapel.map((item, index) => {
            const isLast = index === mapel.length - 1;
            return `·\t${item}${isLast ? ' ( jam terakhir )' : ''}`;
        });

        if (mapelFormatted.length > 2) {
            mapelFormatted.splice(2, 0, '————————— 𝘪𝘴𝘵𝘪𝘳𝒂𝘩𝘢𝘵');
        }

        const teksMapel = mapelFormatted.join('\n');
        const teksPiket = piket.map(item => `·\t${item}`).join('\n');

        const pesan = `🌟𝒂𝒔𝒔𝒂𝒍𝒂𝒎𝒖𝒂𝒍𝒂𝒊𝒌𝒖𝒎 𝒘𝒓. 𝒘𝒃.🌟

 ────🪼───

𝗺𝗲𝗻𝗴𝗶𝗻𝗴𝗮𝘁𝗸𝗮𝗻 𝗯𝗲𝘀𝗼𝗸 𝘁𝗮𝗻𝗴𝗴𝗮𝗹  > ${tanggalFormatted} <

━━━━━━━━━━━━━━━━━━━━━━━

📚𝐉αᑯωαᥣ ρ𝖾ᥣα𝗃αρη 📚
${teksMapel}

🧹𝗔𝗻𝗴𝗴𝗼𝘁𝗮 𝗣𝗶𝗸𝗲𝘁
${teksPiket}

Seragam
·       ${seragam}
——————🪼—————

📒Note
·       𝗬𝗮𝗻𝗴 𝗿𝗮𝗷𝗶𝗻 𝘀𝗲𝗸𝗼𝗹𝗮𝗵𝗻𝘆𝗮 𝗷𝗮𝗻𝗴𝗮𝗻 𝗸𝗲𝗯𝗮𝗻𝘆𝗮𝗸𝗮𝗻 𝗜𝘇𝗶𝗻/𝗔𝗹𝗽𝗵a
━━━━━━━━━━━━━━━━━━━━━━━`;

        try {
            await sock.sendMessage(TARGET_JID, { text: pesan });
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Jadwal pengingat BERHASIL terkirim ke Saluran!`);
        } catch (err) {
            console.error('❌ Gagal mengirim pesan ke saluran:', err);
        }
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        keepAliveIntervalMs: 30000
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(BOT_NUMBER);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`\nKODE PAIRING WHATSAPP ANDA: ${code}\n`);
            } catch (err) {
                console.error('Gagal mendapatkan pairing code:', err);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot WhatsApp BERHASIL terhubung!');
            try {
                const metadata = await sock.newsletterMetadata("invite", CHANNEL_INVITE_CODE);
                TARGET_JID = metadata.id;
                console.log(`📢 Saluran Terhubung: ${metadata.name}`);
            } catch (err) {
                console.error('Gagal mengambil metadata saluran:', err);
            }
        }
    });

    // 📩 Mendeteksi ketikan .tes di mana saja (termasuk langsung di dalam Saluran)
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const body = msg.message.conversation ||
                     msg.message.extendedTextMessage?.text ||
                     msg.message.protocolMessage?.editedMessage?.conversation || '';

        if (body.trim().toLowerCase() === '.tes') {
            console.log('📌 Perintah .tes terdeteksi! Mengirim pesan jadwal ke Saluran...');
            await kirimPesanJadwal(sock);
        }
    });

    // Rutin otomatis Minggu - Kamis jam 20.00 WIB
    cron.schedule('0 20 * * 0-4', async () => {
        await kirimPesanJadwal(sock);
    }, {
        timezone: "Asia/Jakarta"
    });
}

startBot()
