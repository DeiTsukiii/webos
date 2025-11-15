// 5 * 1024 * 1024 = 5 Mégaoctets
const USER_QUOTA = 5242880;

export async function checkQuota(client, path, sizeDelta = 0) {
    const parts = path.split('/');
    if (sizeDelta <= 0 || !path.startsWith('/home/') || parts.length < 3 || !parts[2]) return;

    const owner = parts[2];
    const homeDirPattern = `/home/${owner}/%`;

    const sizeRes = await client.query(
        `SELECT SUM(octet_length(content)) AS total_size
         FROM filesystem
         WHERE path LIKE $1 AND type = '-'`,
        [homeDirPattern]
    );

    const currentTotal = parseFloat(sizeRes.rows[0].total_size || 0);

    const newTotal = currentTotal + sizeDelta;

    if (newTotal > USER_QUOTA) {
        throw new Error(`bash: Could not write to '/home/${owner}': Limit is ${USER_QUOTA} bytes. This action would bring their total to ${newTotal} bytes.`);
    }
}