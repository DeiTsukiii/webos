import { Pool } from 'pg';
import { verify } from 'jsonwebtoken';
import { compare, hash } from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const client = await pool.connect();
    try {
        const { token, oldPassword, newPassword } = JSON.parse(event.body);

        if (!token || !oldPassword || !newPassword) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ success: false, message: 'Token, old password, and new password are required.' }) 
            };
        }
        
        let decodedPayload;
        try {
            decodedPayload = verify(token, JWT_SECRET);
        } catch (error) {
            return { statusCode: 401, body: JSON.stringify({ success: false, message: 'tokenError' }) };
        }
        const { username } = decodedPayload;

        await client.query('BEGIN');

        const userRes = await client.query('SELECT password_hash FROM users WHERE username = $1 FOR UPDATE', [username]);
        if (userRes.rowCount === 0) {
            throw new Error('User not found.');
        }
        
        const { password_hash } = userRes.rows[0];

        const isMatch = await compare(oldPassword, password_hash);
        if (!isMatch) {
            throw new Error('Authentication failure: Incorrect password.');
        }

        const newHash = await hash(newPassword, 10);
        
        await client.query(
            'UPDATE users SET password_hash = $1 WHERE username = $2',
            [newHash, username]
        );

        await client.query('COMMIT');

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'passwd: Password updated successfully' })
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: error.message || 'Internal server error.' }) 
        };
    } finally {
        client.release();
    }
};