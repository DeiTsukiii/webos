export async function exportMain(data) {
    const { operands, ctx } = data;

    operands.forEach(operand => {
        const equalIndex = operand.indexOf('=');
        if (equalIndex === -1) {
            const key = operand;
            ctx.env = { key, value: '' };
        } else {
            const key = operand.substring(0, equalIndex);
            let value = operand.substring(equalIndex + 1);

            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length - 1);
            }

            ctx.env = { key, value };
        }
    });

    return '';
}