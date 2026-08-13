const User = require("../models/User");

async function admin(req, res, next) {

    try {

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        const user = await User.findById(req.user.id)
            .select("role");

        if (!user) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        if (user.role !== "admin") {
            return res.status(403).json({
                message: "Admin access required"
            });
        }

        req.admin = user;

        next();

    } catch (error) {

        console.error("ADMIN AUTH ERROR:", error);

        res.status(500).json({
            message: "Could not verify admin access"
        });
    }
}

module.exports = admin;