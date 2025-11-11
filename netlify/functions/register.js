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

        if (!username || !password || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_-]+$/.test(username) || password.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(password)) {
            const message = () => {
                if (!username || !password) return 'Username and password are required.';
                if (username.length < 3) return 'Username must be at least 3 characters long.';
                if (username.length > 20) return 'Username must be at most 20 characters long.';
                if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Username can only contain alphanumeric characters, underscores and hyphens.';
                if (password.length < 8) return 'Password must be at least 8 characters long.';
                if (!/^[a-zA-Z0-9_-]+$/.test(password)) return 'Password can only contain alphanumeric characters, underscores and hyphens.';
                return 'Invalid input.';
            };

            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: message() })
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
            `INSERT INTO filesystem (path, parent_path, type, perms, creator) VALUES
                ($1, '/home', 'd', 'rwxr-xr-x', 'system'),
                ($2, $1, 'd', 'rwxrwxr-x', $5),
                ($3, $1, 'd', 'rwxrwxr-x', $5),
                ($4, $1, 'd', 'rwxrwxr-x', $5)
            `,
            [
                homePath,
                `${homePath}/Desktop`,
                `${homePath}/Downloads`,
                `${homePath}/Documents`,
                username
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