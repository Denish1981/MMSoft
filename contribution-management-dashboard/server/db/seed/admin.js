const createAdminUser = async (client) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail) {
        let adminUser = await client.query('SELECT id FROM users WHERE username = $1', [adminEmail]);
        let adminUserId;

        if (adminUser.rows.length === 0) {
            if(!adminPassword) {
                console.warn(`Admin user ${adminEmail} does not exist and no ADMIN_PASSWORD is set. Cannot create admin.`);
            } else {
                const newUserRes = await client.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [adminEmail, adminPassword]);
                adminUserId = newUserRes.rows[0].id;
                console.log(`Created admin user: ${adminEmail}`);
            }
        } else {
            adminUserId = adminUser.rows[0].id;
        }

        if(adminUserId) {
            const adminRole = await client.query('SELECT id FROM roles WHERE name = $1', ['Admin']);
            if(adminRole.rows.length > 0) {
                const adminRoleId = adminRole.rows[0].id;
                await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [adminUserId, adminRoleId]);
                console.log(`Ensured user ${adminEmail} has 'Admin' role.`);
            }
        }
    }
};

module.exports = { createAdminUser };
