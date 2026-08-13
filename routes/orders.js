const express = require("express");
const crypto = require("crypto");

const Order = require("../models/Order");
const Product = require("../models/Product");

const auth = require("../middleware/auth");

const {
    sendSellerOrderEmail,
    sendCustomerOrderConfirmation
} = require("../utils/mailer");

const router = express.Router();


/*
CREATE ORDER
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


        if (
            !name ||
            !phone ||
            !address ||
            !city ||
            !state ||
            !pinCode ||
            !items ||
            items.length === 0
        ) {

            return res.status(400).json({
                message: "Please provide all required checkout details"
            });
        }


        /*
        Get actual products from MongoDB
        instead of trusting prices sent by browser.
        */

        const orderItems = [];

        for (const item of items) {

            const product = await Product.findById(
                item.productId
            );

            if (!product) {

                return res.status(400).json({
                    message: `Product not found: ${item.productId}`
                });
            }


            if (product.stock < item.quantity) {

                return res.status(400).json({
                    message: `${product.name} is out of stock`
                });
            }


            orderItems.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.image
            });
        }


        const subtotal = orderItems.reduce(
            (sum, item) =>
                sum + item.price * item.quantity,
            0
        );


        const shipping = subtotal >= 999 ? 0 : 50;

        const total = subtotal + shipping;


        const orderNumber =
            "LUX-" +
            Date.now().toString().slice(-8) +
            "-" +
            crypto.randomBytes(2).toString("hex").toUpperCase();


        const order = await Order.create({

            orderNumber,

            userId: null,

            customer: {
                name,
                phone,
                email: email || "",
                address,
                city,
                state,
                pinCode
            },

            items: orderItems,

            subtotal,

            shipping,

            total,

            paymentMethod: "Order by Email / Cash on Delivery",

            paymentStatus: "pending",

            orderStatus: "pending"

        });


        /*
        Reduce stock
        */

        for (const item of orderItems) {

            await Product.findByIdAndUpdate(
                item.productId,
                {
                    $inc: {
                        stock: -item.quantity
                    }
                }
            );
        }


        /*
        Send order to seller
        */

        try {

            await sendSellerOrderEmail(order);

            order.sellerEmailSent = true;

            await order.save();

        } catch (emailError) {

            console.error(
                "Seller email failed:",
                emailError.message
            );
        }


        /*
        Send confirmation to customer
        */

        if (email) {

            try {

                await sendCustomerOrderConfirmation(
                    order
                );

                order.customerEmailSent = true;

                await order.save();

            } catch (emailError) {

                console.error(
                    "Customer email failed:",
                    emailError.message
                );
            }
        }


        res.status(201).json({

            success: true,

            message:
                "Order placed successfully",

            orderNumber,

            total

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Could not place order"
        });
    }
});


/*
GET CUSTOMER ORDERS
*/
router.get("/my-orders", auth, async (req, res) => {

    try {

        const orders = await Order.find({
            userId: req.user.id
        }).sort({
            createdAt: -1
        });

        res.json({
            success: true,
            orders
        });

    } catch (error) {

        res.status(500).json({
            message: "Could not load orders"
        });
    }
});


/*
GET ALL ORDERS
For your future admin dashboard.
*/
router.get("/admin/all", async (req, res) => {

    try {

        const orders = await Order.find()
            .populate("userId", "name email phone")
            .sort({
                createdAt: -1
            });

        res.json({
            success: true,
            orders
        });

    } catch (error) {

        res.status(500).json({
            message: "Could not load orders"
        });
    }
});


/*
UPDATE ORDER STATUS
*/
router.patch("/:id/status", async (req, res) => {

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

        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                message: "Invalid order status"
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                orderStatus: status
            },
            {
                new: true
            }
        );

        if (!order) {

            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            order
        });

    } catch (error) {

        res.status(500).json({
            message: "Could not update order"
        });
    }
});


module.exports = router;