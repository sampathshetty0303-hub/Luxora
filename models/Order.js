const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        },

        name: {
            type: String,
            required: true
        },

        price: {
            type: Number,
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        image: {
            type: String,
            default: ""
        }
    },
    {
        _id: false
    }
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        customer: {
            name: {
                type: String,
                required: true
            },

            phone: {
                type: String,
                required: true
            },

            email: {
                type: String,
                default: ""
            },

            address: {
                type: String,
                required: true
            },

            city: {
                type: String,
                required: true
            },

            state: {
                type: String,
                required: true
            },

            pinCode: {
                type: String,
                required: true
            }
        },

        items: {
            type: [orderItemSchema],
            required: true
        },

        subtotal: {
            type: Number,
            required: true
        },

        shipping: {
            type: Number,
            default: 0
        },

        total: {
            type: Number,
            required: true
        },

        paymentMethod: {
            type: String,
            default: "Cash on Delivery"
        },

        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending"
        },

        orderStatus: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
                "cancelled"
            ],
            default: "pending"
        },

        sellerEmailSent: {
            type: Boolean,
            default: false
        },

        customerEmailSent: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Order", orderSchema);