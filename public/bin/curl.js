export async function curlMain(data) {
    const { operands, stdin } = data;

    const urls = [];
    if (operands.length) urls.push(...operands);
    if (stdin) urls.push(...stdin.trim().split('\n').map(line => line.trim()).filter(line => line));

    const results = [];

    await Promise.all(urls.map(async url => {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.text();

            results.push(data || '');

        } catch (error) {
            results.push(`curl: exception: ${error.message.replaceAll('fetch', 'curl')}`);
        }
    }));

    return results.join('\n');
}