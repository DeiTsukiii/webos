import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DB_URL });

export async function checkPerms(username, node, sudo = { enabled: false, password: null }) {
    const { enabled, password } = sudo;

    const userType = {
        owner: (node.path + '/').startsWith(`/home/${username}/`),
        creator: (node.creator === username),
        other: true
    }

    if (enabled) {
        if (!password) throw new Error('sudo: Incorrect password');

        let client;
        try {
            client = await pool.connect();
            const userRes = await client.query('SELECT password_hash, user_type FROM users WHERE username = $1', [username]);

            if (userRes.rowCount === 0) {
                throw new Error('sudo: Authentication failure (user not found)');
            }
            const user = userRes.rows[0];

            const validPassword = await bcrypt.compare(password, user.password_hash);

            if (validPassword) {
                if (userType.owner || userType.creator || user.user_type === 'admin') {
                    return { r: true, w: true, x: true };
                }

                throw new Error('sudo: User is not in the sudoers file.');
            } else {
                throw new Error('sudo: Incorrect password');
            }
        } catch (error) {
            throw new Error(error.message || 'sudo: Authentication failure');
        } finally {
            if (client) client.release();
        }
    }

    const perms = {
        owner: node.perms.slice(0, 3),
        creator: node.perms.slice(3, 6),
        other: node.perms.slice(6, 9)
    };

    const hasReadPerms = (userType.owner && perms.owner[0] === 'r') ||
        (userType.creator && perms.creator[0] === 'r') ||
        perms.other[0] === 'r';

    const hasWritePerms = (userType.owner && perms.owner[1] === 'w') ||
        (userType.creator && perms.creator[1] === 'w') ||
        perms.other[1] === 'w';

    const hasExecutePerms = (userType.owner && perms.owner[2] === 'x') ||
        (userType.creator && perms.creator[2] === 'x') ||
        perms.other[2] === 'x';

    return {
        r: hasReadPerms,
        w: hasWritePerms,
        x: hasExecutePerms
    };
}