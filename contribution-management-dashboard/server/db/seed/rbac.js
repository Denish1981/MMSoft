const ALL_PERMISSIONS = [
    { name: 'page:dashboard:view', description: 'Can view the main dashboard' },
    { name: 'page:contributions:view', description: 'Can view the contributions page' },
    { name: 'page:bulk-add:view', description: 'Can view the bulk add page' },
    { name: 'page:donors:view', description: 'Can view the donors page' },
    { name: 'page:sponsors:view', description: 'Can view the sponsors page' },
    { name: 'page:vendors:view', description: 'Can view the vendors page' },
    { name: 'page:expenses:view', description: 'Can view the expenses page' },
    { name: 'page:quotations:view', description: 'Can view the quotations page' },
    { name: 'page:budget:view', description: 'Can view the budget page' },
    { name: 'page:campaigns:view', description: 'Can view the campaigns page' },
    { name: 'page:festivals:view', description: 'Can view the festivals page' },
    { name: 'page:events:view', description: 'Can view the festival events page' },
    { name: 'page:participants:view', description: 'Can view the unique participants page' },
    { name: 'page:tasks:view', description: 'Can view the tasks page' },
    { name: 'page:reports:view', description: 'Can view the reports page' },
    { name: 'page:ai-insights:view', description: 'Can view the AI insights page' },
    { name: 'page:user-management:view', description: 'Can view the user management page' },
    { name: 'page:archive:view', description: 'Can view and restore archived items' },
    { name: 'action:create', description: 'Can create new items (contributions, expenses, etc.)' },
    { name: 'action:edit', description: 'Can edit existing items' },
    { name: 'action:delete', description: 'Can archive items' },
    { name: 'action:restore', description: 'Can restore archived items' },
    { name: 'action:users:manage', description: 'Can create users and manage their roles' },
];

const ROLES_CONFIG = {
    'Admin': ALL_PERMISSIONS.map(p => p.name),
    'Manager': [
        'page:dashboard:view', 'page:contributions:view', 'page:bulk-add:view',
        'page:donors:view', 'page:sponsors:view', 'page:vendors:view', 'page:expenses:view',
        'page:quotations:view', 'page:budget:view', 'page:campaigns:view', 'page:festivals:view', 'page:events:view', 'page:participants:view', 'page:tasks:view', 'page:reports:view', 'page:ai-insights:view',
        'page:archive:view',
        'action:create', 'action:edit', 'action:delete', 'action:restore'
    ],
    'Viewer': [
        'page:dashboard:view', 'page:contributions:view', 'page:donors:view',
        'page:sponsors:view', 'page:vendors:view', 'page:expenses:view',
        'page:quotations:view', 'page:budget:view', 'page:campaigns:view', 'page:festivals:view', 'page:events:view', 'page:participants:view', 'page:tasks:view', 'page:reports:view', 'page:ai-insights:view'
    ]
};

const seedRBAC = async (client) => {
    const permissionMap = new Map();
    for (const perm of ALL_PERMISSIONS) {
        const res = await client.query('INSERT INTO permissions (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = $2 RETURNING id, name', [perm.name, perm.description]);
        permissionMap.set(res.rows[0].name, res.rows[0].id);
    }

    // FIX: Make the role permission seeding idempotent.
    // This ensures that on every start, the permissions for each role are synced with the config.
    for (const roleName in ROLES_CONFIG) {
        const roleRes = await client.query(
            'INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
            [roleName]
        );
        const roleId = roleRes.rows[0].id;

        // Sync permissions: first delete existing, then add from config.
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

        const permissionsForRole = ROLES_CONFIG[roleName];
        for (const permName of permissionsForRole) {
            const permId = permissionMap.get(permName);
            if (permId) {
                await client.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roleId, permId]);
            }
        }
        console.log(`Permissions for role '${roleName}' have been synced.`);
    }
};

module.exports = { seedRBAC };
