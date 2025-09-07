const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const router = express.Router();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

router.post('/summary', authMiddleware, permissionMiddleware('page:ai-insights:view'), async (req, res) => {
    const { contributions, campaigns, period } = req.body;
    const prompt = `Analyze the following contribution data for the period: ${period}. Provide a concise, insightful summary for a non-profit manager. Include total contributions, top campaign, trends, and average contribution. Data: Campaigns: ${JSON.stringify(campaigns)}, Contributions: ${JSON.stringify(contributions.slice(0, 100))}`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.3 } });
        res.json({ summary: response.text });
    } catch (error) { res.status(500).json({ error: "AI analysis failed." }); }
});

router.post('/note', authMiddleware, permissionMiddleware('page:contributions:view'), async (req, res) => {
    const { donorName, amount, campaignName } = req.body;
    const prompt = `Generate a warm, personal 3-4 sentence thank you note to ${donorName} for their contribution of ₹${amount} to the "${campaignName}" campaign.`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.7 } });
        res.json({ note: response.text });
    } catch (error) { res.status(500).json({ error: "AI note generation failed." }); }
});

module.exports = router;
