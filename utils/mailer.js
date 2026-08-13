const nodemailer = require("nodemailer");

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ EMAIL_USER or EMAIL_PASS is missing");
}

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Test Gmail connection when server starts
transporter.verify((error, success) => {

    if (error) {

        console.error(
            "❌ Gmail SMTP connection failed:"
        );

        console.error(error);

    } else {

        console.log(
            "✅ Gmail SMTP connection successful"
        );

    }

});


async function sendOTP(email, otp, purpose) {

    let subject = "LUXORA Verification Code";

    if (purpose === "login") {
        subject = "LUXORA Login OTP";
    }

    if (purpose === "register") {
        subject = "LUXORA Account Verification";
    }

    try {

        const result = await transporter.sendMail({

            from: `"LUXORA" <${process.env.EMAIL_USER}>`,

            to: email,

            subject,

            html: `
                <div style="
                    font-family:Arial,sans-serif;
                    max-width:600px;
                    margin:auto;
                    padding:30px;
                    border:1px solid #ddd;
                ">

                    <h1 style="
                        letter-spacing:5px;
                        color:#111;
                    ">
                        LUXORA
                    </h1>

                    <p>
                        Your LUXORA verification code is:
                    </p>

                    <h2 style="
                        font-size:32px;
                        letter-spacing:8px;
                    ">
                        ${otp}
                    </h2>

                    <p>
                        This OTP will expire in 10 minutes.
                    </p>

                    <p>
                        If you didn't request this code,
                        you can safely ignore this email.
                    </p>

                </div>
            `
        });

        console.log(
            `✅ OTP email sent to ${email}`
        );

        console.log(
            "Message ID:",
            result.messageId
        );

        return result;

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


async function sendSellerOrderEmail(order) {

    const itemsHTML = order.items.map(item => `
        <tr>
            <td style="padding:10px;border-bottom:1px solid #ddd;">
                ${item.name}
            </td>

            <td style="padding:10px;border-bottom:1px solid #ddd;">
                ${item.quantity}
            </td>

            <td style="padding:10px;border-bottom:1px solid #ddd;">
                ₹${item.price}
            </td>

            <td style="padding:10px;border-bottom:1px solid #ddd;">
                ₹${item.price * item.quantity}
            </td>
        </tr>
    `).join("");


    return transporter.sendMail({

        from: `"LUXORA Store" <${process.env.EMAIL_USER}>`,

        to: process.env.SELLER_EMAIL,

        subject:
            `NEW LUXORA ORDER - ${order.orderNumber}`,

        html: `
            <div style="
                font-family:Arial;
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

                            <th style="text-align:left;padding:10px;">
                                Product
                            </th>

                            <th style="text-align:left;padding:10px;">
                                Quantity
                            </th>

                            <th style="text-align:left;padding:10px;">
                                Price
                            </th>

                            <th style="text-align:left;padding:10px;">
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
    });
}


async function sendCustomerOrderConfirmation(order) {

    if (!order.customer.email) {
        return null;
    }

    const itemsHTML = order.items.map(item => `
        <li>
            ${item.name}
            × ${item.quantity}
            — ₹${item.price * item.quantity}
        </li>
    `).join("");


    return transporter.sendMail({

        from: `"LUXORA" <${process.env.EMAIL_USER}>`,

        to: order.customer.email,

        subject:
            `LUXORA Order Confirmation - ${order.orderNumber}`,

        html: `
            <div style="
                font-family:Arial;
                max-width:600px;
                margin:auto;
                padding:30px;
            ">

                <h1>LUXORA</h1>

                <h2>
                    Thank you for your order!
                </h2>

                <p>
                    Your order has been successfully received.
                </p>

                <p>
                    <strong>Order Number:</strong>
                    ${order.orderNumber}
                </p>

                <h3>Items</h3>

                <ul>
                    ${itemsHTML}
                </ul>

                <h2>
                    Total: ₹${order.total}
                </h2>

                <p>
                    We will contact you regarding your order.
                </p>

                <p>
                    Thank you for choosing LUXORA.
                </p>

            </div>
        `
    });
}


module.exports = {
    sendOTP,
    sendSellerOrderEmail,
    sendCustomerOrderConfirmation
};