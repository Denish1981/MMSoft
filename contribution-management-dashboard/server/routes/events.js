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
        name: event.name,
        eventDate: event.event_date,
        startTime: event.start_time ? event.start_time.substring(0, 5) : null,
        endTime: event.end_time ? event.end_time.substring(0, 5) : null,
        description: event.description,
        image: event.image_data,
        venue: event.venue,
        registrationFormSchema: event.registration_form_schema,
        contactPersons: contacts,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
    };
};

router.get('/:id/registrations', authMiddleware, permissionMiddleware('page:events:view'), async (req, res) => {
    const { id } = req.params;
    try {
        const eventRes = await db.query('SELECT name, festival_id, registration_form_schema FROM events WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (eventRes.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const registrationsRes = await db.query(
            `SELECT id, event_id as "eventId", name, email, form_data as "formData", submitted_at as "submittedAt"
             FROM event_registrations 
             WHERE event_id = $1 
             ORDER BY submitted_at DESC`,
            [id]
        );
        
        res.json({
            event: { 
                name: eventRes.rows[0].name, 
                festivalId: eventRes.rows[0].festival_id,
                registrationFormSchema: eventRes.rows[0].registration_form_schema
            },
            registrations: registrationsRes.rows
        });

    } catch (err) {
        console.error(`Error fetching registrations for event ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.post('/', authMiddleware, permissionMiddleware('action:create'), async (req, res) => {
    const { festivalId, name, eventDate, startTime, endTime, venue, description, image, contactPersons = [], registrationFormSchema = [] } = req.body;
    const client = await db.getPool().connect();
    try {
        await client.query('BEGIN');
        const eventRes = await client.query(
            'INSERT INTO events (festival_id, name, event_date, start_time, end_time, venue, description, image_data, registration_form_schema) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [festivalId, name, eventDate, startTime || null, endTime || null, venue, description, image, JSON.stringify(registrationFormSchema)]
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
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.put('/:id', authMiddleware, permissionMiddleware('action:edit'), async (req, res) => {
    const { id } = req.params;
    const { name, eventDate, startTime, endTime, venue, description, image, contactPersons = [], registrationFormSchema = [] } = req.body;
    const client = await db.getPool().connect();

    try {
        await client.query('BEGIN');
        const oldDataRes = await client.query('SELECT * FROM events WHERE id=$1 FOR UPDATE', [id]);
        if (oldDataRes.rows.length === 0) throw new Error('Event not found');
        const oldEventData = oldDataRes.rows[0];
        
        const eventRes = await client.query(
            'UPDATE events SET name=$1, event_date=$2, start_time=$3, end_time=$4, venue=$5, description=$6, image_data=$7, registration_form_schema=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
            [name, eventDate, startTime || null, endTime || null, venue, description, image, JSON.stringify(registrationFormSchema), id]
        );

        await logChanges(client, {
            historyTable: 'events_history', recordId: id, changedByUserId: req.user.id,
            oldData: oldEventData, newData: { name, eventDate, startTime, endTime, venue, description, image, registrationFormSchema: JSON.stringify(registrationFormSchema) },
            fieldMapping: { name: 'name', eventDate: 'event_date', startTime: 'start_time', endTime: 'end_time', venue: 'venue', description: 'description', image: 'image_data', registrationFormSchema: 'registration_form_schema' }
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
        res.status(500).json({ error: 'Failed to update event' });
    } finally {
        client.release();
    }
});

router.delete('/:id', authMiddleware, permissionMiddleware('action:delete'), createSoftDeleteEndpoint('events'));
router.get('/:id/history', authMiddleware, createHistoryEndpoint('events'));

module.exports = router;