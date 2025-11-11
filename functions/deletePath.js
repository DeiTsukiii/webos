import { Pool } from 'pg';
import { verify } from 'jsonwebtoken';
import { checkPerms } from './checkPerms';

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const client = await pool.connect();
    try {
        const { path, token, sudo, flags } = JSON.parse(event.body);
        const recursive = flags.includes('r') || flags.includes('recursive');

        if (!path || !token) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ success: false, message: 'path and token are required.' }) 
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

        const nodeRes = await client.query('SELECT * FROM filesystem WHERE path = $1 FOR UPDATE', [path]);
        if (nodeRes.rowCount === 0) throw new Error('NoSuchFileOrDirectory');
        const node = nodeRes.rows[0];

        if (!(await checkPerms(username, node, sudo)).w) throw new Error('PermsDenied');

        if (node.type === 'd') {
            if (!recursive) throw new Error('IsDirectory');
            await client.query(
                'DELETE FROM filesystem WHERE path = $1 OR path LIKE $2',
                [path, `${path}/%`]
            );

        } else {
            await client.query('DELETE FROM filesystem WHERE path = $1', [path]);
        }

        await client.query('COMMIT');

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
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