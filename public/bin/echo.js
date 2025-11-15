export async function echoMain(data) {
    return [data.operands.join(' '), data.stdin].filter(Boolean).join(' ');
}