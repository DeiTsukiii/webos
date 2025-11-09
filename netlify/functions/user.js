const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const token = event.queryStringParameters.token;

        if (!token) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: 'Token is required.' })
            };
        }

        const decodedPayload = jwt.verify(token, JWT_SECRET);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                user: {
                    id: decodedPayload.id,
                    username: decodedPayload.username,
                    type: decodedPayload.type
                }
            })
        };

    } catch (error) {
        return {
            statusCode: 401,
            body: JSON.stringify({ success: false, message: 'Invalid or expired token.' })
        };
    }
};