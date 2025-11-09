// netlify/functions/checkPath.js

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event) => {
    // 1. Accepter que les requêtes GET
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { path, token } = event.queryStringParameters;

    // 2. Valider les entrées
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

    // 3. Valider le token
    let decodedPayload;
    try {
        decodedPayload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ success: false, message: 'tokenError' }) 
        };
    }

    // --- Logique de vérification ---
    const client = await pool.connect();
    try {
        // 4. Rechercher le chemin dans la BDD
        const res = await client.query(
            'SELECT * FROM filesystem WHERE path = $1', 
            [path]
        );

        // 5. Cas : Le chemin n'successe PAS
        if (res.rowCount === 0) {
            return {
                statusCode: 200, 
                body: JSON.stringify({ success: false })
            };
        }
        const node = res.rows[0];

        const perms = {
            owner: node.perms.slice(0, 3),
            creator: node.perms.slice(3, 6),
            other: node.perms.slice(6, 9)
        };

        let hasPerms = (path.startsWith(`/home/${decodedPayload.username}/`) && perms.owner[0] === 'r') ||
            (node.creator === decodedPayload.username && perms.creator[0] === 'r') ||
            perms.other[0] === 'r';
            
        if (!hasPerms) {
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
        console.error(error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ success: false, message: 'Internal server error.' }) 
        };
    } finally {
        client.release();
    }
};