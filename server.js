const express = require('express');
const cors = require('cors');
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

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
        await client.signInUser({ apiId, apiHash }, {
            phoneNumber: userPhone,
            phoneCode: async () => code,
            password: async () => {
                // Agar akkauntda 2FA bo'lsa, bu yerda to'xtaydi va frontendga signal beradi
                throw new Error("2FA_REQUIRED");
            }
        });
        res.json({ success: true, need2FA: false, session: client.session.save() });
    } catch (e) {
        if (e.message === "2FA_REQUIRED" || e.message.includes("SESSION_PASSWORD_NEEDED")) {
            res.json({ success: true, need2FA: true, message: "2FA parol kerak!" });
        } else {
            res.json({ success: false, error: e.message });
        }
    }
});

// 3. 2FA (Ikki bosqichli) parolni tekshirish
app.post('/check-password', async (req, res) => {
    const password = req.body.password;
    try {
        // Parolni kiritib seansni yakunlaymiz
        await client.signInUser({ apiId, apiHash }, {
            phoneNumber: userPhone,
            password: async () => password,
        });
        res.json({ success: true, session: client.session.save() });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.listen(3000, () => console.log("Server yields..."));
