const jwt = require("jsonwebtoken");

function auth(req, res, next) {

    const token = req.cookies.luxoraToken;

    if (!token) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired login"
        });
    }
}

module.exports = auth;