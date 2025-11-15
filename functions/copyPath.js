import { Pool } from 'pg';
import { verify } from 'jsonwebtoken';
import { checkPerms } from './checkPerms';
import { checkQuota } from './checkQuota';
import { Buffer } from 'buffer';

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const client = await pool.connect();
    try {
        const { sourcePath, destPath, token, sudo, flags } = JSON.parse(event.body);

        const recursive = flags && (flags.includes('r') || flags.includes('recursive'));

        if (!sourcePath || !destPath || !token) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ success: false, message: 'Source, destination, and token are required.' }) 
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

        const sourceRes = await client.query('SELECT * FROM filesystem WHERE path = $1', [sourcePath]);
        if (sourceRes.rowCount === 0) throw new Error('NoSuchFileOrDirectory');
        const sourceNode = sourceRes.rows[0];

        if (!(await checkPerms(username, sourceNode, sudo)).r) throw new Error('PermsDenied');

        let finalPath = destPath;
        let finalParentPath;
        
        const destRes = await client.query('SELECT * FROM filesystem WHERE path = $1 FOR UPDATE', [destPath]);
        const destNode = destRes.rows[0];

        if (destNode) {
            if (destNode.type === 'd') {
                if (!(await checkPerms(username, destNode, sudo)).w) throw new Error('PermsDenied');
                const sourceName = sourcePath.split('/').pop();
                finalPath = destPath === '/' ? `/${sourceName}` : `${destPath}/${sourceName}`;
                finalParentPath = destPath;

                const insideDestRes = await client.query('SELECT * FROM filesystem WHERE path = $1 FOR UPDATE', [finalPath]);
                if (insideDestRes.rowCount > 0) {
                    if (!(await checkPerms(username, insideDestRes.rows[0], sudo)).w) throw new Error('PermsDenied');
                    await client.query('DELETE FROM filesystem WHERE path = $1 OR path LIKE $2', [finalPath, `${finalPath}/%`]);
                }
            } else {
                if (!(await checkPerms(username, destNode, sudo)).w) throw new Error('PermsDenied');
                await client.query('DELETE FROM filesystem WHERE path = $1', [destPath]);
                finalParentPath = destPath.substring(0, destPath.lastIndexOf('/')) || '/';
            }
        } else {
            finalParentPath = destPath.substring(0, destPath.lastIndexOf('/')) || '/';
            const destParentRes = await client.query('SELECT * FROM filesystem WHERE path = $1', [finalParentPath]);
            if (destParentRes.rowCount === 0) throw new Error('NoSuchFileOrDirectory');
            if (!(await checkPerms(username, destParentRes.rows[0], sudo)).w) throw new Error('PermsDenied');
        }

        if (sourceNode.type === 'd') {
            if (!recursive) throw new Error('IsADirectory');

            const allNodesRes = await client.query(
                'SELECT * FROM filesystem WHERE path = $1 OR path LIKE $2',
                [sourcePath, `${sourcePath}/%`]
            );
            const allNodes = allNodesRes.rows;

            let totalSizeDelta = 0;
            allNodes.forEach(node => {
                if (node.type === '-' && node.content) {
                    totalSizeDelta += Buffer.byteLength(node.content, 'utf8');
                }
            });
            await checkQuota(client, finalPath, totalSizeDelta);

            const insertQuery = `
                INSERT INTO filesystem (path, parent_path, type, perms, content, creator, last_update)
                VALUES %L;
            `;
            const values = allNodes.map(node => {
                const newPath = finalPath + node.path.substring(sourcePath.length);
                let newParentPath;
                if (newPath === finalPath) {
                    newParentPath = finalParentPath;
                } else {
                    newParentPath = finalPath + node.parent_path.substring(sourcePath.length);
                }
                
                return [
                    newPath,
                    newParentPath,
                    node.type,
                    node.perms,
                    node.content,
                    username,
                    new Date()
                ];
            });

            for (const value of values) {
                await client.query(
                    `INSERT INTO filesystem (path, parent_path, type, perms, content, creator, last_update)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    value
                );
            }

        } else {
            const sizeDelta = sourceNode.content ? Buffer.byteLength(sourceNode.content, 'utf8') : 0;
            await checkQuota(client, finalPath, sizeDelta);

            await client.query(
                `INSERT INTO filesystem (path, parent_path, type, perms, content, creator, last_update)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    finalPath,
                    finalParentPath,
                    sourceNode.type,
                    sourceNode.perms,
                    sourceNode.content,
                    username,
                    new Date()
                ]
            );
        }

        await client.query('COMMIT');

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, newPath: finalPath })
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