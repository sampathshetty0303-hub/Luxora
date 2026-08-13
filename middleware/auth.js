const jwt = require("jsonwebtoken");


/*
==================================================
AUTHENTICATION
==================================================
*/

function auth(req, res, next) {

    const token = req.cookies?.luxoraToken;

    if (!token) {

        return res.status(401).json({
            success: false,
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

        console.error(
            "AUTH ERROR:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired login"
        });

    }

}


/*
==================================================
ADMIN AUTHENTICATION
==================================================
*/

function adminAuth(req, res, next) {

    auth(req, res, () => {

        if (!req.user) {

            return res.status(401).json({
                success: false,
                message: "Please login first"
            });

        }


        if (req.user.role !== "admin") {

            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });

        }


        next();

    });

}


module.exports = auth;

module.exports.auth = auth;
module.exports.adminAuth = adminAuth;