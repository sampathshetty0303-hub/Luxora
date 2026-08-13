
const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const OTP = require("../models/OTP");

const generateOTP = require("../utils/generateOTP");
const { sendOTP } = require("../utils/mailer");

const router = express.Router();

/*
==================================================
HELPERS
==================================================
*/

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function createToken(user) {

    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

function setLoginCookie(res, user) {

    const token = createToken(user);

    res.cookie(
        "luxoraToken",
        token,
        {
            httpOnly: true,
            sameSite: "lax",
            secure:
                process.env.NODE_ENV === "production",
            maxAge:
                7 * 24 * 60 * 60 * 1000
        }
    );
}

/*
==================================================
REGISTER - SEND OTP
==================================================

POST /api/auth/register/send-otp

Body:
{
    name,
    email
}
*/

router.post(
    "/register/send-otp",
    async (req, res) => {

        try {

            const name =
                String(req.body.name || "").trim();

            const email =
                normalizeEmail(req.body.email);

            if (!name || !email) {

                return res.status(400).json({
                    message:
                        "Name and email are required"
                });
            }

            /*
            Check whether account already exists
            */

            const existingUser =
                await User.findOne({ email });

            if (
                existingUser &&
                existingUser.isVerified
            ) {

                return res.status(400).json({
                    message:
                        "An account with this email already exists"
                });
            }

            /*
            Remove old registration OTPs
            */

            await OTP.deleteMany({
                email,
                purpose: "register"
            });

            /*
            Generate new OTP
            */

            const otp =
                generateOTP();

            /*
            Save registration information temporarily
            */

            await OTP.create({
                email,
                otp,
                purpose: "register",

                expiresAt:
                    new Date(
                        Date.now() +
                        10 * 60 * 1000
                    ),

                name
            });

            /*
            Send OTP email
            */

            await sendOTP(
                email,
                otp,
                "register"
            );

            res.json({
                success: true,
                message:
                    "Verification OTP sent"
            });

        } catch (error) {

            console.error(
                "REGISTER SEND OTP ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Could not send registration OTP"
            });
        }
    }
);


/*
==================================================
REGISTER - VERIFY OTP
==================================================

POST /api/auth/register/verify

Body:
{
    otp
}

The email is recovered from the latest
registration OTP record.
*/

router.post(
    "/register/verify",
    async (req, res) => {

        try {

            const otp =
                String(req.body.otp || "").trim();

            if (!/^\d{6}$/.test(otp)) {

                return res.status(400).json({
                    message:
                        "Enter a valid 6-digit OTP"
                });
            }

            const record =
                await OTP.findOne({
                    otp,
                    purpose: "register",
                    expiresAt: {
                        $gt: new Date()
                    }
                })
                .sort({
                    createdAt: -1
                });

            if (!record) {

                return res.status(400).json({
                    message:
                        "Invalid or expired OTP"
                });
            }

            const email =
                normalizeEmail(record.email);

            /*
            Get name saved with OTP.
            */

            const name =
                record.name || "LUXORA Customer";

            /*
            Find existing unverified account.
            */

            let user =
                await User.findOne({
                    email
                });

            if (user) {

                if (user.isVerified) {

                    await OTP.deleteMany({
                        email,
                        purpose: "register"
                    });

                    return res.status(400).json({
                        message:
                            "Account already exists"
                    });
                }

                user.name = name;
                user.isVerified = true;

                await user.save();

            } else {

                /*
                Create account after OTP verification.
                */

                user =
                    await User.create({
                        name,
                        email,
                        isVerified: true
                    });
            }

            /*
            Delete used OTP
            */

            await OTP.deleteMany({
                email,
                purpose: "register"
            });

            /*
            Log the customer in immediately.
            */

            setLoginCookie(
                res,
                user
            );

            res.json({
                success: true,
                message:
                    "Account created successfully",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (error) {

            console.error(
                "REGISTER VERIFY ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Account verification failed"
            });
        }
    }
);


/*
==================================================
REGISTER - RESEND OTP
==================================================

POST /api/auth/register/resend

Body:
{
    name,
    email
}

Also supports the current register.html,
which sends name + email to send-otp.
*/

router.post(
    "/register/resend",
    async (req, res) => {

        try {

            const name =
                String(req.body.name || "").trim();

            const email =
                normalizeEmail(req.body.email);

            if (!email) {

                return res.status(400).json({
                    message:
                        "Email is required"
                });
            }

            await OTP.deleteMany({
                email,
                purpose: "register"
            });

            const otp =
                generateOTP();

            await OTP.create({
                email,
                otp,
                purpose: "register",

                expiresAt:
                    new Date(
                        Date.now() +
                        10 * 60 * 1000
                    ),

                name
            });

            await sendOTP(
                email,
                otp,
                "register"
            );

            res.json({
                success: true,
                message:
                    "New registration OTP sent"
            });

        } catch (error) {

            console.error(
                "REGISTER RESEND ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Could not resend OTP"
            });
        }
    }
);


/*
==================================================
LOGIN - SEND OTP
==================================================

POST /api/auth/login/send-otp

Body:
{
    email
}
*/

router.post(
    "/login/send-otp",
    async (req, res) => {

        try {

            const email =
                normalizeEmail(req.body.email);

            if (!email) {

                return res.status(400).json({
                    message:
                        "Email is required"
                });
            }

            const user =
                await User.findOne({
                    email
                });

            if (!user) {

                return res.status(404).json({
                    message:
                        "No LUXORA account found with this email"
                });
            }

            if (!user.isVerified) {

                return res.status(403).json({
                    message:
                        "Please create and verify your account first"
                });
            }

            /*
            Delete previous login OTPs.
            */

            await OTP.deleteMany({
                email,
                purpose: "login"
            });

            const otp =
                generateOTP();

            await OTP.create({
                email,
                otp,
                purpose: "login",

                expiresAt:
                    new Date(
                        Date.now() +
                        10 * 60 * 1000
                    )
            });

            await sendOTP(
                email,
                otp,
                "login"
            );

            res.json({
                success: true,
                message:
                    "Login OTP sent"
            });

        } catch (error) {

            console.error(
                "LOGIN SEND OTP ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Could not send login OTP"
            });
        }
    }
);


/*
==================================================
LOGIN - VERIFY OTP
==================================================

POST /api/auth/login/verify

Body:
{
    otp
}
*/

router.post(
    "/login/verify",
    async (req, res) => {

        try {

            const otp =
                String(req.body.otp || "").trim();

            if (!/^\d{6}$/.test(otp)) {

                return res.status(400).json({
                    message:
                        "Enter a valid 6-digit OTP"
                });
            }

            const record =
                await OTP.findOne({
                    otp,
                    purpose: "login",
                    expiresAt: {
                        $gt: new Date()
                    }
                })
                .sort({
                    createdAt: -1
                });

            if (!record) {

                return res.status(400).json({
                    message:
                        "Invalid or expired OTP"
                });
            }

            const email =
                normalizeEmail(record.email);

            const user =
                await User.findOne({
                    email
                });

            if (!user) {

                return res.status(404).json({
                    message:
                        "Account not found"
                });
            }

            if (!user.isVerified) {

                return res.status(403).json({
                    message:
                        "Please verify your account first"
                });
            }

            /*
            Delete OTP after successful login.
            */

            await OTP.deleteMany({
                email,
                purpose: "login"
            });

            /*
            Create login session.
            */

            setLoginCookie(
                res,
                user
            );

            res.json({
                success: true,
                message:
                    "Login successful",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (error) {

            console.error(
                "LOGIN VERIFY ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Login verification failed"
            });
        }
    }
);


/*
==================================================
LOGIN - RESEND OTP
==================================================

POST /api/auth/login/resend

The current login.html uses this endpoint
without sending the email again.

The email is recovered from the previous
login OTP.
*/

router.post(
    "/login/resend",
    async (req, res) => {

        try {

            const previousOTP =
                await OTP.findOne({
                    purpose: "login",
                    expiresAt: {
                        $gt: new Date()
                    }
                })
                .sort({
                    createdAt: -1
                });

            if (!previousOTP) {

                return res.status(400).json({
                    message:
                        "Login session expired. Please enter your email again."
                });
            }

            const email =
                normalizeEmail(
                    previousOTP.email
                );

            const user =
                await User.findOne({
                    email
                });

            if (!user) {

                return res.status(404).json({
                    message:
                        "Account not found"
                });
            }

            await OTP.deleteMany({
                email,
                purpose: "login"
            });

            const otp =
                generateOTP();

            await OTP.create({
                email,
                otp,
                purpose: "login",

                expiresAt:
                    new Date(
                        Date.now() +
                        10 * 60 * 1000
                    )
            });

            await sendOTP(
                email,
                otp,
                "login"
            );

            res.json({
                success: true,
                message:
                    "New login OTP sent"
            });

        } catch (error) {

            console.error(
                "LOGIN RESEND ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Could not resend login OTP"
            });
        }
    }
);


/*
==================================================
LOGOUT
==================================================

POST /api/auth/logout
*/

router.post(
    "/logout",
    (req, res) => {

        res.clearCookie(
            "luxoraToken",
            {
                httpOnly: true,
                sameSite: "lax",
                secure:
                    process.env.NODE_ENV ===
                    "production"
            }
        );

        res.json({
            success: true,
            message:
                "Logged out successfully"
        });
    }
);


/*
==================================================
CURRENT USER
==================================================

GET /api/auth/me
*/

router.get(
    "/me",
    require("../middleware/auth"),
    async (req, res) => {

        try {

            const user =
                await User.findById(
                    req.user.id
                )
                .select("-password");

            if (!user) {

                return res.status(404).json({
                    loggedIn: false,
                    message:
                        "User not found"
                });
            }

            res.json({
                loggedIn: true,
                success: true,
                user
            });

        } catch (error) {

            console.error(
                "CURRENT USER ERROR:",
                error
            );

            res.status(500).json({
                loggedIn: false,
                message:
                    "Could not load user"
            });
        }
    }
);


/*
==================================================
LEGACY PASSWORD REGISTER
==================================================

Kept for compatibility with any older frontend.
*/

router.post(
    "/register",
    async (req, res) => {

        return res.status(400).json({
            message:
                "Please use email OTP registration."
        });
    }
);


/*
==================================================
LEGACY PASSWORD LOGIN
==================================================

Kept for compatibility with any older frontend.
*/

router.post(
    "/login",
    async (req, res) => {

        return res.status(400).json({
            message:
                "Please use email OTP login."
        });
    }
);


module.exports = router;

