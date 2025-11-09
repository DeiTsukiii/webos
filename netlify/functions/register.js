const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DB_URL,
});

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const client = await pool.connect();

    try {
        const { username, password } = JSON.parse(event.body);

        if (!username || !password) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: 'Username and password are required.' })
            };
        }

        await client.query('BEGIN');

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await client.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
            [username, password_hash]
        );

        const homePath = `/home/${username}`;
        
        await client.query(
            `INSERT INTO filesystem (path, parent_path, type, perms) VALUES
                ($1, '/home', 'd', 'rwxr-xr-x'),
                ($2, $1, 'd', 'rwxrwxr-x'),
                ($3, $1, 'd', 'rwxrwxr-x'),
                ($4, $1, 'd', 'rwxrwxr-x')
            `,
            [
                homePath,
                `${homePath}/Desktop`,
                `${homePath}/Downloads`,
                `${homePath}/Documents`
            ]
        );

        await client.query('COMMIT');

        return {
            statusCode: 201,
            body: JSON.stringify({
                success: true,
                message: 'Account created successfully.'
            }),
        };

    } catch (error) {
        await client.query('ROLLBACK');
        
        if (error.code === '23505') {
            return {
                statusCode: 409,
                body: JSON.stringify({ success: false, message: 'Username already exists.' })
            };
        }
        
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'Internal server error.' })
        };
    } finally {
        client.release();
    }
};