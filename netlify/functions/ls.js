const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { path, token } = event.queryStringParameters;

    if (!token) {
        return { 
            statusCode: 401,
            body: JSON.stringify({ success: false, message: 'Token is required.' })
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
        decodedPayload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ success: false, message: 'Invalid or expired token.' }) 
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
                body: JSON.stringify({ success: false, message: 'No such file or directory.' }) 
            };
        }

        const node = nodeRes.rows[0];
        if (node.type !== 'd') {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ success: false, message: 'Not a directory.' }) 
            };
        }

        let hasPerms = false;
        const perms = {
            owner: node.perms.slice(0, 3),
            creator: node.perms.slice(3, 6),
            other: node.perms.slice(6, 9)
        };
        if (path.startsWith(`/home/${decodedPayload.username}/`) && perms.owner[0] === 'r') hasPerms = true;
        else if (node.creator === decodedPayload.username && perms.creator[0] === 'r') hasPerms = true;
        else if (perms.other[0] === 'r') hasPerms = true;
        if (!hasPerms) {
            return { 
                statusCode: 403, 
                body: JSON.stringify({ success: false, message: 'Permission denied.' }) 
            };
        }

        const childrenRes = await client.query(
            'SELECT path, type, perms, creator, last_update FROM filesystem WHERE parent_path = $1 ORDER BY path',
            [path]
        );

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