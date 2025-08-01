
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { GoogleGenAI } = require('@google/genai');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// --- Middleware ---
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));

// --- AI & Auth Setup ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const googleClient = new OAuth2Client();

// --- Production: Serve Frontend ---
if (isProduction) {
    // Serve the static files from the Vite build directory

    console.log(isProduction)
    app.use(express.static(path.join(__dirname, '../dist')));
}

// --- API Routes ---

// Authentication
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'Login successful', user: { email: result.rows[0].username } });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload?.email;

        if (!email) {
            return res.status(400).json({ message: 'Invalid Google token: email not found.' });
        }

        // Whitelist check from database
        const { rows: authorizedUsers } = await db.query('SELECT email FROM authorized_emails');
        const whitelist = authorizedUsers.map(user => user.email);
        if (!whitelist.includes(email)) {
            return res.status(403).json({ message: 'Access denied. This account is not authorized.' });
        }

        // Check if user exists
        let userResult = await db.query('SELECT * FROM users WHERE username = $1', [email]);
        
        // If user doesn't exist, create one
        if (userResult.rows.length === 0) {
            await db.query('INSERT INTO users (username) VALUES ($1)', [email]);
        }
        
        // Login successful
        res.status(200).json({ message: 'Google login successful', user: { email } });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
});

// User Management
app.get('/api/authorized-emails', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, email FROM authorized_emails ORDER BY email ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching authorized emails:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/authorized-emails', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    try {
        const result = await db.query(
            'INSERT INTO authorized_emails (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING id, email', 
            [email.toLowerCase().trim()]
        );
        if (result.rows.length === 0) {
            return res.status(409).json({ error: 'Email already exists.' });
        }
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding authorized email:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/authorized-emails/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deleteResult = await db.query('DELETE FROM authorized_emails WHERE id = $1', [id]);
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ error: 'Email not found' });
        }
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting authorized email:', err);
        res.status(500).json({ error: 'Failed to delete email' });
    }
});

// Generic GET all endpoint factory
const createGetAllEndpoint = (tableName) => async (req, res) => {
    try {
        const { rows } = await db.query(`SELECT * FROM ${tableName} ORDER BY id DESC`);
        res.json(rows);
    } catch (err) {
        console.error(`Error fetching ${tableName}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET all vendors with contacts
app.get('/api/vendors', async (req, res) => {
    try {
        const vendorsResult = await db.query('SELECT * FROM vendors ORDER BY name ASC');
        const vendors = vendorsResult.rows;
        
        for (const vendor of vendors) {
            const contactsResult = await db.query('SELECT name, contact_number as "contactNumber" FROM contact_persons WHERE vendor_id = $1', [vendor.id]);
            vendor.contacts = contactsResult.rows;
        }
        
        res.json(vendors);
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all quotations with images
app.get('/api/quotations', async (req, res) => {
    try {
        const quotationsResult = await db.query('SELECT id, quotation_for AS "quotationFor", vendor_id AS "vendorId", cost, date FROM quotations ORDER BY date DESC');
        const quotations = quotationsResult.rows;
        
        for (const quote of quotations) {
            const imagesResult = await db.query('SELECT image_data FROM quotation_images WHERE quotation_id = $1', [quote.id]);
            quote.quotationImages = imagesResult.rows.map(row => row.image_data);
        }
        
        res.json(quotations);
    } catch (err) {
        console.error('Error fetching quotations:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// GET Endpoints
app.get('/api/contributions', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image FROM contributions ORDER BY date DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching contributions:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/api/campaigns', createGetAllEndpoint('campaigns'));

app.get('/api/sponsors', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, contact_number AS "contactNumber", address, email, business_category AS "businessCategory", business_info AS "businessInfo", sponsorship_amount AS "sponsorshipAmount", sponsorship_type AS "sponsorshipType" FROM sponsors ORDER BY name ASC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching sponsors:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/expenses', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, vendor_id AS "vendorId", cost, bill_date AS "billDate", expense_head AS "expenseHead", bill_receipt AS "billReceipt", expense_by AS "expenseBy" FROM expenses ORDER BY bill_date DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching expenses:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- POST (Create) Endpoints ---
app.post('/api/contributions', async (req, res) => {
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId, date, type, image } = req.body;
    const newContribution = {
        id: `con_${Date.now()}`, status: 'Completed', ...req.body, date: date || new Date().toISOString()
    };
    const dbCampaignId = campaignId || null; // Convert empty string to null
    try {
        await db.query(
            'INSERT INTO contributions (id, donor_name, donor_email, mobile_number, tower_number, flat_number, amount, number_of_coupons, campaign_id, date, status, type, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
            [newContribution.id, donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, dbCampaignId, newContribution.date, newContribution.status, type, image]
        );
        res.status(201).json(newContribution);
    } catch (err) {
        console.error('Error adding contribution:', err); res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/sponsors', async (req, res) => {
    const { name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType } = req.body;
    const newSponsor = { id: `sp_${Date.now()}`, ...req.body };
    try {
        await db.query(
            'INSERT INTO sponsors (id, name, contact_number, address, email, business_category, business_info, sponsorship_amount, sponsorship_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [newSponsor.id, name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType]
        );
        res.status(201).json(newSponsor);
    } catch (err) {
        console.error('Error adding sponsor:', err); res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/vendors', async (req, res) => {
    const { name, business, address, contacts } = req.body;
    const newVendor = { id: `ven_${Date.now()}`, name, business, address, contacts };
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('INSERT INTO vendors (id, name, business, address) VALUES ($1, $2, $3, $4)', [newVendor.id, name, business, address]);
        for (const contact of contacts) {
            await client.query('INSERT INTO contact_persons (vendor_id, name, contact_number) VALUES ($1, $2, $3)', [newVendor.id, contact.name, contact.contactNumber]);
        }
        await client.query('COMMIT');
        res.status(201).json(newVendor);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error adding vendor:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.post('/api/expenses', async (req, res) => {
    const { name, vendorId, cost, billDate, expenseHead, billReceipt, expenseBy } = req.body;
    const newExpense = { id: `exp_${Date.now()}`, ...req.body };
    try {
        await db.query('INSERT INTO expenses (id, name, vendor_id, cost, bill_date, expense_head, bill_receipt, expense_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [newExpense.id, name, vendorId, cost, billDate, expenseHead, billReceipt, expenseBy]);
        res.status(201).json(newExpense);
    } catch (err) {
        console.error('Error adding expense:', err); res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/quotations', async (req, res) => {
    const { quotationFor, vendorId, cost, date, quotationImages } = req.body;
    const newQuotation = { id: `quo_${Date.now()}`, ...req.body };
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('INSERT INTO quotations (id, quotation_for, vendor_id, cost, date) VALUES ($1, $2, $3, $4, $5)', [newQuotation.id, quotationFor, vendorId, cost, date]);
        for (const image of quotationImages) {
            await client.query('INSERT INTO quotation_images (quotation_id, image_data) VALUES ($1, $2)', [newQuotation.id, image]);
        }
        await client.query('COMMIT');
        res.status(201).json(newQuotation);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error adding quotation:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// --- PUT (Update) Endpoints ---
app.put('/api/contributions/:id', async (req, res) => {
    const { id } = req.params;
    const { donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, campaignId, date, type, image, status } = req.body;
    const dbCampaignId = campaignId || null;
    try {
        const result = await db.query(
            'UPDATE contributions SET donor_name=$1, donor_email=$2, mobile_number=$3, tower_number=$4, flat_number=$5, amount=$6, number_of_coupons=$7, campaign_id=$8, date=$9, type=$10, image=$11, status=$12 WHERE id=$13 RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", campaign_id AS "campaignId", date, status, type, image',
            [donorName, donorEmail, mobileNumber, towerNumber, flatNumber, amount, numberOfCoupons, dbCampaignId, date, type, image, status, id]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update contribution' }); }
});

app.put('/api/sponsors/:id', async (req, res) => {
    const { id } = req.params;
    const { name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType } = req.body;
    try {
        const result = await db.query(
            'UPDATE sponsors SET name=$1, contact_number=$2, address=$3, email=$4, business_category=$5, business_info=$6, sponsorship_amount=$7, sponsorship_type=$8 WHERE id=$9 RETURNING id, name, contact_number AS "contactNumber", address, email, business_category AS "businessCategory", business_info AS "businessInfo", sponsorship_amount AS "sponsorshipAmount", sponsorship_type AS "sponsorshipType"',
            [name, contactNumber, address, email, businessCategory, businessInfo, sponsorshipAmount, sponsorshipType, id]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update sponsor' }); }
});

app.put('/api/vendors/:id', async (req, res) => {
    const { id } = req.params;
    const { name, business, address, contacts } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE vendors SET name=$1, business=$2, address=$3 WHERE id=$4', [name, business, address, id]);
        await client.query('DELETE FROM contact_persons WHERE vendor_id=$1', [id]);
        for (const contact of contacts) {
            await client.query('INSERT INTO contact_persons (vendor_id, name, contact_number) VALUES ($1, $2, $3)', [id, contact.name, contact.contactNumber]);
        }
        await client.query('COMMIT');
        res.json({ id, name, business, address, contacts });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to update vendor' });
    } finally {
        client.release();
    }
});

app.put('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const { name, vendorId, cost, billDate, expenseHead, billReceipt, expenseBy } = req.body;
    try {
        const result = await db.query(
            'UPDATE expenses SET name=$1, vendor_id=$2, cost=$3, bill_date=$4, expense_head=$5, bill_receipt=$6, expense_by=$7 WHERE id=$8 RETURNING id, name, vendor_id AS "vendorId", cost, bill_date AS "billDate", expense_head AS "expenseHead", bill_receipt AS "billReceipt", expense_by AS "expenseBy"',
            [name, vendorId, cost, billDate, expenseHead, billReceipt, expenseBy, id]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update expense' }); }
});

app.put('/api/quotations/:id', async (req, res) => {
    const { id } = req.params;
    const { quotationFor, vendorId, cost, date, quotationImages } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE quotations SET quotation_for=$1, vendor_id=$2, cost=$3, date=$4 WHERE id=$5', [quotationFor, vendorId, cost, date, id]);
        await client.query('DELETE FROM quotation_images WHERE quotation_id=$1', [id]);
        for (const image of quotationImages) {
            await client.query('INSERT INTO quotation_images (quotation_id, image_data) VALUES ($1, $2)', [id, image]);
        }
        await client.query('COMMIT');
        res.json({ id, quotationFor, vendorId, cost, date, quotationImages });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to update quotation' });
    } finally {
        client.release();
    }
});

// --- DELETE Endpoints ---
const createDeleteEndpoint = (tableName) => async (req, res) => {
    try {
        await db.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
        res.status(204).send();
    } catch (err) { console.error(err); res.status(500).json({ error: `Failed to delete from ${tableName}` }); }
};

app.delete('/api/contributions/:id', createDeleteEndpoint('contributions'));
app.delete('/api/sponsors/:id', createDeleteEndpoint('sponsors'));
app.delete('/api/expenses/:id', createDeleteEndpoint('expenses'));
app.delete('/api/quotations/:id', createDeleteEndpoint('quotations'));

app.delete('/api/vendors/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const expenseCheck = await db.query('SELECT id FROM expenses WHERE vendor_id = $1 LIMIT 1', [id]);
        if (expenseCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete vendor. It is associated with one or more expenses.' });
        }
        const quotationCheck = await db.query('SELECT id FROM quotations WHERE vendor_id = $1 LIMIT 1', [id]);
        if (quotationCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Cannot delete vendor. It is associated with one or more quotations.' });
        }
        await db.query('DELETE FROM vendors WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete vendor' });
    }
});


// --- Gemini API Proxy Routes ---
app.post('/api/ai/summary', async (req, res) => {
    const { contributions, campaigns, period } = req.body;
    const prompt = `Analyze the following contribution data for the period: ${period}. Provide a concise, insightful summary for a non-profit manager. Include total contributions, top campaign, trends, and average contribution. Data: Campaigns: ${JSON.stringify(campaigns)}, Contributions: ${JSON.stringify(contributions.slice(0, 100))}`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.3 } });
        res.json({ summary: response.text });
    } catch (error) {
        console.error("Error generating summary:", error); res.status(500).json({ error: "AI analysis failed." });
    }
});

app.post('/api/ai/note', async (req, res) => {
    const { donorName, amount, campaignName } = req.body;
    const prompt = `Generate a warm, personal 3-4 sentence thank you note to ${donorName} for their contribution of ₹${amount} to the "${campaignName}" campaign.`;
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.7 } });
        res.json({ note: response.text });
    } catch (error) {
        console.error("Error generating note:", error); res.status(500).json({ error: "AI note generation failed." });
    }
});

// --- Production: Catch-all to serve index.html ---
if (isProduction) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
