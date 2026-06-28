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

// Aloqani tekshirish funksiyasi
async function ensureConnected() {
    if (!client.connected) {
        console.log("🔄 Telegram bilan aloqa qayta tiklanmoqda...");
        await client.connect();
    }
}

// 1. Kod yuborish
app.post('/send-code', async (req, res) => {
    userPhone = req.body.phone;
    try {
        await client.connect(); // Birinchi ulanish
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
        await ensureConnected(); // Aloqa borligini 100% tekshiramiz!
        
        const result = await client.invoke(
            new Api.auth.SignIn({
                phoneNumber: userPhone,
                phoneCodeHash: phoneCodeHash,
                phoneCode: code,
            })
        );
        
        res.json({ success: true, need2FA: false, session: client.session.save() });
    } catch (e) {
        if (e.message.includes("SESSION_PASSWORD_NEEDED")) {
            res.json({ success: true, need2FA: true, message: "2FA kerak!" });
        } else {
            res.json({ success: false, error: e.message });
        }
    }
});

// 3. 2FA parolini tekshirish
app.post('/check-password', async (req, res) => {
    const password = req.body.password;
    try {
        await ensureConnected(); // Bu yerda ham aloqani tekshiramiz!
        
        await client.checkPassword({
            password: password
        });
        res.json({ success: true, session: client.session.save() });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});
// ... (eski kodlar, ulanishlar va login qismlari o'z joyida qoladi)

// 4. Chatlar ro'yxatini olish (Maksimum 20 ta eng oxirgi chat)
app.post('/get-chats', async (req, res) => {
    const sessionStr = req.body.session;
    try {
        // Telefonda saqlangan seans kaliti bilan yangi mijoz yaratamiz
        const userSession = new StringSession(sessionStr);
        const userClient = new TelegramClient(userSession, apiId, apiHash, { connectionRetries: 3 });
        
        await userClient.connect();
        
        // Telegramdan oxirgi chatlar ro'yxatini yuklash
        const dialogs = await userClient.getDialogs({ limit: 20 });
        
        const chatList = dialogs.map(dialog => {
            let lastMessage = "Xabar yo'q";
            if (dialog.message) {
                lastMessage = dialog.message.message || "[Media xabar]";
            }
            
            // Onlayn holatini aniqlash
            let status = "kecha";
            if (dialog.entity && dialog.entity.status) {
                if (dialog.entity.status.className === "UserStatusOnline") status = "online";
            }

            return {
                id: dialog.id.toString(),
                title: dialog.title || "Yashirin suhbat",
                unreadCount: dialog.unreadCount || 0,
                lastMessage: lastMessage.substring(0, 45) + (lastMessage.length > 45 ? "..." : ""),
                status: status
            };
        });

        res.json({ success: true, chats: chatList });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.listen(3000, () => console.log("Server yields..."));
app.listen(3000, () => console.log("Server uzilishlarsiz ishlamoqda..."));
