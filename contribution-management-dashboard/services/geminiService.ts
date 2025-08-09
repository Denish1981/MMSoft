import type { Contribution, Campaign } from "../types";
import { API_URL } from '../config';

export const generateContributionSummary = async (contributions: Contribution[], campaigns: Campaign[], period: string, token: string | null): Promise<{ summary?: string; error?: string }> => {
    if (!token) {
        return { error: "Authentication token is missing. Please log in again." };
    }
    try {
        const response = await fetch(`${API_URL}/ai/summary`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ contributions, campaigns, period }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `AI summary generation failed with status: ${response.status}`);
        }
        return { summary: data.summary };
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("Error generating contribution summary:", message);
        return { error: `An error occurred while analyzing the contribution data: ${message}` };
    }
};

export const generateThankYouNote = async (donorName: string, amount: number, campaignName: string, token: string | null): Promise<{ note?: string; error?: string }> => {
    if (!token) {
        return { error: "Failed to generate thank you note: Authentication token is missing." };
    }
    try {
        const response = await fetch(`${API_URL}/ai/note`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ donorName, amount, campaignName }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Thank you note generation failed with status: ${response.status}`);
        }
        return { note: data.note };
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("Error generating thank you note:", message);
        return { error: `Failed to generate thank you note: ${message}` };
    }
};
