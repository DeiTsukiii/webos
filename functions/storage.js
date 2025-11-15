import { Pool } from 'pg';
import { verify } from 'jsonwebtoken';

const pool = new Pool({ connectionString: process.env.DB_URL });
const JWT_SECRET = process.env.JWT_SECRET;
const MB_DIVISOR = 1024 * 1024;

const formatToMB = (bytes) => {
    return parseFloat((Number(bytes || 0) / MB_DIVISOR).toFixed(4));
};

export const handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const client = await pool.connect();
    try {
        const { token } = event.queryStringParameters;

        if (!token) {
            return { statusCode: 401, body: JSON.stringify({ success: false, message: 'tokenError' }) };
        }

        let decodedPayload;
        try {
            decodedPayload = verify(token, JWT_SECRET);
        } catch (error) {
            return { statusCode: 401, body: JSON.stringify({ success: false, message: 'tokenError' }) };
        }
        const { username } = decodedPayload;

        const homeDirPattern = `/home/${username}/%`;

        const query = `
          SELECT 
            -- Taille totale de la base de données (PostgreSQL)
            (SELECT pg_database_size(current_database())) AS total_db_bytes,
            
            -- Taille totale de la table 'filesystem' (données + index)
            (SELECT pg_total_relation_size('filesystem')) AS filesystem_table_bytes,
            
            -- Taille totale de la table 'users' (données + index)
            (SELECT pg_total_relation_size('users')) AS users_table_bytes,
            
            -- Taille du *contenu* de tous les fichiers (type '-')
            (SELECT SUM(octet_length(content)) FROM filesystem WHERE type = '-') AS files_content_bytes,
            
            -- Nombre total de dossiers (type 'd')
            (SELECT COUNT(*) FROM filesystem WHERE type = 'd') AS directory_count,
            
            -- Taille du *contenu* des fichiers de l'utilisateur actuel
            (SELECT SUM(octet_length(content)) FROM filesystem WHERE type = '-' AND path LIKE $1) AS user_home_bytes
        `;
        
        const res = await client.query(query, [homeDirPattern]);
        const stats = res.rows[0];

        const storageInfo = {
            total_db: formatToMB(stats.total_db_bytes),
            tables: {
                filesystem_total: formatToMB(stats.filesystem_table_bytes),
                users_total: formatToMB(stats.users_table_bytes)
            },
            filesystem_breakdown: {
                all_files_content: formatToMB(stats.files_content_bytes),
                directory_count: Number(stats.directory_count)
            },
            user_home_content: formatToMB(stats.user_home_bytes),
            user_quota: formatToMB(5242880)
        };

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, ...storageInfo })
        };

    } catch (error) {
        console.error(error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ success: false, message: error.message || 'Internal server error.' }) 
        };
    } finally {
        client.release();
    }
};