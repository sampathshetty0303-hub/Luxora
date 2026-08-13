const form = document.getElementById("checkoutForm");
const message = document.getElementById("checkoutMessage");

const orderSummary = document.getElementById("orderSummary");
const placeOrderButton = document.getElementById("placeOrderButton");


// ===============================
// GET CART
// ===============================

function getCart() {

    try {

        return JSON.parse(
            localStorage.getItem("luxoraCart") || "[]"
        );

    } catch (error) {

        console.error("Cart JSON error:", error);

        return [];

    }
}


// ===============================
// FORMAT MONEY
// ===============================

function money(amount) {

    return "₹" + Number(amount || 0).toLocaleString("en-IN");

}


// ===============================
// LOAD PRODUCTS FROM API
// ===============================

async function loadProducts() {

    try {

        const response = await fetch(
            "/api/products"
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.message || "Could not load products"
            );

        }

        /*
        Your products API may return:

        [
            {...},
            {...}
        ]

        OR:

        {
            products: [...]
        }
        */

        if (Array.isArray(data)) {

            return data;

        }

        if (Array.isArray(data.products)) {

            return data.products;

        }

        return [];

    } catch (error) {

        console.error(
            "Product loading error:",
            error
        );

        return [];

    }

}


// ===============================
// DISPLAY ORDER SUMMARY
// ===============================

async function displayOrderSummary() {

    const cart = getCart();

    if (!orderSummary) {
        return;
    }


    if (cart.length === 0) {

        orderSummary.innerHTML = `

            <div class="summary-title">
                Your Order
            </div>

            <p>
                Your bag is empty.
            </p>

        `;

        if (placeOrderButton) {

            placeOrderButton.disabled = true;

        }

        return;

    }


    const products = await loadProducts();


    let total = 0;

    let html = `

        <div class="summary-title">
            Your Order
        </div>

    `;


    for (const item of cart) {

        /*
        Support both:

        item.productId
        item.id
        item._id
        */

        const productId =
            item.productId ||
            item.id ||
            item._id;


        const quantity =
            Number(item.quantity) || 1;


        /*
        Find matching MongoDB product
        */

        const product =
            products.find(
                product =>
                    String(product._id) ===
                    String(productId) ||

                    String(product.id) ===
                    String(productId)
            );


        if (!product) {

            console.warn(
                "Product not found in cart:",
                productId
            );

            html += `

                <div class="summary-item">

                    <span>
                        Product unavailable
                        × ${quantity}
                    </span>

                    <span>
                        —
                    </span>

                </div>

            `;

            continue;

        }


        const price =
            Number(product.price) || 0;


        const itemTotal =
            price * quantity;


        total += itemTotal;


        html += `

            <div class="summary-item">

                <span>
                    ${product.name}
                    × ${quantity}
                </span>

                <span>
                    ${money(itemTotal)}
                </span>

            </div>

        `;

    }


    const shipping =
        total >= 999 ? 0 : 50;


    const grandTotal =
        total + shipping;


    html += `

        <div class="summary-item">

            <span>
                Subtotal
            </span>

            <span>
                ${money(total)}
            </span>

        </div>


        <div class="summary-item">

            <span>
                Shipping
            </span>

            <span>
                ${
                    shipping === 0
                    ? "FREE"
                    : money(shipping)
                }
            </span>

        </div>


        <div class="summary-total">

            <span>
                Total
            </span>

            <span>
                ${money(grandTotal)}
            </span>

        </div>

    `;


    orderSummary.innerHTML = html;


    if (grandTotal <= 0) {

        showMessage(
            "Could not calculate your order total. Please return to the shop and add the product again.",
            "error"
        );

        if (placeOrderButton) {

            placeOrderButton.disabled = true;

        }

    }

}


// ===============================
// PLACE ORDER
// ===============================

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const cart = getCart();


        if (cart.length === 0) {

            showMessage(
                "Your cart is empty.",
                "error"
            );

            return;

        }


        /*
        Convert cart into backend format.

        IMPORTANT:
        The backend expects:

        {
            productId,
            quantity
        }
        */

        const orderItems = cart.map(item => {

            return {

                productId:
                    item.productId ||
                    item.id ||
                    item._id,

                quantity:
                    Number(item.quantity) || 1

            };

        });


        /*
        Make sure every item has a product ID.
        */

        const invalidItem =
            orderItems.find(
                item => !item.productId
            );


        if (invalidItem) {

            showMessage(
                "One of the products in your cart is invalid. Please return to the shop and add it again.",
                "error"
            );

            return;

        }


        const data = {

            name:
                document
                .getElementById("name")
                .value
                .trim(),

            phone:
                document
                .getElementById("phone")
                .value
                .trim(),

            email:
                document
                .getElementById("email")
                .value
                .trim(),

            address:
                document
                .getElementById("address")
                .value
                .trim(),

            city:
                document
                .getElementById("city")
                .value
                .trim(),

            state:
                document
                .getElementById("state")
                .value
                .trim(),

            pinCode:
                document
                .getElementById("pinCode")
                .value
                .trim(),

            items: orderItems

        };


        try {

            if (placeOrderButton) {

                placeOrderButton.disabled = true;

                placeOrderButton.innerText =
                    "PLACING ORDER...";

            }


            showMessage(
                "Placing your order...",
                "success"
            );


            const response =
                await fetch(
                    "/api/orders",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        credentials: "include",

                        body:
                            JSON.stringify(data)

                    }
                );


            /*
            Safely read response.
            This prevents:

            Unexpected end of JSON input
            */

            const responseText =
                await response.text();


            let result = {};

            try {

                result =
                    responseText
                    ? JSON.parse(responseText)
                    : {};

            } catch (jsonError) {

                console.error(
                    "Invalid server response:",
                    responseText
                );

                throw new Error(
                    "Server returned an invalid response."
                );

            }


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Order failed"
                );

            }


            /*
            IMPORTANT:
            Only clear cart after
            backend confirms success.
            */

            localStorage.removeItem(
                "luxoraCart"
            );


            /*
            Show success
            */

            message.className =
                "success";


            message.innerHTML = `

                <strong>
                    Order placed successfully!
                </strong>

                <br><br>

                Order Number:

                <strong>
                    ${result.orderNumber || "Confirmed"}
                </strong>

                <br><br>

                Total:

                <strong>
                    ${money(result.total)}
                </strong>

                <br><br>

                We have received your order.

            `;


            /*
            Hide form after successful order.
            */

            form.style.display =
                "none";


        } catch (error) {

            console.error(
                "ORDER ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Something went wrong. Please try again.",
                "error"
            );


            if (placeOrderButton) {

                placeOrderButton.disabled =
                    false;

                placeOrderButton.innerText =
                    "PLACE ORDER";

            }

        }

    }
);


// ===============================
// MESSAGE
// ===============================

function showMessage(
    text,
    type
) {

    if (!message) {
        return;
    }


    message.textContent =
        text;


    message.className =
        type;

}


// ===============================
// START
// ===============================

displayOrderSummary();