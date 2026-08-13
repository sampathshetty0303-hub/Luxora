const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const OTP = require("../models/OTP");

const generateOTP = require("../utils/generateOTP");
const { sendOTP } = require("../utils/mailer");

const router = express.Router();


// =====================================================
// HELPER - CREATE LOGIN TOKEN
// =====================================================

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


// =====================================================
// REGISTER - SEND OTP
// =====================================================

router.post("/register/send-otp", async (req, res) => {

    try {

        const { name, email } = req.body;

        if (!name || !email) {

            return res.status(400).json({
                message: "Name and email are required"
            });

        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const existingUser =
            await User.findOne({
                email: normalizedEmail
            });

        if (existingUser) {

            return res.status(400).json({
                message: "Account already exists. Please login."
            });

        }

        const otp = generateOTP();

        await OTP.deleteMany({
            email: normalizedEmail,
            purpose: "register"
        });

        await OTP.create({
            email: normalizedEmail,
            otp: String(otp),
            purpose: "register",
            expiresAt:
                new Date(
                    Date.now() + 10 * 60 * 1000
                )
        });

        await sendOTP(
            normalizedEmail,
            otp,
            "register"
        );

        // Remember registration email
        res.cookie(
            "luxoraRegisterEmail",
            normalizedEmail,
            {
                httpOnly: true,
                sameSite: "lax",
                secure:
                    process.env.NODE_ENV === "production",
                maxAge: 10 * 60 * 1000
            }
        );

        // Remember registration name
        res.cookie(
            "luxoraRegisterName",
            name.trim(),
            {
                httpOnly: true,
                sameSite: "lax",
                secure:
                    process.env.NODE_ENV === "production",
                maxAge: 10 * 60 * 1000
            }
        );

        res.json({
            success: true,
            message: "Registration OTP sent"
        });

    } catch (error) {

        console.error(
            "REGISTER OTP ERROR:",
            error
        );

        res.status(500).json({
            message: "Could not send registration OTP"
        });

    }

});


// =====================================================
// REGISTER - VERIFY OTP
// =====================================================

router.post("/register/verify", async (req, res) => {

    try {

        const {
            name,
            email,
            otp
        } = req.body;

        if (!name || !email || !otp) {

            return res.status(400).json({
                message:
                    "Name, email and OTP are required"
            });

        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const cleanOTP =
            String(otp).trim();

        const record =
            await OTP.findOne({
                email: normalizedEmail,
                otp: cleanOTP,
                purpose: "register",
                expiresAt: {
                    $gt: new Date()
                }
            });

        if (!record) {

            return res.status(400).json({
                message: "Invalid or expired OTP"
            });

        }

        const existingUser =
            await User.findOne({
                email: normalizedEmail
            });

        if (existingUser) {

            return res.status(400).json({
                message: "Account already exists"
            });

        }

        /*
        Your current registration page does not ask
        for a password.

        We therefore create a secure random internal
        password so the User model can still satisfy
        a required password field.
        */

        const randomPassword =
            crypto.randomBytes(32).toString("hex");

        const hashedPassword =
            await bcrypt.hash(
                randomPassword,
                12
            );

        const user =
            await User.create({
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                isVerified: true
            });

        await OTP.deleteMany({
            email: normalizedEmail,
            purpose: "register"
        });

        const token =
            createToken(user);

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

        res.clearCookie(
            "luxoraRegisterEmail"
        );

        res.clearCookie(
            "luxoraRegisterName"
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
                "Registration verification failed"
        });

    }

});


// =====================================================
// REGISTER - RESEND OTP
// =====================================================

router.post("/register/resend", async (req, res) => {

    try {

        const email =
            req.cookies.luxoraRegisterEmail;

        const name =
            req.cookies.luxoraRegisterName;

        if (!email || !name) {

            return res.status(400).json({
                message:
                    "Registration session expired. Please start again."
            });

        }

        const existingUser =
            await User.findOne({
                email
            });

        if (existingUser) {

            return res.status(400).json({
                message:
                    "Account already exists. Please login."
            });

        }

        const otp =
            generateOTP();

        await OTP.deleteMany({
            email,
            purpose: "register"
        });

        await OTP.create({
            email,
            otp: String(otp),
            purpose: "register",
            expiresAt:
                new Date(
                    Date.now() + 10 * 60 * 1000
                )
        });

        await sendOTP(
            email,
            otp,
            "register"
        );

        res.json({
            success: true,
            message: "New OTP sent"
        });

    } catch (error) {

        console.error(
            "REGISTER RESEND ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Could not resend registration OTP"
        });

    }

});


// =====================================================
// LOGIN - SEND OTP
// =====================================================

router.post("/login/send-otp", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {

            return res.status(400).json({
                message: "Email is required"
            });

        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const user =
            await User.findOne({
                email: normalizedEmail
            });

        if (!user) {

            return res.status(404).json({
                message:
                    "No account found with this email"
            });

        }

        if (!user.isVerified) {

            return res.status(403).json({
                message:
                    "Please verify your account first"
            });

        }

        const otp =
            generateOTP();

        await OTP.deleteMany({
            email: normalizedEmail,
            purpose: "login"
        });

        await OTP.create({
            email: normalizedEmail,
            otp: String(otp),
            purpose: "login",
            expiresAt:
                new Date(
                    Date.now() + 10 * 60 * 1000
                )
        });

        await sendOTP(
            normalizedEmail,
            otp,
            "login"
        );

        res.cookie(
            "luxoraLoginEmail",
            normalizedEmail,
            {
                httpOnly: true,
                sameSite: "lax",
                secure:
                    process.env.NODE_ENV === "production",
                maxAge: 10 * 60 * 1000
            }
        );

        res.json({
            success: true,
            message: "Login OTP sent"
        });

    } catch (error) {

        console.error(
            "LOGIN OTP ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Could not send login OTP"
        });

    }

});


// =====================================================
// LOGIN - VERIFY OTP
// =====================================================

router.post("/login/verify", async (req, res) => {

    try {

        const {
            email,
            otp
        } = req.body;

        const cookieEmail =
            req.cookies.luxoraLoginEmail;

        const normalizedEmail =
            (
                email ||
                cookieEmail ||
                ""
            )
            .trim()
            .toLowerCase();

        if (!normalizedEmail || !otp) {

            return res.status(400).json({
                message:
                    "Email and OTP are required"
            });

        }

        const record =
            await OTP.findOne({
                email: normalizedEmail,
                otp: String(otp).trim(),
                purpose: "login",
                expiresAt: {
                    $gt: new Date()
                }
            });

        if (!record) {

            return res.status(400).json({
                message:
                    "Invalid or expired OTP"
            });

        }

        const user =
            await User.findOne({
                email: normalizedEmail
            });

        if (!user) {

            return res.status(404).json({
                message:
                    "User account not found"
            });

        }

        const token =
            createToken(user);

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

        await OTP.deleteMany({
            email: normalizedEmail,
            purpose: "login"
        });

        res.clearCookie(
            "luxoraLoginEmail"
        );

        res.json({
            success: true,
            message: "Login successful",
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

});


// =====================================================
// LOGIN - RESEND OTP
// =====================================================

router.post("/login/resend", async (req, res) => {

    try {

        const email =
            req.cookies.luxoraLoginEmail;

        if (!email) {

            return res.status(400).json({
                message:
                    "Login session expired. Please enter your email again."
            });

        }

        const user =
            await User.findOne({
                email
            });

        if (!user) {

            return res.status(404).json({
                message:
                    "User account not found"
            });

        }

        const otp =
            generateOTP();

        await OTP.deleteMany({
            email,
            purpose: "login"
        });

        await OTP.create({
            email,
            otp: String(otp),
            purpose: "login",
            expiresAt:
                new Date(
                    Date.now() + 10 * 60 * 1000
                )
        });

        await sendOTP(
            email,
            otp,
            "login"
        );

        res.json({
            success: true,
            message: "New OTP sent"
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

});


// =====================================================
// PASSWORD LOGIN
// =====================================================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                message:
                    "Email and password are required"
            });

        }

        const user =
            await User.findOne({
                email:
                    email.trim().toLowerCase()
            });

        if (!user) {

            return res.status(401).json({
                message:
                    "Invalid email or password"
            });

        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {

            return res.status(401).json({
                message:
                    "Invalid email or password"
            });

        }

        if (!user.isVerified) {

            return res.status(403).json({
                message:
                    "Please verify your account first"
            });

        }

        const token =
            createToken(user);

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

        res.json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Login failed"
        });

    }

});


// =====================================================
// LOGOUT
// =====================================================

router.post("/logout", (req, res) => {

    res.clearCookie("luxoraToken");

    res.json({
        success: true,
        message: "Logged out"
    });

});


// =====================================================
// CURRENT USER
// =====================================================

router.get(
    "/me",
    require("../middleware/auth"),
    async (req, res) => {

        try {

            const user =
                await User.findById(
                    req.user.id
                ).select("-password");

            res.json({
                success: true,
                user
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message:
                    "Could not load user"
            });

        }

    }
);


module.exports = router;