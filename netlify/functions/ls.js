const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { checkPerms } = require('./checkPerms');

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { path, token, sudo } = event.queryStringParameters;

    if (!token) {
        return { 
            statusCode: 401,
            body: JSON.stringify({ success: false, message: 'tokenError' })
        };
    }
    if (!path) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'ls: path is required' }) 
        };
    }

    let decodedPayload;
    try {
        decodedPayload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ success: false, message: 'tokenError' }) 
        };
    }

    const client = await pool.connect();
    try {
        const nodeRes = await client.query(
            'SELECT type, perms FROM filesystem WHERE path = $1', 
            [path]
        );

        if (nodeRes.rowCount === 0) {
            return { 
                statusCode: 404,
                body: JSON.stringify({ success: false, message: 'NoSuchFileOrDirectory' }) 
            };
        }

        const node = nodeRes.rows[0];
        
        let perms;
        try {
            perms = await checkPerms(decodedPayload.username, node, JSON.parse(sudo));
        } catch (error) {
            return {
                statusCode: 403,
                body: JSON.stringify({ success: false, message: error.message || 'PermsDenied' })
            };
        }

        if (!perms.r) {
            return { 
                statusCode: 403, 
                body: JSON.stringify({ success: false, message: 'PermsDenied' }) 
            };
        }

        let sql = 'SELECT path, type, perms, creator, last_update FROM filesystem WHERE parent_path = $1 ORDER BY path';

        if (node.type === '-') sql = 'SELECT path, type, perms, creator, last_update FROM filesystem WHERE path = $1';

        const childrenRes = await client.query(sql, [path]);

        const children = [];

        childrenRes.rows.forEach((child, index) => {
            const name = child.path.split('/').pop();
            children.push({ ...childrenRes.rows[index], name });
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, children })
        };

    } catch (error) {
        console.error(error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ success: false, message: 'Internal server error.' }) 
        };
    } finally {
        client.release();
    }
};