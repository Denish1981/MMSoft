
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { seedDatabase } = require('./db/seed');

// Import route modules
const authRoutes = require('./auth/routes');
const publicRoutes = require('./routes/public');
const trackingRoutes = require('./routes/tracking');
const userRoutes = require('./routes/users');
const contributionRoutes = require('./routes/contributions');
const campaignRoutes = require('./routes/campaigns');
const budgetRoutes = require('./routes/budgets');
const sponsorRoutes = require('./routes/sponsors');
const expenseRoutes = require('./routes/expenses');
const quotationRoutes = require('./routes/quotations');
const vendorRoutes = require('./routes/vendors');
const festivalRoutes = require('./routes/festivals');
const taskRoutes = require('./routes/tasks');
const archiveRoutes = require('./routes/archive');
const aiRoutes = require('./routes/ai');
const eventRoutes = require('./routes/events');
const participantRoutes = require('./routes/participants');

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
app.set('trust proxy', 1);

// --- API Routes ---
app.use('/api', publicRoutes); // Public routes don't need '/api' prefix in their file
app.use('/api/auth', authRoutes);
app.use('/api', trackingRoutes);
app.use('/api', userRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/festivals', festivalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/participants', participantRoutes);


// --- Server Start ---
const startServer = async () => {
    await seedDatabase();
    if (isProduction) {
        app.use(express.static(path.join(__dirname, '../dist')));
        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../dist/index.html'));
        });
    }
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
};

startServer();