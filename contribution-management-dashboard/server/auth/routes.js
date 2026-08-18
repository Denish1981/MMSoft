const express = require('express');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const { authMiddleware, getUserPermissions, getUserRoles } = require('./middleware');
const { hashPassword, verifyPassword } = require('./passwordUtils');

const router = express.Router();
const googleClient = new OAuth2Client();

// --- Helper Functions ---
const logLoginHistory = async (userId, method, req) => {
    try {
        await db.query(
            'INSERT INTO login_history (user_id, login_method, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [userId, method, req.ip, req.headers['user-agent']]
        );
    } catch (err) {
        console.error('Failed to log login history:', err);
    }
};

const createSession = async (userId) => {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Session valid for 1 day

    await db.query('INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, token, expiresAt]);
    return token;
};

// --- Routes ---
router.post('/register', async (req, res) => {
    const { username, password, fullName, mobileNumber, towerNumber, flatNumber } = req.body;
    if (!username || !password || !fullName || !mobileNumber || !towerNumber || !flatNumber) {
        return res.status(400).json({ message: 'All fields (Full Name, Username/Email, Password, Mobile, Tower/Block, Flat) are required.' });
    }
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const existingUser = await client.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'An account with this email/username already exists.' });
        }
        const hashedPassword = hashPassword(password);
        const newUserRes = await client.query(
            'INSERT INTO users (username, password, full_name, mobile_number, tower_number, flat_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [username, hashedPassword, fullName || null, mobileNumber || null, towerNumber || null, flatNumber || null]
        );
        const userId = newUserRes.rows[0].id;
        
        // Find 'Donor' role ID
        const roleRes = await client.query("SELECT id FROM roles WHERE name = 'Donor'");
        let roleId = roleRes.rows[0]?.id;
        if (!roleId) {
            const viewerRes = await client.query("SELECT id FROM roles WHERE name = 'Viewer'");
            roleId = viewerRes.rows[0]?.id;
        }
        if (roleId) {
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
        }

        // Link any unassigned offline contributions for this household flat or email
        await client.query(`
            UPDATE contributions 
            SET user_id = $1,
                donor_name = CASE 
                    WHEN (donor_name IS NULL OR donor_name = '' OR donor_name LIKE 'Tower %' OR donor_name LIKE 'Flat %' OR donor_name = 'Household Donor') AND $2 != '' AND $2 NOT LIKE '%@%'
                    THEN $2 
                    ELSE donor_name 
                END,
                donor_email = CASE WHEN (donor_email IS NULL OR donor_email = '') AND $3 != '' THEN $3 ELSE donor_email END,
                mobile_number = CASE WHEN (mobile_number IS NULL OR mobile_number = '') AND $4 != '' THEN $4 ELSE mobile_number END
            WHERE deleted_at IS NULL 
              AND user_id IS NULL
              AND (
                ($5 != '' AND $6 != '' AND (
                    (LOWER(TRIM(tower_number)) = LOWER(TRIM($5)) AND LOWER(TRIM(flat_number)) = LOWER(TRIM($6)))
                    OR (REPLACE(LOWER(TRIM(tower_number)), 'tower', '') = REPLACE(LOWER(TRIM($5)), 'tower', '') AND LOWER(TRIM(flat_number)) = LOWER(TRIM($6)))
                ))
                OR ($3 != '' AND LOWER(TRIM(donor_email)) = LOWER(TRIM($3)))
              )
        `, [userId, fullName || '', username || '', mobileNumber || '', towerNumber || '', flatNumber || '']);

        await client.query('COMMIT');

        const token = await createSession(userId);
        const permissions = await getUserPermissions(userId);
        const roles = await getUserRoles(userId);
        await logLoginHistory(userId, 'registration', req);

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: userId,
                email: username,
                username: username,
                fullName: fullName || '',
                mobileNumber: mobileNumber || '',
                towerNumber: towerNumber || '',
                flatNumber: flatNumber || '',
                familyRoster: [],
                roles,
                permissions
            },
            token
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username/Email and password are required.' });
    }
    try {
        const result = await db.query(
            'SELECT id, username, password, full_name AS "fullName", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", family_roster AS "familyRoster" FROM users WHERE username = $1', 
            [username]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const { isValid, needsRehash } = verifyPassword(password, user.password);

        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Automatic upgrade for legacy plaintext password
        if (needsRehash) {
            const newHashedPassword = hashPassword(password);
            await db.query('UPDATE users SET password = $1 WHERE id = $2', [newHashedPassword, user.id]);
            console.log(`[AUTH] Automatically updated password to salted hash for user: ${username} (ID: ${user.id})`);
        }

        const permissions = await getUserPermissions(user.id);
        const roles = await getUserRoles(user.id);
        if (permissions.length === 0) return res.status(403).json({ message: 'Login failed. Your account has not been assigned any roles.' });
        
        const token = await createSession(user.id);
        await logLoginHistory(user.id, 'password', req);
        res.status(200).json({ 
            user: { 
                id: user.id, 
                email: user.username, 
                username: user.username,
                fullName: user.fullName || '',
                mobileNumber: user.mobileNumber || '',
                towerNumber: user.towerNumber || '',
                flatNumber: user.flatNumber || '',
                familyRoster: user.familyRoster || [],
                roles,
                permissions 
            }, 
            token 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const email = payload?.email;
        if (!email) return res.status(400).json({ message: 'Invalid Google token: email not found.' });

        const userResult = await db.query(
            'SELECT id, username, full_name AS "fullName", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", family_roster AS "familyRoster" FROM users WHERE username = $1', 
            [email]
        );
        let user;
        if (userResult.rows.length === 0) {
            // Auto-register Google user as Donor
            const client = await db.getPool().connect();
            try {
                await client.query('BEGIN');
                const newUserRes = await client.query(
                    'INSERT INTO users (username, full_name) VALUES ($1, $2) RETURNING id',
                    [email, payload.name || '']
                );
                const userId = newUserRes.rows[0].id;
                const roleRes = await client.query("SELECT id FROM roles WHERE name = 'Donor'");
                let roleId = roleRes.rows[0]?.id;
                if (!roleId) {
                    const viewerRes = await client.query("SELECT id FROM roles WHERE name = 'Viewer'");
                    roleId = viewerRes.rows[0]?.id;
                }
                if (roleId) {
                    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
                }
                await client.query('COMMIT');
                user = { id: userId, username: email, fullName: payload.name || '', mobileNumber: '', towerNumber: '', flatNumber: '', familyRoster: [] };
            } catch (createErr) {
                await client.query('ROLLBACK');
                throw createErr;
            } finally {
                client.release();
            }
        } else {
            user = userResult.rows[0];
        }

        const permissions = await getUserPermissions(user.id);
        const roles = await getUserRoles(user.id);
        if (permissions.length === 0) return res.status(403).json({ message: 'Access denied. Your account has no assigned roles.' });

        const sessionToken = await createSession(user.id);
        await logLoginHistory(user.id, 'google', req);
        res.status(200).json({ 
            user: { 
                id: user.id, 
                email: user.username, 
                username: user.username,
                fullName: user.fullName || '',
                mobileNumber: user.mobileNumber || '',
                towerNumber: user.towerNumber || '',
                flatNumber: user.flatNumber || '',
                familyRoster: user.familyRoster || [],
                roles,
                permissions 
            }, 
            token: sessionToken 
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userRes = await db.query(
            'SELECT full_name AS "fullName", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", family_roster AS "familyRoster" FROM users WHERE id = $1',
            [req.user.id]
        );
        const userDetails = userRes.rows[0] || {};
        res.status(200).json({
            user: {
                ...req.user,
                fullName: userDetails.fullName || '',
                mobileNumber: userDetails.mobileNumber || '',
                towerNumber: userDetails.towerNumber || '',
                flatNumber: userDetails.flatNumber || '',
                familyRoster: userDetails.familyRoster || []
            }
        });
    } catch (err) {
        res.status(200).json({ user: req.user });
    }
});

router.put('/profile', authMiddleware, async (req, res) => {
    const { familyRoster, fullName, mobileNumber, towerNumber, flatNumber } = req.body;
    try {
        // If familyRoster is being updated, clean up event registrations for removed members
        if (familyRoster !== undefined && Array.isArray(familyRoster)) {
            const oldUserRes = await db.query('SELECT username, family_roster FROM users WHERE id = $1', [req.user.id]);
            const oldRoster = oldUserRes.rows[0]?.family_roster || [];
            const userEmail = (oldUserRes.rows[0]?.username || '').trim().toLowerCase();

            const oldNames = (Array.isArray(oldRoster) ? oldRoster : [])
                .map(m => (m.name || m.fullName || '').trim().toLowerCase())
                .filter(Boolean);

            const newNames = familyRoster
                .map(m => (m.name || m.fullName || '').trim().toLowerCase())
                .filter(Boolean);

            const removedNames = oldNames.filter(name => !newNames.includes(name));

            if (removedNames.length > 0) {
                await db.query(
                    `DELETE FROM event_registrations 
                     WHERE (
                       user_id = $1 
                       OR ($3 != '' AND LOWER(TRIM(email)) = $3)
                     ) 
                     AND (
                       LOWER(TRIM(name)) = ANY($2::text[])
                       OR LOWER(TRIM(form_data->>'name')) = ANY($2::text[])
                       OR LOWER(TRIM(form_data->>'fullName')) = ANY($2::text[])
                       OR LOWER(TRIM(form_data->>'participantName')) = ANY($2::text[])
                     )`,
                    [req.user.id, removedNames, userEmail]
                );
            }
        }

        const fieldsToUpdate = [];
        const params = [];
        let paramIdx = 1;

        if (familyRoster !== undefined) {
            fieldsToUpdate.push(`family_roster = $${paramIdx++}`);
            params.push(JSON.stringify(familyRoster));
        }
        if (fullName !== undefined) {
            fieldsToUpdate.push(`full_name = $${paramIdx++}`);
            params.push(fullName);
        }
        if (mobileNumber !== undefined) {
            fieldsToUpdate.push(`mobile_number = $${paramIdx++}`);
            params.push(mobileNumber);
        }
        if (towerNumber !== undefined) {
            fieldsToUpdate.push(`tower_number = $${paramIdx++}`);
            params.push(towerNumber);
        }
        if (flatNumber !== undefined) {
            fieldsToUpdate.push(`flat_number = $${paramIdx++}`);
            params.push(flatNumber);
        }

        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ message: 'No profile fields provided to update.' });
        }

        params.push(req.user.id);
        const query = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = $${paramIdx} RETURNING id, username, full_name AS "fullName", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", family_roster AS "familyRoster"`;

        const updateRes = await db.query(query, params);
        const updated = updateRes.rows[0];

        const permissions = await getUserPermissions(req.user.id);
        const roles = await getUserRoles(req.user.id);

        res.status(200).json({
            message: 'Profile updated successfully.',
            user: {
                ...req.user,
                fullName: updated.fullName || '',
                mobileNumber: updated.mobileNumber || '',
                towerNumber: updated.towerNumber || '',
                flatNumber: updated.flatNumber || '',
                familyRoster: updated.familyRoster || [],
                roles,
                permissions
            }
        });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', authMiddleware, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        await db.query('DELETE FROM user_sessions WHERE token = $1', [token]);
        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Internal server error during logout.' });
    }
});

router.post('/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({ message: 'New password must be at least 4 characters long.' });
    }

    try {
        const userId = req.user.id;
        
        // Fetch user password
        const userRes = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        const storedPassword = userRes.rows[0].password;
        
        // If they have an existing password, verify it
        if (storedPassword) {
            const { isValid } = verifyPassword(currentPassword, storedPassword);
            if (!isValid) {
                return res.status(400).json({ message: 'The current password you entered is incorrect.' });
            }
        }
        
        // Update user password with salted hash
        const hashedNewPassword = hashPassword(newPassword);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);
        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
