const nodemailer = require("nodemailer");


// ======================================================
// GMAIL SMTP
// ======================================================

const transporter = nodemailer.createTransport({

    host: "smtp.gmail.com",

    port: 465,

    secure: true,

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },

    connectionTimeout: 30000,

    greetingTimeout: 30000,

    socketTimeout: 60000

});


// ======================================================
// TEST GMAIL CONNECTION
// ======================================================

transporter.verify()

    .then(() => {

        console.log(
            "✅ Gmail SMTP connection successful"
        );

    })

    .catch((error) => {

        console.error(
            "❌ Gmail SMTP connection failed:"
        );

        console.error(error);

    });


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


    if (purpose === "login") {

        subject =
            "LUXORA Login OTP";

    }


    if (purpose === "register") {

        subject =
            "LUXORA Account Verification";

    }


    const mailOptions = {

        from:
            `"LUXORA" <${process.env.EMAIL_USER}>`,

        to:
            email,

        subject:

            subject,

        html: `

            <div style="
                font-family:Arial,sans-serif;
                max-width:600px;
                margin:auto;
                padding:30px;
                border:1px solid #ddd;
                background:#ffffff;
            ">

                <h1 style="
                    letter-spacing:5px;
                    color:#111;
                ">
                    LUXORA
                </h1>


                <p style="
                    color:#555;
                    font-size:16px;
                ">
                    Your verification code is:
                </p>


                <div style="
                    text-align:center;
                    margin:30px 0;
                ">

                    <span style="
                        display:inline-block;
                        font-size:32px;
                        font-weight:bold;
                        letter-spacing:8px;
                        color:#d4af37;
                        padding:15px 25px;
                        border:1px solid #d4af37;
                    ">
                        ${otp}
                    </span>

                </div>


                <p style="
                    color:#555;
                    font-size:14px;
                ">
                    This OTP will expire in
                    <strong>10 minutes</strong>.
                </p>


                <p style="
                    color:#777;
                    font-size:13px;
                ">
                    If you didn't request this code,
                    you can safely ignore this email.
                </p>


                <hr style="
                    border:0;
                    border-top:1px solid #eee;
                    margin:30px 0;
                ">


                <p style="
                    color:#999;
                    font-size:12px;
                    text-align:center;
                ">
                    © LUXORA
                </p>

            </div>

        `

    };


    try {

        const info =
            await transporter.sendMail(
                mailOptions
            );


        console.log(
            "✅ OTP email sent successfully:",
            info.messageId
        );


        return info;


    } catch (error) {

        console.error(
            "❌ OTP EMAIL ERROR:"
        );

        console.error(error);


        throw new Error(
            "Unable to send OTP email"
        );

    }

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


    const mailOptions = {

        from:
            `"LUXORA Store" <${process.env.EMAIL_USER}>`,

        to:
            process.env.SELLER_EMAIL,

        subject:
            `NEW LUXORA ORDER - ${order.orderNumber}`,

        html: `

            <div style="
                font-family:Arial,sans-serif;
                max-width:800px;
                margin:auto;
            ">

                <h1>LUXORA</h1>

                <h2>New Order Received</h2>


                <p>
                    <strong>Order:</strong>
                    ${order.orderNumber}
                </p>


                <hr>


                <h3>Customer Details</h3>


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
                    <strong>Address:</strong><br>

                    ${order.customer.address}<br>

                    ${order.customer.city}<br>

                    ${order.customer.state}<br>

                    ${order.customer.pinCode}
                </p>


                <hr>


                <h3>Order Items</h3>


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
                    Payment Method:
                    ${order.paymentMethod}
                </p>


                <p>
                    Order Status:
                    ${order.orderStatus}
                </p>

            </div>

        `

    };


    return transporter.sendMail(
        mailOptions
    );

}


// ======================================================
// CUSTOMER ORDER CONFIRMATION
// ======================================================

async function sendCustomerOrderConfirmation(
    order
) {

    if (!order.customer.email) {

        return null;

    }


    const itemsHTML =
        order.items
            .map(item => `

                <li>

                    ${item.name}

                    × ${item.quantity}

                    — ₹${item.price * item.quantity}

                </li>

            `)
            .join("");


    const mailOptions = {

        from:
            `"LUXORA" <${process.env.EMAIL_USER}>`,

        to:
            order.customer.email,

        subject:
            `LUXORA Order Confirmation - ${order.orderNumber}`,

        html: `

            <div style="
                font-family:Arial,sans-serif;
                max-width:600px;
                margin:auto;
                padding:30px;
            ">

                <h1>LUXORA</h1>


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

        `

    };


    return transporter.sendMail(
        mailOptions
    );

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    sendOTP,

    sendSellerOrderEmail,

    sendCustomerOrderConfirmation

};