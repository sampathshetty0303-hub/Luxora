const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");

const auth = require("../middleware/auth");

const {
    sendSellerOrderEmail,
    sendCustomerOrderConfirmation
} = require("../utils/mailer");

const router = express.Router();


/*
==================================================
CREATE ORDER
==================================================
*/

router.post("/", async (req, res) => {

    try {

        const {
            name,
            phone,
            address,
            city,
            state,
            pinCode,
            email,
            items
        } = req.body;


        /*
        Validate customer details
        */

        if (
            !name ||
            !phone ||
            !address ||
            !city ||
            !state ||
            !pinCode
        ) {

            return res.status(400).json({
                message:
                    "Please provide all required checkout details"
            });

        }


        /*
        Validate cart
        */

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            return res.status(400).json({
                message:
                    "Your bag is empty"
            });

        }


        /*
        Build order items using
        REAL MongoDB product data.

        Never trust price from browser.
        */

        const orderItems = [];


        for (const item of items) {

            const productId =
                item.productId;


            const quantity =
                Number(item.quantity);


            /*
            Validate product ID
            */

            if (
                !productId ||
                !mongoose.Types.ObjectId.isValid(
                    productId
                )
            ) {

                return res.status(400).json({
                    message:
                        "Invalid product in cart"
                });

            }


            /*
            Validate quantity
            */

            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {

                return res.status(400).json({
                    message:
                        "Invalid product quantity"
                });

            }


            /*
            Find product in MongoDB
            */

            const product =
                await Product.findById(
                    productId
                );


            if (!product) {

                return res.status(400).json({
                    message:
                        `Product not found: ${productId}`
                });

            }


            /*
            Check stock
            */

            if (
                Number(product.stock) < quantity
            ) {

                return res.status(400).json({
                    message:
                        `${product.name} is out of stock`
                });

            }


            /*
            Make sure price is valid
            */

            const price =
                Number(product.price);


            if (
                !Number.isFinite(price) ||
                price < 0
            ) {

                return res.status(400).json({
                    message:
                        `${product.name} has an invalid price`
                });

            }


            /*
            Add item to order

            Price comes from MongoDB,
            NOT the browser.
            */

            orderItems.push({

                productId:
                    product._id,

                name:
                    product.name,

                price:
                    price,

                quantity:
                    quantity,

                image:
                    product.image || ""

            });

        }


        /*
        Make sure we actually have items
        */

        if (orderItems.length === 0) {

            return res.status(400).json({
                message:
                    "No valid products found in cart"
            });

        }


        /*
        ==================================================
        CALCULATE SUBTOTAL
        ==================================================
        */

        const subtotal =
            orderItems.reduce(
                (sum, item) => {

                    return (
                        sum +
                        Number(item.price) *
                        Number(item.quantity)
                    );

                },
                0
            );


        /*
        ==================================================
        SHIPPING
        ==================================================

        FREE shipping for orders >= ₹999
        Otherwise ₹50
        */

        const shipping =
            subtotal >= 999
                ? 0
                : 50;


        /*
        ==================================================
        FINAL TOTAL
        ==================================================
        */

        const total =
            subtotal + shipping;


        /*
        Safety check
        */

        if (
            !Number.isFinite(subtotal) ||
            !Number.isFinite(total)
        ) {

            return res.status(400).json({
                message:
                    "Could not calculate order total"
            });

        }


        /*
        ==================================================
        ORDER NUMBER
        ==================================================
        */

        const orderNumber =
            "LUX-" +
            Date.now()
                .toString()
                .slice(-8) +
            "-" +
            crypto
                .randomBytes(2)
                .toString("hex")
                .toUpperCase();


        /*
        ==================================================
        CREATE ORDER
        ==================================================
        */

        const order =
            await Order.create({

                orderNumber,

                /*
                Guest checkout.
                If you later want logged-in
                orders, you can use req.user.id.
                */

                userId:
                    null,

                customer: {

                    name:
                        name.trim(),

                    phone:
                        phone.trim(),

                    email:
                        email
                            ? email.trim().toLowerCase()
                            : "",

                    address:
                        address.trim(),

                    city:
                        city.trim(),

                    state:
                        state.trim(),

                    pinCode:
                        pinCode.trim()

                },

                items:
                    orderItems,

                subtotal:
                    subtotal,

                shipping:
                    shipping,

                total:
                    total,

                paymentMethod:
                    "Order by Email / Cash on Delivery",

                paymentStatus:
                    "pending",

                orderStatus:
                    "pending"

            });


        /*
        ==================================================
        REDUCE STOCK
        ==================================================
        */

        for (
            const item of orderItems
        ) {

            await Product.findByIdAndUpdate(

                item.productId,

                {
                    $inc: {
                        stock:
                            -item.quantity
                    }
                }

            );

        }


        /*
        ==================================================
        SEND SELLER EMAIL
        ==================================================
        */

        try {

            await sendSellerOrderEmail(
                order
            );


            order.sellerEmailSent =
                true;


            await order.save();


        } catch (emailError) {

            console.error(
                "Seller email failed:",
                emailError.message
            );

        }


        /*
        ==================================================
        SEND CUSTOMER CONFIRMATION
        ==================================================
        */

        if (
            order.customer.email
        ) {

            try {

                await sendCustomerOrderConfirmation(
                    order
                );


                order.customerEmailSent =
                    true;


                await order.save();


            } catch (emailError) {

                console.error(
                    "Customer email failed:",
                    emailError.message
                );

            }

        }


        /*
        ==================================================
        SUCCESS RESPONSE
        ==================================================
        */

        return res.status(201).json({

            success:
                true,

            message:
                "Order placed successfully",

            orderNumber:
                order.orderNumber,

            subtotal:
                order.subtotal,

            shipping:
                order.shipping,

            total:
                order.total

        });


    } catch (error) {

        console.error(
            "CREATE ORDER ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Could not place order"
        });

    }

});


/*
==================================================
GET CUSTOMER ORDERS
==================================================
*/

router.get(
    "/my-orders",
    auth,
    async (req, res) => {

        try {

            const orders =
                await Order.find({

                    userId:
                        req.user.id

                })
                .sort({
                    createdAt: -1
                });


            return res.json({

                success:
                    true,

                orders:
                    orders

            });


        } catch (error) {

            console.error(
                "MY ORDERS ERROR:",
                error
            );


            return res.status(500).json({

                message:
                    "Could not load orders"

            });

        }

    }
);


/*
==================================================
GET ALL ORDERS
==================================================
*/

router.get(
    "/admin/all",
    async (req, res) => {

        try {

            const orders =
                await Order.find()
                    .populate(
                        "userId",
                        "name email phone"
                    )
                    .sort({
                        createdAt: -1
                    });


            return res.json({

                success:
                    true,

                orders:
                    orders

            });


        } catch (error) {

            console.error(
                "ALL ORDERS ERROR:",
                error
            );


            return res.status(500).json({

                message:
                    "Could not load orders"

            });

        }

    }
);


/*
==================================================
UPDATE ORDER STATUS
==================================================
*/

router.patch(
    "/:id/status",
    async (req, res) => {

        try {

            const {
                status
            } = req.body;


            const allowedStatuses = [

                "pending",

                "confirmed",

                "processing",

                "shipped",

                "delivered",

                "cancelled"

            ];


            if (
                !allowedStatuses.includes(
                    status
                )
            ) {

                return res.status(400).json({

                    message:
                        "Invalid order status"

                });

            }


            /*
            Validate MongoDB ID
            */

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    message:
                        "Invalid order ID"

                });

            }


            const order =
                await Order.findByIdAndUpdate(

                    req.params.id,

                    {
                        orderStatus:
                            status
                    },

                    {
                        new:
                            true
                    }

                );


            if (!order) {

                return res.status(404).json({

                    message:
                        "Order not found"

                });

            }


            return res.json({

                success:
                    true,

                order:
                    order

            });


        } catch (error) {

            console.error(
                "UPDATE ORDER ERROR:",
                error
            );


            return res.status(500).json({

                message:
                    "Could not update order"

            });

        }

    }
);


module.exports = router;