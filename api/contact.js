const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
        return res.status(400).json({ error: '必須項目が入力されていません。' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'メールアドレスの形式が正しくありません。' });
    }

    try {
        const { error } = await resend.emails.send({
            from: process.env.CONTACT_FROM_EMAIL,
            to: process.env.CONTACT_TO_EMAIL,
            replyTo: email,
            subject: `[Portfolio] ${name} 様からのお問い合わせ`,
            text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        });

        if (error) {
            console.error(error);
            return res.status(502).json({ error: '送信に失敗しました。時間をおいて再度お試しください。' });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: '送信に失敗しました。時間をおいて再度お試しください。' });
    }
};
