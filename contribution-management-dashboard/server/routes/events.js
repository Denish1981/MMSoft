const express = require('express');
const db = require('../db');
const { authMiddleware, permissionMiddleware } = require('../auth/middleware');
const { logChanges, createHistoryEndpoint, createSoftDeleteEndpoint } = require('../db/helpers');
const router = express.Router();

// Helper to format event for response, used to ensure consistency
const formatEventResponse = (event, contacts) => {
    return {
        id: event.id,
        festivalId: event.festival_id,
        festivalName: event.festival_name || event.festivalName,
        name: event.name,
        eventDate: event.event_date || event.eventDate,
        startTime: event.start_time ? event.start_time.substring(0, 5) : (event.startTime ? event.startTime.substring(0, 5) : null),
        endTime: event.end_time ? event.end_time.substring(0, 5) : (event.endTime ? event.endTime.substring(0, 5) : null),
        description: event.description,
        rules: event.rules || null,
        image: event.image_data || event.image,
        venue: event.venue,
        registrationDeadline: event.registration_deadline || event.registrationDeadline,
        registrationFormSchema: event.registration_form_schema || event.registrationFormSchema,
        contactPersons: contacts || event.contactPersons || [],
        isGroupEvent: Boolean(event.is_group_event || event.isGroupEvent),
        minGroupSize: event.min_group_size || event.minGroupSize || 1,
        maxGroupSize: event.max_group_size || event.maxGroupSize || 20,
        allowDuplicateMembers: Boolean(event.allow_duplicate_members || event.allowDuplicateMembers),
        createdAt: event.created_at || event.createdAt,
        updatedAt: event.updated_at || event.updatedAt,
    };
};

router.get('/', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT 
                e.id, 
                e.festival_id as "festivalId", 
                f.name as "festivalName",
                e.name, 
                e.description, 
                e.rules,
                e.event_date as "eventDate", 
                e.start_time as "startTime", 
                e.end_time as "endTime", 
                e.venue, 
                e.image_data as "image", 
                e.registration_deadline as "registrationDeadline",
                e.registration_form_schema as "registrationFormSchema",
                e.is_group_event as "isGroupEvent",
                e.min_group_size as "minGroupSize",
                e.max_group_size as "maxGroupSize",
                e.allow_duplicate_members as "allowDuplicateMembers",
                (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as "registrationCount"
            FROM events e
            LEFT JOIN festivals f ON e.festival_id = f.id
            WHERE e.deleted_at IS NULL
            ORDER BY e.event_date ASC, e.start_time ASC
        `;
        const { rows: events } = await db.query(query);
        
        for (const event of events) {
             const contactsRes = await db.query('SELECT name, contact_number as "contactNumber", email FROM event_contact_persons WHERE event_id = $1', [event.id]);
             event.contactPersons = contactsRes.rows;
             event.isGroupEvent = Boolean(event.isGroupEvent);
             event.minGroupSize = event.minGroupSize || 1;
             event.maxGroupSize = event.maxGroupSize || 20;
             event.allowDuplicateMembers = Boolean(event.allowDuplicateMembers);
             if (typeof event.registrationFormSchema === 'string') {
                 try {
                     event.registrationFormSchema = JSON.parse(event.registrationFormSchema);
                 } catch (e) {
                     event.registrationFormSchema = [];
                 }
             }
        }
        res.json(events);
    } catch (err) {
        console.error('Error fetching all events:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id/registrations', authMiddleware, permissionMiddleware('page:events:view'), async (req, res) => {
    const { id } = req.params;
    try {
        const eventRes = await db.query(
            'SELECT name, festival_id, rules, registration_form_schema, registration_deadline as "registrationDeadline", is_group_event as "isGroupEvent", min_group_size as "minGroupSize", max_group_size as "maxGroupSize", allow_duplicate_members as "allowDuplicateMembers" FROM events WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (eventRes.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const registrationsRes = await db.query(
            `SELECT id, event_id as "eventId", name, email, form_data as "formData", submitted_at as "submittedAt", payment_proof_image as "paymentProofImage"
             FROM event_registrations 
             WHERE event_id = $1 
             ORDER BY submitted_at DESC`,
            [id]
        );
        
        res.json({
            event: { 
                name: eventRes.rows[0].name, 
                festivalId: eventRes.rows[0].festival_id,
                rules: eventRes.rows[0].rules,
                registrationFormSchema: eventRes.rows[0].registration_form_schema,
                registrationDeadline: eventRes.rows[0].registrationDeadline,
                isGroupEvent: Boolean(eventRes.rows[0].isGroupEvent),
                minGroupSize: eventRes.rows[0].minGroupSize || 1,
                maxGroupSize: eventRes.rows[0].maxGroupSize || 20,
                allowDuplicateMembers: Boolean(eventRes.rows[0].allowDuplicateMembers),
            },
            registrations: registrationsRes.rows
        });

    } catch (err) {
        console.error(`Error fetching registrations for event ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { festivalId, name, eventDate, startTime, endTime, venue, description, rules, image, registrationDeadline, contactPersons = [], registrationFormSchema = [] } = req.body;
    const isGroupEvent = Boolean(req.body.isGroupEvent ?? req.body.is_group_event ?? false);
    const minGroupSize = parseInt(req.body.minGroupSize ?? req.body.min_group_size, 10) || 1;
    const maxGroupSize = parseInt(req.body.maxGroupSize ?? req.body.max_group_size, 10) || 20;
    const allowDuplicateMembers = Boolean(req.body.allowDuplicateMembers ?? req.body.allow_duplicate_members ?? false);

    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const eventRes = await client.query(
            'INSERT INTO events (festival_id, name, event_date, start_time, end_time, venue, description, rules, image_data, registration_form_schema, registration_deadline, is_group_event, min_group_size, max_group_size, allow_duplicate_members) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
            [festivalId, name, eventDate, startTime || null, endTime || null, venue, description, rules || null, image, JSON.stringify(registrationFormSchema), registrationDeadline || null, isGroupEvent, minGroupSize, maxGroupSize, allowDuplicateMembers]
        );
        const newEvent = eventRes.rows[0];

        const insertedContacts = [];
        for (const contact of contactPersons.filter(c => c.name && c.contactNumber)) {
            const contactRes = await client.query(
                'INSERT INTO event_contact_persons (event_id, name, contact_number, email) VALUES ($1, $2, $3, $4) RETURNING name, contact_number as "contactNumber", email',
                [newEvent.id, contact.name, contact.contactNumber, contact.email]
            );
            insertedContacts.push(contactRes.rows[0]);
        }
        await client.query('COMMIT');
        res.status(201).json(formatEventResponse(newEvent, insertedContacts));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating event:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    } finally {
        client.release();
    }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, eventDate, startTime, endTime, venue, description, rules, image, registrationDeadline, contactPersons = [], registrationFormSchema = [] } = req.body;
    const isGroupEvent = Boolean(req.body.isGroupEvent ?? req.body.is_group_event ?? false);
    const minGroupSize = parseInt(req.body.minGroupSize ?? req.body.min_group_size, 10) || 1;
    const maxGroupSize = parseInt(req.body.maxGroupSize ?? req.body.max_group_size, 10) || 20;
    const allowDuplicateMembers = Boolean(req.body.allowDuplicateMembers ?? req.body.allow_duplicate_members ?? false);

    const client = await db.getPool().connect();

    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM events WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Event not found');
        const oldEventData = oldDataRes.rows[0];
        
        const eventRes = await client.query(
            'UPDATE events SET name=$1, event_date=$2, start_time=$3, end_time=$4, venue=$5, description=$6, rules=$7, image_data=$8, registration_form_schema=$9, registration_deadline=$10, is_group_event=$11, min_group_size=$12, max_group_size=$13, allow_duplicate_members=$14, updated_at=NOW() WHERE id=$15 RETURNING *',
            [name, eventDate, startTime || null, endTime || null, venue, description, rules || null, image, JSON.stringify(registrationFormSchema), registrationDeadline || null, isGroupEvent, minGroupSize, maxGroupSize, allowDuplicateMembers, id]
        );

        await logChanges(client, {
            historyTable: 'events_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldEventData, newData: { name, eventDate, startTime, endTime, venue, description, rules, image, registrationDeadline, registrationFormSchema: JSON.stringify(registrationFormSchema), isGroupEvent, minGroupSize, maxGroupSize, allowDuplicateMembers },
            fieldMapping: { name: 'name', eventDate: 'event_date', startTime: 'start_time', endTime: 'end_time', venue: 'venue', description: 'description', rules: 'rules', image: 'image_data', registrationDeadline: 'registration_deadline', registrationFormSchema: 'registration_form_schema', isGroupEvent: 'is_group_event', minGroupSize: 'min_group_size', maxGroupSize: 'max_group_size', allowDuplicateMembers: 'allow_duplicate_members' }
        });
        
        // Log changes to contacts as a single text entry for simplicity
        const oldContactsRes = await client.query('SELECT name, contact_number FROM event_contact_persons WHERE event_id=$1', [id]);
        const oldContactsStr = oldContactsRes.rows.map(c => `${c.name} (${c.contact_number})`).sort().join('; ');
        const newContactsStr = contactPersons.filter(c => c.name && c.contactNumber).map(c => `${c.name} (${c.contactNumber})`).sort().join('; ');

        if (oldContactsStr !== newContactsStr) {
             await logChanges(client, {
                historyTable: 'events_history', recordId: id, changedByUserId: req.user.id,
                oldData: { 'contactPersons': oldContactsStr }, newData: { 'contactPersons': newContactsStr },
                fieldMapping: { contactPersons: 'contactPersons' }
            });
        }

        // Simple approach: replace all contacts
        await client.query('DELETE FROM event_contact_persons WHERE event_id=$1', [id]);
        const updatedContacts = [];
        for (const contact of contactPersons.filter(c => c.name && c.contactNumber)) {
             const contactRes = await client.query(
                'INSERT INTO event_contact_persons (event_id, name, contact_number, email) VALUES ($1, $2, $3, $4) RETURNING name, contact_number as "contactNumber", email',
                [id, contact.name, contact.contactNumber, contact.email]
            );
            updatedContacts.push(contactRes.rows[0]);
        }

        await client.query('COMMIT');
        res.json(formatEventResponse(eventRes.rows[0], updatedContacts));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating event:', err);
        res.status(500).json({ error: err.message || 'Failed to update event' });
    } finally {
        client.release();
    }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('events'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('events'));

module.exports = router;