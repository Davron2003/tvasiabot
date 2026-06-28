const express = require('express');
const cors = require('cors');
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const app = express();
app.use(cors()); // Telefonlar ulanishi uchun ruxsat beramiz
app.use(express.json());

const apiId = 10489159;
const apiHash = "6b2c509f05b3c529eddb9326a813bf0f";
let stringSession = new StringSession("");
let client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

let phoneCodeHash = null;
let userPhone = "";

// 1. Telefondan raqam kiritilganda server Telegramga so'rov yuboradi
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

// 2. Telefondan SMS kod kelganda tizimga kiradi
app.post('/login', async (req, res) => {
    const code = req.body.code;
    try {
        await client.signInUser({ apiId, apiHash }, {
            phoneNumber: userPhone,
            phoneCode: async () => code,
        });
        res.json({ success: true, session: client.session.save() });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.listen(3000, () => console.log("Server 3000-portda yields..."));