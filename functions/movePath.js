import { Pool } from 'pg';
import { verify } from 'jsonwebtoken';
import { checkPerms } from './checkPerms.js'; // Assurez-vous que le chemin est correct

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const client = await pool.connect();
    try {
        const { sourcePath, destPath, token, sudo } = JSON.parse(event.body);

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

        const sourceRes = await client.query('SELECT * FROM filesystem WHERE path = $1 FOR UPDATE', [sourcePath]);
        if (sourceRes.rowCount === 0) throw new Error('NoSuchFileOrDirectory');

        const sourceNode = sourceRes.rows[0];

        if (!(await checkPerms(username, sourceNode, sudo)).w) {
            throw new Error('PermsDenied');
        }

        let finalPath = destPath;
        let finalParentPath;
        
        const destRes = await client.query('SELECT * FROM filesystem WHERE path = $1 FOR UPDATE', [destPath]);
        const destNode = destRes.rows[0];

        if (destNode) {
            if (destNode.type === 'd') {
                if (!(await checkPerms(username, destNode, sudo)).w) {
                    throw new Error('PermsDenied');
                }
                const sourceName = sourcePath.split('/').pop();
                finalPath = destPath === '/' ? `/${sourceName}` : `${destPath}/${sourceName}`;
                finalParentPath = destPath;

                const insideDestRes = await client.query('SELECT * FROM filesystem WHERE path = $1 FOR UPDATE', [finalPath]);
                if (insideDestRes.rowCount > 0) {
                    if (!(await checkPerms(username, insideDestRes.rows[0], sudo)).w) throw new Error('PermsDenied');
                    await client.query('DELETE FROM filesystem WHERE path = $1', [finalPath]);
                }

            } else {
                if (!(await checkPerms(username, destNode, sudo)).w) {
                    throw new Error('PermsDenied');
                }
                await client.query('DELETE FROM filesystem WHERE path = $1', [destPath]);
                finalParentPath = destPath.substring(0, destPath.lastIndexOf('/')) || '/';
            }
        } else {
            finalParentPath = destPath.substring(0, destPath.lastIndexOf('/')) || '/';
            
            const destParentRes = await client.query('SELECT * FROM filesystem WHERE path = $1', [finalParentPath]);
            if (destParentRes.rowCount === 0) throw new Error('NoSuchFileOrDirectory');
            if (!(await checkPerms(username, destParentRes.rows[0], sudo)).w) throw new Error('PermsDenied');
        }

        if (sourceNode.type === 'd' && (finalPath === sourcePath || finalPath.startsWith(`${sourcePath}/`))) throw new Error('InvalidDestination');

        if (sourceNode.type === 'd') {
            
            await client.query(
                `UPDATE filesystem 
                 SET 
                    path = CONCAT($1::text, SUBSTRING(path, $2)),
                    parent_path = CONCAT($1::text, SUBSTRING(parent_path, $2)),
                    last_update = NOW()
                 WHERE path LIKE $3`,
                [
                    finalPath,
                    sourcePath.length + 1,
                    `${sourcePath}/%`
                ]
            );

            await client.query(
                `UPDATE filesystem 
                 SET path = $1, parent_path = $2, last_update = NOW() 
                 WHERE path = $3`,
                [finalPath, finalParentPath, sourcePath]
            );

        } else {
            await client.query(
                `UPDATE filesystem 
                 SET path = $1, parent_path = $2, last_update = NOW() 
                 WHERE path = $3`,
                [finalPath, finalParentPath, sourcePath]
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