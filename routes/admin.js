const express = require("express");

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

const { adminAuth } = require("../middleware/auth");

const router = express.Router();


/*
==================================================
ADMIN DASHBOARD
==================================================
*/

router.get("/dashboard", adminAuth, async (req, res) => {

    try {

        const totalProducts =
            await Product.countDocuments();

        const totalCustomers =
            await User.countDocuments({
                role: "customer"
            });

        const totalOrders =
            await Order.countDocuments();

        const revenueResult =
            await Order.aggregate([
                {
                    $match: {
                        orderStatus: {
                            $ne: "cancelled"
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$total"
                        }
                    }
                }
            ]);


        const totalRevenue =
            revenueResult.length > 0
                ? revenueResult[0].total
                : 0;


        const recentOrders =
            await Order.find()
                .sort({
                    createdAt: -1
                })
                .limit(10)
                .lean();


        res.json({

            success: true,

            stats: {

                totalProducts,

                totalCustomers,

                totalOrders,

                totalRevenue

            },

            recentOrders

        });

    } catch (error) {

        console.error(
            "ADMIN DASHBOARD ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Could not load dashboard"
        });

    }

});


/*
==================================================
GET ALL PRODUCTS
==================================================
*/

router.get("/products", adminAuth, async (req, res) => {

    try {

        const products =
            await Product.find()
                .sort({
                    createdAt: -1
                });

        res.json({

            success: true,

            products

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not load products"
        });

    }

});


/*
==================================================
CREATE PRODUCT
==================================================
*/

router.post("/products", adminAuth, async (req, res) => {

    try {

        const {
            name,
            description,
            price,
            image,
            category,
            size,
            stock,
            active
        } = req.body;


        if (!name || price === undefined) {

            return res.status(400).json({
                success: false,
                message: "Product name and price are required"
            });

        }


        const product =
            await Product.create({

                name: name.trim(),

                description:
                    description || "",

                price:
                    Number(price),

                image:
                    image ||
                    "/images/default-perfume.jpg",

                category:
                    category || "Perfume",

                size:
                    size || "50ml",

                stock:
                    Number(stock) || 0,

                active:
                    active !== false

            });


        res.status(201).json({

            success: true,

            message: "Product created successfully",

            product

        });

    } catch (error) {

        console.error(
            "CREATE PRODUCT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Could not create product"
        });

    }

});


/*
==================================================
UPDATE PRODUCT
==================================================
*/

router.put("/products/:id", adminAuth, async (req, res) => {

    try {

        const {
            name,
            description,
            price,
            image,
            category,
            size,
            stock,
            active
        } = req.body;


        const product =
            await Product.findByIdAndUpdate(

                req.params.id,

                {
                    name,
                    description,
                    price:
                        Number(price),

                    image,

                    category,

                    size,

                    stock:
                        Number(stock),

                    active:
                        Boolean(active)
                },

                {
                    new: true,
                    runValidators: true
                }

            );


        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }


        res.json({

            success: true,

            message: "Product updated successfully",

            product

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not update product"
        });

    }

});


/*
==================================================
DELETE PRODUCT
==================================================
*/

router.delete("/products/:id", adminAuth, async (req, res) => {

    try {

        const product =
            await Product.findByIdAndDelete(
                req.params.id
            );


        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }


        res.json({

            success: true,

            message: "Product deleted successfully"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not delete product"
        });

    }

});


/*
==================================================
GET ALL ORDERS
==================================================
*/

router.get("/orders", adminAuth, async (req, res) => {

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


        res.json({

            success: true,

            orders

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not load orders"
        });

    }

});


/*
==================================================
UPDATE ORDER STATUS
==================================================
*/

router.patch(
    "/orders/:id/status",
    adminAuth,
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
                !allowedStatuses.includes(status)
            ) {

                return res.status(400).json({

                    success: false,

                    message: "Invalid order status"

                });

            }


            const order =
                await Order.findByIdAndUpdate(

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

                    success: false,

                    message: "Order not found"

                });

            }


            res.json({

                success: true,

                message:
                    "Order status updated",

                order

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Could not update order"

            });

        }

    }
);


/*
==================================================
GET CUSTOMERS
==================================================
*/

router.get("/customers", adminAuth, async (req, res) => {

    try {

        const customers =
            await User.find({
                role: "customer"
            })
            .select(
                "-password"
            )
            .sort({
                createdAt: -1
            });


        res.json({

            success: true,

            customers

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Could not load customers"

        });

    }

});


module.exports = router;