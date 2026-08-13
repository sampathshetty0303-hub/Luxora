const express = require("express");
const Product = require("../models/Product");

const router = express.Router();


/*
GET ALL PRODUCTS
*/
router.get("/", async (req, res) => {

    try {

        const products = await Product.find({
            active: true
        }).sort({
            createdAt: -1
        });

        res.json(products);

    } catch (error) {

        res.status(500).json({
            message: "Could not load products"
        });
    }
});


/*
GET SINGLE PRODUCT
*/
router.get("/:id", async (req, res) => {

    try {

        const product = await Product.findById(
            req.params.id
        );

        if (!product) {

            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(product);

    } catch (error) {

        res.status(500).json({
            message: "Could not load product"
        });
    }
});


/*
ADD PRODUCT
*/
router.post("/", async (req, res) => {

    try {

        const product = await Product.create(req.body);

        res.status(201).json({
            success: true,
            product
        });

    } catch (error) {

        res.status(400).json({
            message: error.message
        });
    }
});


module.exports = router;