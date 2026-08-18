const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth/middleware');
const publicRoutes = require('./public');
const checkApprovedContribution = publicRoutes.checkApprovedContribution;

const router = express.Router();

router.get('/my-portal', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        // Fetch User Info
        const userRes = await db.query(
            'SELECT id, username, full_name AS "fullName", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber" FROM users WHERE id = $1',
            [userId]
        );
        const user = userRes.rows[0] || {};
        const userEmail = user.username || '';
        const tower = user.towerNumber || '';
        const flat = user.flatNumber || '';
        const mobile = user.mobileNumber || '';

        // Fetch My Contributions
        const contribRes = await db.query(
            `SELECT c.id, c.donor_name AS "donorName", c.amount, c.number_of_coupons AS "numberOfCoupons", 
                    c.date, c.status, c.type, c.tower_number AS "towerNumber", c.flat_number AS "flatNumber", 
                    c.festival_id AS "festivalId", f.name AS "festivalName", cmp.name AS "campaignName",
                    CASE WHEN c.image IS NOT NULL AND c.image != '' THEN CASE WHEN c.image LIKE '/api/%' OR c.image LIKE 'http://%' OR c.image LIKE 'https://%' THEN c.image ELSE CONCAT('/api/contributions/', c.id, '/image') END ELSE NULL END AS image 
             FROM contributions c 
             LEFT JOIN festivals f ON c.festival_id = f.id
             LEFT JOIN campaigns cmp ON c.campaign_id = cmp.id 
             WHERE c.deleted_at IS NULL AND (
                 c.user_id = $1 
                 OR (
                     $2 != '' AND $3 != '' AND (
                         (LOWER(TRIM(c.tower_number)) = LOWER(TRIM($2)) AND LOWER(TRIM(c.flat_number)) = LOWER(TRIM($3)))
                         OR (REPLACE(LOWER(TRIM(c.tower_number)), 'tower', '') = REPLACE(LOWER(TRIM($2)), 'tower', '') AND LOWER(TRIM(c.flat_number)) = LOWER(TRIM($3)))
                         OR (REGEXP_REPLACE(LOWER(c.tower_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($2), '[^0-9a-z]', '', 'g') AND REGEXP_REPLACE(LOWER(c.flat_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($3), '[^0-9a-z]', '', 'g'))
                     )
                 )
                 OR ($4 != '' AND LOWER(TRIM(c.donor_email)) = LOWER(TRIM($4)))
                 OR ($5 != '' AND (c.mobile_number = $5 OR REPLACE(c.mobile_number, ' ', '') = REPLACE($5, ' ', '')))
             )
             ORDER BY c.date DESC`,
            [userId, tower, flat, userEmail, mobile]
        );

        // Fetch My Stall Registrations
        const stallRes = await db.query(
            `SELECT sr.id, sr.festival_id AS "festivalId", f.name AS "festivalName", 
                    sr.registrant_name AS "registrantName", sr.contact_number AS "contactNumber", 
                    sr.stall_dates::TEXT[] AS "stallDates", sr.products, sr.needs_electricity AS "needsElectricity", 
                    sr.number_of_tables AS "numberOfTables", sr.total_payment AS "totalPayment", 
                    sr.status, sr.rejection_reason AS "rejectionReason", sr.submitted_at AS "submittedAt", 
                    sr.reviewed_at AS "reviewedAt" 
             FROM stall_registrations sr 
             LEFT JOIN festivals f ON sr.festival_id = f.id 
             WHERE (sr.user_id = $1 OR (sr.contact_number = $2 AND $2 != '')) 
             ORDER BY sr.submitted_at DESC`,
            [userId, mobile]
        );

        // Fetch My Event Registrations
        const eventRegRes = await db.query(
            `SELECT er.id, er.event_id AS "eventId", e.name AS "eventName", 
                    e.event_date AS "eventDate", e.venue, er.submitted_at AS "submittedAt", 
                    er.form_data AS "formData", er.name, er.email,
                    er.payment_proof_image AS "paymentProofImage",
                    e.registration_form_schema AS "registrationFormSchema",
                    e.registration_deadline AS "registrationDeadline",
                    e.is_group_event AS "isGroupEvent",
                    e.min_group_size AS "minGroupSize",
                    e.max_group_size AS "maxGroupSize",
                    e.allow_duplicate_members AS "allowDuplicateMembers"
             FROM event_registrations er 
             LEFT JOIN events e ON er.event_id = e.id 
             WHERE er.user_id = $1 
                OR ($2 != '' AND (er.email = $2 OR er.form_data->>'email' = $2))
                OR ($3 != '' AND (
                    er.form_data->>'phone_number' = $3 OR 
                    er.form_data->>'contact_number' = $3 OR 
                    er.form_data->>'mobile_number' = $3 OR
                    er.form_data->>'phone' = $3
                ))
                OR ($4 != '' AND $5 != '' AND (
                    (LOWER(TRIM(er.form_data->>'tower_number')) = LOWER(TRIM($4)) AND LOWER(TRIM(er.form_data->>'flat_number')) = LOWER(TRIM($5)))
                    OR (LOWER(TRIM(er.form_data->>'towerNumber')) = LOWER(TRIM($4)) AND LOWER(TRIM(er.form_data->>'flatNumber')) = LOWER(TRIM($5)))
                ))
             ORDER BY er.submitted_at DESC`,
            [userId, userEmail, mobile, tower, flat]
        );

        // Fetch Upcoming Events
        const upcomingEventsRes = await db.query(
            `SELECT 
                e.id, 
                e.name, 
                e.description, 
                e.event_date AS "eventDate", 
                e.start_time AS "startTime", 
                e.venue,
                e.registration_deadline AS "registrationDeadline",
                e.registration_form_schema AS "registrationFormSchema",
                e.is_group_event AS "isGroupEvent",
                e.min_group_size AS "minGroupSize",
                e.max_group_size AS "maxGroupSize",
                e.allow_duplicate_members AS "allowDuplicateMembers",
                COALESCE(
                    (
                        SELECT json_agg(json_build_object(
                            'name', c.name,
                            'contactNumber', c.contact_number,
                            'email', c.email
                        ))
                        FROM event_contact_persons c
                        WHERE c.event_id = e.id
                    ), '[]'::json
                ) as "contactPersons"
             FROM events e 
             WHERE e.deleted_at IS NULL AND e.event_date >= CURRENT_DATE 
             ORDER BY e.event_date ASC`
        );

        res.json({
            user,
            contributions: contribRes.rows,
            stallRegistrations: stallRes.rows,
            eventRegistrations: eventRegRes.rows,
            upcomingEvents: upcomingEventsRes.rows
        });
    } catch (err) {
        console.error('Error fetching donor portal data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const checkUserApprovedContribution = async (userId) => {
    try {
        const userRes = await db.query('SELECT tower_number, flat_number, username, mobile_number FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return false;
        const u = userRes.rows[0];
        const tower = u.tower_number ? String(u.tower_number).trim() : '';
        const flat = u.flat_number ? String(u.flat_number).trim() : '';
        const email = u.username ? String(u.username).trim() : '';
        const mobile = u.mobile_number ? String(u.mobile_number).trim() : '';

        const query = `
            SELECT 1 FROM contributions c
            WHERE c.deleted_at IS NULL 
              AND c.status IN ('Approved', 'Completed') 
              AND (
                c.user_id = $1
                OR ($2 != '' AND $3 != '' AND (
                    (LOWER(TRIM(c.tower_number)) = LOWER(TRIM($2)) AND LOWER(TRIM(c.flat_number)) = LOWER(TRIM($3)))
                    OR (REPLACE(LOWER(TRIM(c.tower_number)), 'tower', '') = REPLACE(LOWER(TRIM($2)), 'tower', '') AND LOWER(TRIM(c.flat_number)) = LOWER(TRIM($3)))
                    OR (REGEXP_REPLACE(LOWER(c.tower_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($2), '[^0-9a-z]', '', 'g') AND REGEXP_REPLACE(LOWER(c.flat_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($3), '[^0-9a-z]', '', 'g'))
                ))
                OR ($4 != '' AND LOWER(TRIM(c.donor_email)) = LOWER(TRIM($4)))
                OR ($5 != '' AND (c.mobile_number = $5 OR REPLACE(c.mobile_number, ' ', '') = REPLACE($5, ' ', '')))
              )
            LIMIT 1
        `;
        const { rows } = await db.query(query, [userId, tower, flat, email, mobile]);
        return rows.length > 0;
    } catch (err) {
        console.error('Error in checkUserApprovedContribution:', err);
        return false;
    }
};

router.post('/member-events', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { memberName, memberPhone, memberEmail, selectedEventIds = [], eventGroupData = {} } = req.body;

    if (!memberName || !memberName.trim()) {
        return res.status(400).json({ error: 'Member name is required.' });
    }

    const cleanMemberName = memberName.trim();

    try {
        const hasApproved = await checkUserApprovedContribution(userId);
        if (!hasApproved) {
            return res.status(403).json({
                error: 'Registration failed: You must have at least one approved contribution to register household members for events.'
            });
        }

        const userRes = await db.query(
            'SELECT username, mobile_number, tower_number, flat_number FROM users WHERE id = $1',
            [userId]
        );
        const userObj = userRes.rows[0] || {};
        const tower = userObj.tower_number || '';
        const flat = userObj.flat_number || '';
        const defaultEmail = userObj.username || '';
        const defaultMobile = userObj.mobile_number || '';

        // Fetch existing registrations for this user or matching member name
        const existingRegsRes = await db.query(
            `SELECT er.id, er.event_id AS "eventId", er.name, er.email, er.form_data AS "formData"
             FROM event_registrations er
             WHERE er.user_id = $1 
                OR (LOWER(TRIM(er.name)) = LOWER(TRIM($2)))
                OR (LOWER(TRIM(er.form_data->>'name')) = LOWER(TRIM($2)))`,
            [userId, cleanMemberName]
        );

        const memberRegs = existingRegsRes.rows.filter(r => {
            const rName = (r.name || r.formData?.name || r.formData?.fullName || '').trim().toLowerCase();
            return rName === cleanMemberName.toLowerCase();
        });

        const currentRegisteredEventIds = memberRegs.map(r => Number(r.eventId));
        const targetEventIds = (selectedEventIds || []).map(id => Number(id));

        const client = await db.getPool().connect();
        try {
            await client.query('BEGIN');

            // 1. Delete registrations for events that were unchecked in modal
            const idsToDelete = memberRegs
                .filter(r => !targetEventIds.includes(Number(r.eventId)))
                .map(r => r.id);

            if (idsToDelete.length > 0) {
                await client.query(
                    'DELETE FROM event_registrations WHERE id = ANY($1::int[])',
                    [idsToDelete]
                );
            }

            // 2. Add registrations for newly checked events
            const eventsToAdd = targetEventIds.filter(evtId => !currentRegisteredEventIds.includes(evtId));

            if (eventsToAdd.length > 0) {
                const now = new Date();
                const eventsCheck = await client.query(
                    'SELECT id, name, event_date, registration_deadline, is_group_event, min_group_size, max_group_size, allow_duplicate_members FROM events WHERE id = ANY($1::int[]) AND deleted_at IS NULL',
                    [eventsToAdd]
                );
                for (const evt of eventsCheck.rows) {
                    let isClosed = false;
                    if (evt.registration_deadline) {
                        const trimmed = String(evt.registration_deadline).trim();
                        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                            const [y, m, d] = trimmed.split('-').map(Number);
                            const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
                            if (now.getTime() > endOfDay.getTime()) isClosed = true;
                        } else {
                            const deadline = new Date(trimmed);
                            if (!isNaN(deadline.getTime()) && now.getTime() > deadline.getTime()) isClosed = true;
                        }
                    } else if (evt.event_date) {
                        const trimmed = String(evt.event_date).trim();
                        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                            const [y, m, d] = trimmed.split('-').map(Number);
                            const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
                            if (now.getTime() > endOfDay.getTime()) isClosed = true;
                        } else {
                            const eDate = new Date(trimmed);
                            if (!isNaN(eDate.getTime()) && now.getTime() > eDate.getTime()) isClosed = true;
                        }
                    }

                    if (isClosed) {
                        const cutoffDate = evt.registration_deadline || evt.event_date;
                        const formattedCutoff = new Date(cutoffDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        throw new Error(`Registration for "${evt.name}" closed on ${formattedCutoff}.`);
                    }

                    // Validate group constraints and member contributions if it's a group event
                    const groupDataForEvt = eventGroupData[evt.id] || {};
                    if (evt.is_group_event) {
                        const rawMembers = Array.isArray(groupDataForEvt.groupMembers) ? groupDataForEvt.groupMembers : [];
                        const validRosterMembers = [];

                        for (let i = 0; i < rawMembers.length; i++) {
                            const gm = rawMembers[i];
                            const memberNum = i + 2;
                            const mName = (gm.name || '').trim();
                            if (!mName) {
                                throw new Error(`Full Name is required for Member #${memberNum} in "${evt.name}".`);
                            }
                            const tNum = (gm.towerNumber || gm.tower_number || gm.tower || '').trim();
                            const fNum = (gm.flatNumber || gm.flat_number || gm.flat || '').trim();
                            if (!tNum) {
                                throw new Error(`Tower Number is mandatory for Member #${memberNum} (${mName}) in "${evt.name}".`);
                            }
                            if (!fNum) {
                                throw new Error(`Flat Number is mandatory for Member #${memberNum} (${mName}) in "${evt.name}".`);
                            }

                            // Verify that this member's household has an approved contribution
                            const memberHasContribution = await checkApprovedContribution({
                                towerNumber: tNum,
                                flatNumber: fNum,
                                client
                            });

                            if (!memberHasContribution) {
                                throw new Error(`Registration rejected for member "${mName}" (Flat ${tNum}-${fNum}) in "${evt.name}": No approved contribution found for household Tower ${tNum}, Flat ${fNum}. Only members with an approved contribution from their household can be registered.`);
                            }

                            validRosterMembers.push(gm);
                        }

                        const totalMembers = 1 + validRosterMembers.length; // cleanMemberName + approved members
                        const minSize = evt.min_group_size || 1;
                        const maxSize = evt.max_group_size || 20;

                        if (totalMembers < minSize) {
                            throw new Error(`"${evt.name}" requires at least ${minSize} participants with approved contributions. Currently eligible: ${totalMembers}.`);
                        }
                        if (totalMembers > maxSize) {
                            throw new Error(`"${evt.name}" allows a maximum of ${maxSize} participants. Current team has ${totalMembers}.`);
                        }
                    }

                    // Duplicate check against existing external registrations for this event
                    if (!evt.allow_duplicate_members) {
                        const groupMembers = Array.isArray(groupDataForEvt.groupMembers) ? groupDataForEvt.groupMembers : [];
                        const allCandidateNames = [cleanMemberName, ...groupMembers.map(m => m.name)].filter(Boolean).map(n => n.trim().toLowerCase());
                        const candidatePhone = (memberPhone || defaultMobile || '').replace(/\D/g, '');

                        const otherRegs = await client.query(
                            'SELECT id, name, email, form_data FROM event_registrations WHERE event_id = $1 AND user_id != $2',
                            [evt.id, userId]
                        );

                        for (const row of otherRegs.rows) {
                            const regData = row.form_data || {};
                            const memberArray = regData.group_members || regData.groupMembers || regData.members || regData.team_members || [];
                            const allNamesInReg = [row.name, regData.name, ...(Array.isArray(memberArray) ? memberArray.map(m => (typeof m === 'string' ? m : m?.name)) : [])].filter(Boolean).map(n => n.trim().toLowerCase());
                            const allPhonesInReg = [regData.phone_number, regData.mobile_number, regData.contact_number, ...(Array.isArray(memberArray) ? memberArray.map(m => (typeof m === 'object' ? m?.phone : '')) : [])].filter(Boolean).map(p => p.replace(/\D/g, ''));

                            for (const cName of allCandidateNames) {
                                if (allNamesInReg.includes(cName)) {
                                    const teamLabel = regData.group_name || regData.groupName || row.name || 'another group';
                                    throw new Error(`Registration Conflict: "${cName}" is already registered for "${evt.name}" under ${teamLabel}. Duplicate registrations are not allowed for this event.`);
                                }
                            }

                            if (candidatePhone && candidatePhone.length >= 7 && allPhonesInReg.includes(candidatePhone)) {
                                const teamLabel = regData.group_name || regData.groupName || row.name || 'another group';
                                throw new Error(`Registration Conflict: Contact phone for "${cleanMemberName}" is already registered for "${evt.name}" under ${teamLabel}.`);
                            }
                        }
                    }
                }
            }

            for (const evtId of eventsToAdd) {
                const pEmail = (memberEmail || defaultEmail).trim();
                const pPhone = (memberPhone || defaultMobile).trim();
                const groupDataForEvt = eventGroupData[evtId] || {};
                const validGroupMembers = Array.isArray(groupDataForEvt.groupMembers)
                    ? groupDataForEvt.groupMembers
                        .filter(m => m && m.name && m.name.trim())
                        .map(m => ({
                            name: m.name.trim(),
                            towerNumber: (m.towerNumber || m.tower_number || m.tower || '').trim(),
                            flatNumber: (m.flatNumber || m.flat_number || m.flat || '').trim(),
                            phone: (m.phone || m.phone_number || m.mobile_number || '').trim(),
                            role: m.role || 'Member'
                        }))
                    : [];

                const formData = {
                    name: cleanMemberName,
                    phone_number: pPhone,
                    contact_number: pPhone,
                    mobile_number: pPhone,
                    email: pEmail,
                    tower_number: tower,
                    flat_number: flat,
                    is_household_member: true,
                    ...(groupDataForEvt.groupName ? { group_name: groupDataForEvt.groupName.trim() } : {}),
                    ...(validGroupMembers.length > 0 ? { group_members: validGroupMembers } : {})
                };

                await client.query(
                    'INSERT INTO event_registrations (event_id, name, email, form_data, user_id) VALUES ($1, $2, $3, $4, $5)',
                    [evtId, cleanMemberName, pEmail, formData, userId]
                );
            }

            await client.query('COMMIT');
            res.json({
                message: `Events updated successfully for ${cleanMemberName}.`,
                registeredEventIds: targetEventIds
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error in /api/donor/member-events:', err);
        res.status(500).json({ error: err.message || 'Failed to update member event registrations' });
    }
});

// Update event submission answers / performance details / audio track
router.put('/registrations/:id/details', authMiddleware, async (req, res) => {
    try {
        const userId = req.user && req.user.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const registrationId = parseInt(req.params.id, 10);
        if (isNaN(registrationId)) {
            return res.status(400).json({ error: 'Invalid registration ID' });
        }

        const { formData, paymentProofImage } = req.body;

        // Verify registration belongs to this user or user's contact details
        const regRes = await db.query(
            `SELECT er.id, er.form_data, er.user_id, er.event_id, e.name as event_name, e.registration_deadline, e.event_date
             FROM event_registrations er
             JOIN events e ON er.event_id = e.id
             WHERE er.id = $1`,
            [registrationId]
        );

        if (regRes.rows.length === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        const reg = regRes.rows[0];

        // Check ownership
        const userRes = await db.query('SELECT username, mobile_number, tower_number, flat_number FROM users WHERE id = $1', [userId]);
        const u = userRes.rows[0] || {};
        const userEmail = u.username ? String(u.username).trim() : '';
        const userMobile = u.mobile_number ? String(u.mobile_number).trim() : '';

        const isOwner = reg.user_id === userId ||
            (userEmail && (reg.email === userEmail || reg.form_data?.email === userEmail)) ||
            (userMobile && (reg.form_data?.phone_number === userMobile || reg.form_data?.mobile_number === userMobile || reg.form_data?.contact_number === userMobile));

        if (!isOwner) {
            return res.status(403).json({ error: 'You do not have permission to modify this registration.' });
        }

        // Merge existing formData with new answers
        const updatedFormData = {
            ...(reg.form_data || {}),
            ...(formData || {})
        };

        // If updating group members, validate each member's household contribution
        const incomingMembers = updatedFormData.group_members || updatedFormData.groupMembers;
        if (Array.isArray(incomingMembers) && incomingMembers.length > 0) {
            for (let i = 0; i < incomingMembers.length; i++) {
                const gm = incomingMembers[i];
                const memberNum = i + 2;
                const mName = (gm.name || '').trim();
                const tNum = (gm.towerNumber || gm.tower_number || gm.tower || '').trim();
                const fNum = (gm.flatNumber || gm.flat_number || gm.flat || '').trim();

                if (mName || tNum || fNum) {
                    if (!mName) {
                        return res.status(400).json({ error: `Full Name is required for Member #${memberNum}.` });
                    }
                    if (!tNum) {
                        return res.status(400).json({ error: `Tower Number is mandatory for Member #${memberNum} (${mName}).` });
                    }
                    if (!fNum) {
                        return res.status(400).json({ error: `Flat Number is mandatory for Member #${memberNum} (${mName}).` });
                    }

                    const memberHasContribution = await checkApprovedContribution({
                        towerNumber: tNum,
                        flatNumber: fNum
                    });

                    if (!memberHasContribution) {
                        return res.status(400).json({
                            error: `Registration rejected for member "${mName}" (Flat ${tNum}-${fNum}): No approved contribution found for household Tower ${tNum}, Flat ${fNum}. Only members with an approved contribution from their household can be registered.`
                        });
                    }
                }
            }
        }

        const updateRes = await db.query(
            `UPDATE event_registrations 
             SET form_data = $1,
                 payment_proof_image = COALESCE($2, payment_proof_image)
             WHERE id = $3
             RETURNING id, event_id AS "eventId", name, email, form_data AS "formData", payment_proof_image AS "paymentProofImage"`,
            [JSON.stringify(updatedFormData), paymentProofImage || null, registrationId]
        );

        res.json({
            message: 'Performance details and files saved successfully!',
            registration: updateRes.rows[0]
        });
    } catch (err) {
        console.error('Error updating registration details:', err);
        res.status(500).json({ error: err.message || 'Failed to update registration details' });
    }
});

router.put('/contributions/:id/claim-coupons', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { numberOfCoupons } = req.body;

    try {
        const userRes = await db.query(
            'SELECT tower_number, flat_number, full_name, username, mobile_number FROM users WHERE id = $1',
            [userId]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const u = userRes.rows[0];
        const tower = u.tower_number || '';
        const flat = u.flat_number || '';

        // Check ownership via user_id OR household tower+flat match
        const contribRes = await db.query(
            `SELECT * FROM contributions 
             WHERE id = $1 AND deleted_at IS NULL 
               AND (
                 user_id = $2 
                 OR (
                     $3 != '' AND $4 != '' AND (
                         (LOWER(TRIM(tower_number)) = LOWER(TRIM($3)) AND LOWER(TRIM(flat_number)) = LOWER(TRIM($4)))
                         OR (REPLACE(LOWER(TRIM(tower_number)), 'tower', '') = REPLACE(LOWER(TRIM($3)), 'tower', '') AND LOWER(TRIM(flat_number)) = LOWER(TRIM($4)))
                         OR (REGEXP_REPLACE(LOWER(tower_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($3), '[^0-9a-z]', '', 'g') AND REGEXP_REPLACE(LOWER(flat_number), '[^0-9a-z]', '', 'g') = REGEXP_REPLACE(LOWER($4), '[^0-9a-z]', '', 'g'))
                     )
                 )
               )`,
            [id, userId, tower, flat]
        );

        if (contribRes.rows.length === 0) {
            return res.status(403).json({ error: 'Contribution not found or not associated with your household.' });
        }

        const contrib = contribRes.rows[0];
        const amount = parseFloat(contrib.amount);
        if (isNaN(amount) || amount < 1500) {
            return res.status(400).json({ error: 'Food coupons are only available for contributions of ₹1,500 or more.' });
        }

        const requestedCoupons = parseInt(numberOfCoupons, 10);
        if (isNaN(requestedCoupons) || requestedCoupons < 0 || requestedCoupons > 4) {
            return res.status(400).json({ error: 'Number of coupons must be between 0 and 4.' });
        }

        // Update coupons and link user profile if missing
        const updateRes = await db.query(
            `UPDATE contributions 
             SET number_of_coupons = $1,
                 user_id = COALESCE(user_id, $2),
                 donor_name = CASE 
                     WHEN (donor_name IS NULL OR donor_name = '' OR donor_name LIKE 'Tower %' OR donor_name LIKE 'Flat %' OR donor_name = 'Household Donor') AND $3 != '' AND $3 NOT LIKE '%@%'
                     THEN $3 
                     ELSE donor_name 
                 END,
                 donor_email = CASE WHEN (donor_email IS NULL OR donor_email = '') AND $4 != '' THEN $4 ELSE donor_email END,
                 mobile_number = CASE WHEN (mobile_number IS NULL OR mobile_number = '') AND $5 != '' THEN $5 ELSE mobile_number END,
                 updated_at = NOW()
             WHERE id = $6
             RETURNING id, donor_name AS "donorName", donor_email AS "donorEmail", mobile_number AS "mobileNumber", tower_number AS "towerNumber", flat_number AS "flatNumber", amount, number_of_coupons AS "numberOfCoupons", festival_id AS "festivalId", campaign_id AS "campaignId", date, status, type`,
            [requestedCoupons, userId, u.full_name || '', u.username || '', u.mobile_number || '', id]
        );

        res.json({
            message: 'Food coupons updated successfully!',
            contribution: updateRes.rows[0]
        });
    } catch (err) {
        console.error('Error claiming food coupons:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
