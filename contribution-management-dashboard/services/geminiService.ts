
import type { Contribution, Campaign } from "../types";
import { API_URL } from '../config';

export const generateContributionSummary = async (contributions: Contribution[], campaigns: Campaign[], period: string) => {
    try {
        const response = await fetch(`${API_URL}/ai/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contributions, campaigns, period }),
        });
        if (!response.ok) {
            throw new Error(`AI summary generation failed with status: ${response.status}`);
        }
        const data = await response.json();
        return data.summary;
    } catch (error) {
        console.error("Error generating contribution summary:", error);
        return "An error occurred while analyzing the contribution data. Please check the console for details.";
    }
};

export const generateThankYouNote = async (donorName: string, amount: number, campaignName: string) => {
    try {
        const response = await fetch(`${API_URL}/ai/note`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ donorName, amount, campaignName }),
        });
        if (!response.ok) {
            throw new Error(`Thank you note generation failed with status: ${response.status}`);
        }
        const data = await response.json();
        return data.note;
    } catch (error) {
        console.error("Error generating thank you note:", error);
        return "Failed to generate thank you note.";
    }
};
