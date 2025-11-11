import { Pool } from 'pg';
import { verify } from 'jsonwebtoken';
import { checkPerms } from './checkPerms';

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;

export async function handler(event) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { path, token } = event.queryStringParameters;
    const sudo = event.queryStringParameters.sudo || JSON.stringify({ enabled: false });

    if (!token) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ success: false, message: 'tokenError' }) 
        };
    }
    if (!path) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'Path is required.' }) 
        };
    }

    let decodedPayload;
    try {
        decodedPayload = verify(token, JWT_SECRET);
    } catch (error) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ success: false, message: 'tokenError' }) 
        };
    }

    const client = await pool.connect();
    try {
        const res = await client.query(
            'SELECT * FROM filesystem WHERE path = $1', 
            [path]
        );

        if (res.rowCount === 0) {
            return {
                statusCode: 200, 
                body: JSON.stringify({ success: false, message: 'NoSuchFileOrDirectory' })
            };
        }
        const node = res.rows[0];

        let perms;
        try {
            perms = await checkPerms(decodedPayload.username, node, JSON.parse(sudo));
        } catch (error) {
            console.error(error);
            return {
                statusCode: 403,
                body: JSON.stringify({ success: false, message: error.message || 'PermsDenied', ...node })
            };
        }

        if (!perms.r) {
            delete node.content;
            return { 
                statusCode: 403, 
                body: JSON.stringify({ success: false, message: 'PermsDenied', ...node })
            };
        }


        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, ...node })
        };

    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ success: false, message: 'Internal server error.' }) 
        };
    } finally {
        client.release();
    }
}