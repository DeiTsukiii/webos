const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.DB_URL,
});

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { username, password } = JSON.parse(event.body);

        if (!username || !password) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: 'Username and password are required.' })
            };
        }

        const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (res.rowCount === 0) {
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: 'Invalid username.' })
            };
        }

        const user = res.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: 'Invalid password.' })
            };
        }

        const payload = {
            id: user.id,
            username: user.username,
            type: user.user_type
        };

        const token = jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    type: user.user_type
                }
            }),
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'Internal server error.' })
        };
    }
};