// netlify/functions/ls.js

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { path, token } = event.queryStringParameters;
    const output = [];

    if (!token) {
        output.push('Token is required.');
        return { 
            statusCode: 401,
            body: JSON.stringify({ success: false, message: 'Token is required.', output }) 
        };
    }
    if (!path) {
        output.push('Path is required.');
        return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'Path is required.', output }) 
        };
    }

    let decodedPayload;
    try {
        decodedPayload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        output.push('Invalid or expired token.');
        return { 
            statusCode: 401, 
            body: JSON.stringify({ success: false, message: 'Invalid or expired token.', output }) 
        };
    }

    const client = await pool.connect();
    try {
        const nodeRes = await client.query(
            'SELECT type, perms FROM filesystem WHERE path = $1', 
            [path]
        );

        if (nodeRes.rowCount === 0) {
            output.push('No such file or directory.');
            return { 
                statusCode: 404,
                body: JSON.stringify({ success: false, message: 'No such file or directory.', output }) 
            };
        }

        const node = nodeRes.rows[0];
        if (node.type !== 'd') {
            output.push('Not a directory.');
            return { 
                statusCode: 400, 
                body: JSON.stringify({ success: false, message: 'Not a directory.', output }) 
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
            output.push('Permission denied.');
            return { 
                statusCode: 403, 
                body: JSON.stringify({ success: false, message: 'Permission denied.', output }) 
            };
        }

        const childrenRes = await client.query(
            'SELECT path, type, perms FROM filesystem WHERE parent_path = $1 ORDER BY path',
            [path]
        );

        const names = [];

        childrenRes.rows.forEach(child => {
            const name = child.path.split('/').pop();
            console.log(name);
            names.push(name);
        });

        output.push(names.join('  '))

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, children: childrenRes.rows, output })
        };

    } catch (error) {
        console.error(error);
        output.push('Internal server error.');
        return { 
            statusCode: 500, 
            body: JSON.stringify({ success: false, message: 'Internal server error.', output }) 
        };
    } finally {
        client.release();
    }
};