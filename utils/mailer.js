const { Resend } = require("resend");


// ======================================================
// RESEND
// ======================================================

const resend = new Resend(
    process.env.RESEND_API_KEY
);


// ======================================================
// EMAIL CONFIGURATION
// ======================================================

// IMPORTANT:
// This must be a sender address that Resend allows you
// to send from.
//
// For initial testing you can use:
// onboarding@resend.dev
//
// Once you verify your own domain in Resend, change this
// to something like:
// LUXORA <noreply@yourdomain.com>

const FROM_EMAIL =
    process.env.EMAIL_FROM ||
    "LUXORA <onboarding@resend.dev>";


// ======================================================
// SEND EMAIL HELPER
// ======================================================

async function sendEmail({
    to,
    subject,
    html
}) {

    try {

        if (!process.env.RESEND_API_KEY) {

            throw new Error(
                "RESEND_API_KEY is not configured"
            );

        }


        const { data, error } =
            await resend.emails.send({

                from: FROM_EMAIL,

                to: [to],

                subject,

                html

            });


        if (error) {

            console.error(
                "❌ Resend email error:"
            );

            console.error(error);

            throw new Error(
                error.message ||
                "Unable to send email"
            );

        }


        console.log(
            "✅ Email sent successfully:",
            data
        );


        return data;


    } catch (error) {

        console.error(
            "❌ EMAIL SEND ERROR:"
        );

        console.error(error);

        throw new Error(
            error.message ||
            "Unable to send email"
        );

    }

}


// ======================================================
// SEND OTP
// ======================================================

async function sendOTP(
    email,
    otp,
    purpose
) {

    let subject =
        "LUXORA Verification Code";


    let heading =
        "Verify Your LUXORA Account";


    if (purpose === "login") {

        subject =
            "LUXORA Login OTP";

        heading =
            "Login to LUXORA";

    }


    if (purpose === "register") {

        subject =
            "LUXORA Account Verification";

        heading =
            "Verify Your LUXORA Account";

    }


    const html = `

        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>
                ${subject}
            </title>

        </head>


        <body style="
            margin:0;
            padding:0;
            background:#f5f5f5;
            font-family:Arial,Helvetica,sans-serif;
        ">


            <div style="
                max-width:600px;
                margin:40px auto;
                background:#ffffff;
                border:1px solid #dddddd;
            ">


                <!-- HEADER -->

                <div style="
                    padding:30px;
                    text-align:center;
                    background:#0b0b0b;
                ">

                    <h1 style="
                        margin:0;
                        color:#d4af37;
                        font-family:Georgia,serif;
                        font-size:32px;
                        letter-spacing:7px;
                    ">
                        LUXORA
                    </h1>

                </div>


                <!-- CONTENT -->

                <div style="
                    padding:35px;
                    text-align:center;
                ">

                    <h2 style="
                        margin-top:0;
                        color:#222222;
                        font-weight:normal;
                    ">
                        ${heading}
                    </h2>


                    <p style="
                        color:#666666;
                        font-size:15px;
                        line-height:1.6;
                    ">
                        Your verification code is:
                    </p>


                    <div style="
                        margin:30px 0;
                    ">

                        <span style="
                            display:inline-block;
                            padding:18px 30px;
                            border:1px solid #d4af37;
                            color:#111111;
                            font-size:32px;
                            font-weight:bold;
                            letter-spacing:8px;
                        ">
                            ${otp}
                        </span>

                    </div>


                    <p style="
                        color:#555555;
                        font-size:14px;
                    ">
                        This OTP will expire in
                        <strong>10 minutes</strong>.
                    </p>


                    <p style="
                        color:#888888;
                        font-size:13px;
                        line-height:1.6;
                    ">
                        If you didn't request this code,
                        you can safely ignore this email.
                    </p>

                </div>


                <!-- FOOTER -->

                <div style="
                    padding:20px;
                    text-align:center;
                    border-top:1px solid #eeeeee;
                ">

                    <p style="
                        margin:0;
                        color:#999999;
                        font-size:12px;
                    ">
                        © LUXORA
                    </p>

                </div>


            </div>

        </body>

        </html>

    `;


    return sendEmail({

        to: email,

        subject,

        html

    });

}


// ======================================================
// SELLER ORDER EMAIL
// ======================================================

async function sendSellerOrderEmail(
    order
) {

    const itemsHTML =
        order.items
            .map(item => `

                <tr>

                    <td style="
                        padding:10px;
                        border-bottom:1px solid #ddd;
                    ">
                        ${item.name}
                    </td>


                    <td style="
                        padding:10px;
                        border-bottom:1px solid #ddd;
                    ">
                        ${item.quantity}
                    </td>


                    <td style="
                        padding:10px;
                        border-bottom:1px solid #ddd;
                    ">
                        ₹${item.price}
                    </td>


                    <td style="
                        padding:10px;
                        border-bottom:1px solid #ddd;
                    ">
                        ₹${item.price * item.quantity}
                    </td>

                </tr>

            `)
            .join("");


    const html = `

        <!DOCTYPE html>

        <html>

        <body style="
            font-family:Arial,Helvetica,sans-serif;
            background:#f5f5f5;
            padding:30px;
        ">


            <div style="
                max-width:800px;
                margin:auto;
                background:white;
                padding:30px;
            ">


                <h1 style="
                    color:#d4af37;
                    letter-spacing:5px;
                ">
                    LUXORA
                </h1>


                <h2>
                    New Order Received
                </h2>


                <p>
                    <strong>Order:</strong>
                    ${order.orderNumber}
                </p>


                <hr>


                <h3>
                    Customer Details
                </h3>


                <p>
                    <strong>Name:</strong>
                    ${order.customer.name}
                </p>


                <p>
                    <strong>Phone:</strong>
                    ${order.customer.phone}
                </p>


                <p>
                    <strong>Email:</strong>
                    ${order.customer.email || "Not provided"}
                </p>


                <p>

                    <strong>
                        Address:
                    </strong>

                    <br>

                    ${order.customer.address}

                    <br>

                    ${order.customer.city}

                    <br>

                    ${order.customer.state}

                    <br>

                    ${order.customer.pinCode}

                </p>


                <hr>


                <h3>
                    Order Items
                </h3>


                <table style="
                    width:100%;
                    border-collapse:collapse;
                ">


                    <thead>

                        <tr>

                            <th style="
                                text-align:left;
                                padding:10px;
                            ">
                                Product
                            </th>


                            <th style="
                                text-align:left;
                                padding:10px;
                            ">
                                Quantity
                            </th>


                            <th style="
                                text-align:left;
                                padding:10px;
                            ">
                                Price
                            </th>


                            <th style="
                                text-align:left;
                                padding:10px;
                            ">
                                Total
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${itemsHTML}

                    </tbody>


                </table>


                <hr>


                <h2>
                    Total: ₹${order.total}
                </h2>


                <p>
                    <strong>
                        Payment Method:
                    </strong>

                    ${order.paymentMethod}
                </p>


                <p>
                    <strong>
                        Order Status:
                    </strong>

                    ${order.orderStatus}
                </p>


            </div>

        </body>

        </html>

    `;


    return sendEmail({

        to: process.env.SELLER_EMAIL,

        subject:
            `NEW LUXORA ORDER - ${order.orderNumber}`,

        html

    });

}


// ======================================================
// CUSTOMER ORDER CONFIRMATION
// ======================================================

async function sendCustomerOrderConfirmation(
    order
) {

    if (
        !order.customer.email
    ) {

        console.log(
            "Customer email not provided. Skipping confirmation email."
        );

        return null;

    }


    const itemsHTML =
        order.items
            .map(item => `

                <li style="
                    margin-bottom:8px;
                ">

                    ${item.name}

                    × ${item.quantity}

                    — ₹${item.price * item.quantity}

                </li>

            `)
            .join("");


    const html = `

        <!DOCTYPE html>

        <html>

        <body style="
            margin:0;
            padding:30px;
            background:#f5f5f5;
            font-family:Arial,Helvetica,sans-serif;
        ">


            <div style="
                max-width:600px;
                margin:auto;
                background:#ffffff;
                padding:30px;
            ">


                <h1 style="
                    color:#d4af37;
                    letter-spacing:5px;
                ">
                    LUXORA
                </h1>


                <h2>
                    Thank you for your order!
                </h2>


                <p>
                    Your order has been
                    successfully received.
                </p>


                <p>
                    <strong>
                        Order Number:
                    </strong>

                    ${order.orderNumber}
                </p>


                <h3>
                    Items
                </h3>


                <ul>

                    ${itemsHTML}

                </ul>


                <h2>
                    Total: ₹${order.total}
                </h2>


                <p>
                    We will contact you
                    regarding your order.
                </p>


                <p>
                    Thank you for choosing
                    LUXORA.
                </p>


            </div>

        </body>

        </html>

    `;


    return sendEmail({

        to:
            order.customer.email,

        subject:
            `LUXORA Order Confirmation - ${order.orderNumber}`,

        html

    });

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    sendOTP,

    sendSellerOrderEmail,

    sendCustomerOrderConfirmation

};