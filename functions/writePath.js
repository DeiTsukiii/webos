import { Pool } from 'pg';
import { verify } from 'jsonwebtoken';
import { checkPerms } from './checkPerms';
import { checkQuota } from './checkQuota';

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { type, perms, content, appendMode, path, token, sudo } = JSON.parse(event.body);

    if (!path || !token) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ success: false, message: 'path and token are required.' }) 
        };
    }

    const client = await pool.connect();
    try {
        let decodedPayload;
        try {
            decodedPayload = verify(token, JWT_SECRET);
        } catch (error) {
            return { statusCode: 401, body: JSON.stringify({ success: false, message: 'tokenError' }) };
        }
        const { username } = decodedPayload;

        await client.query('BEGIN');

        const nodeRes = await client.query('SELECT * FROM filesystem WHERE path = $1 FOR UPDATE', [path]);
        const existingNode = nodeRes.rows[0];

        let resultNode;

        if (existingNode) {
            const existingPerms = await checkPerms(decodedPayload.username, existingNode, sudo);
            if (!existingPerms.w) throw new Error('PermsDenied');

            if (content !== undefined && existingNode.type === '-') {
                const oldSize = existingNode.content ? Buffer.byteLength(existingNode.content, 'utf8') : 0;
                
                const newFileContent = appendMode ? (existingNode.content || '') + content : content;
                const newSize = Buffer.byteLength(newFileContent, 'utf8');

                const sizeDelta = newSize - oldSize;
                
                await checkQuota(client, path, sizeDelta);
            }

            const updates = [];
            const values = [];
            let valueIndex = 1;

            if (perms !== undefined) {
                updates.push(`perms = $${valueIndex++}`);
                values.push(perms);
            }

            if (content !== undefined && existingNode.type === '-') {
                updates.push(`content = $${valueIndex++}`);
                values.push(appendMode ? existingNode.content + content : content);
            }

            updates.push(`last_update = $${valueIndex++}`);
            values.push(new Date());

            const updateQuery = `UPDATE filesystem SET ${updates.join(', ')} WHERE path = $${valueIndex++} RETURNING *`;
            values.push(path);
            const res = await client.query(updateQuery, values);
            resultNode = res.rows[0];
            console.log('Updated node:', resultNode);
        } else {
            if (type === undefined) {
                throw new Error("Cannot create node: 'type' is required.");
            }

            const pathPerms = perms ? perms : (type === '-' ? 'rw-rw-r--' : 'rwxrwxr-x');

            const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
            const parentRes = await client.query('SELECT * FROM filesystem WHERE path = $1', [parentPath]);

            if (parentRes.rowCount === 0) throw new Error('NoSuchFileOrDirectory');

            const parent = parentRes.rows[0];

            const parentPerms = await checkPerms(username, parent, sudo);
            if (!parentPerms.w) throw new Error('PermsDenied');

            if (parent.type !== 'd') throw new Error('ParentNotADirectory');

            const fileContent = (type === '-') ? (content || '') : null;

            if (fileContent) {
                const sizeDelta = Buffer.byteLength(fileContent, 'utf8');
                await checkQuota(client, path, sizeDelta); 
            }

            const insertQuery = `
                INSERT INTO filesystem (path, parent_path, type, perms, content, creator, last_update)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;
            `;
            const res = await client.query(insertQuery, [
                path, parentPath, type, pathPerms, fileContent, username, new Date()
            ]);
            resultNode = res.rows[0];
        }

        await client.query('COMMIT');

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, data: resultNode })
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
}