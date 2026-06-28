const express = require('express');
const cors = require('cors');
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");

const app = express();
app.use(cors());
app.use(express.json());

const apiId = 10489159;
const apiHash = "6b2c509f05b3c529eddb9326a813bf0f";
let stringSession = new StringSession("");
let client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

let phoneCodeHash = null;
let userPhone = "";

// 1. Kod yuborish
app.post('/send-code', async (req, res) => {
    userPhone = req.body.phone;
    await client.connect();
    try {
        const result = await client.sendCode({ apiId, apiHash }, userPhone);
        phoneCodeHash = result.phoneCodeHash;
        res.json({ success: true, message: "Kod yuborildi!" });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// 2. SMS kodni tekshirish
app.post('/login', async (req, res) => {
    const code = req.body.code;
    try {
        // GramJS'ning eng quyi va eng barqaror moduli orqali kirish
        const result = await client.invoke(
            new Api.auth.SignIn({
                phoneNumber: userPhone,
                phoneCodeHash: phoneCodeHash,
                phoneCode: code,
            })
        );
        
        // Agar foydalanuvchi muvaffaqiyatli kirsa (2FA yo'q bo'lsa)
        res.json({ success: true, need2FA: false, session: client.session.save() });
    } catch (e) {
        // Agar akkauntda 2FA bo'lsa, Telegram SESSION_PASSWORD_NEEDED xatosini qaytaradi
        if (e.message.includes("SESSION_PASSWORD_NEEDED")) {
            res.json({ success: true, need2FA: true, message: "2FA kerak!" });
        } else {
            res.json({ success: false, error: e.message });
        }
    }
});

// 3. 2FA parolini tekshirish (authParams xatosini 100% yo'qotadi)
app.post('/check-password', async (req, res) => {
    const password = req.body.password;
    try {
        // Shunchaki o'rnatilgan parolni tekshirish funksiyasini chaqiramiz
        await client.checkPassword({
            password: password
        });
        res.json({ success: true, session: client.session.save() });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.listen(3000, () => console.log("Server barqaror ishlamoqda..."));
