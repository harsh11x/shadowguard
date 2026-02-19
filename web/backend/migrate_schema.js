
const { pool } = require('./lib/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Add columns if they don't exist
        await pool.query(`
            DO $$ 
            BEGIN 
                BEGIN
                    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;

                BEGIN
                    ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;

                BEGIN
                    ALTER TABLE users ADD COLUMN ban_expires_at TIMESTAMPTZ;
                EXCEPTION
                    WHEN duplicate_column THEN NULL;
                END;
            END $$;
        `);
        console.log('Columns added.');

        // Set admin role
        const adminEmail = 'admin@gmail.com';
        const res = await pool.query("UPDATE users SET role = 'admin', status = 'active' WHERE email = $1 RETURNING *", [adminEmail]);

        if (res.rowCount > 0) {
            console.log(`Admin role assigned to ${adminEmail}`);
        } else {
            console.log(`Warning: Admin user ${adminEmail} not found`);
        }

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

migrate();
