const form = document.getElementById(
    "checkoutForm"
);

const message = document.getElementById(
    "checkoutMessage"
);


form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const cart = JSON.parse(
            localStorage.getItem("luxoraCart") || "[]"
        );


        if (cart.length === 0) {

            message.textContent =
                "Your cart is empty.";

            return;
        }


        const orderItems = cart.map(item => ({

            productId:
                item.productId ||
                item.id,

            quantity:
                Number(item.quantity) || 1

        }));


        const data = {

            name:
                document.getElementById("name").value.trim(),

            phone:
                document.getElementById("phone").value.trim(),

            email:
                document.getElementById("email").value.trim(),

            address:
                document.getElementById("address").value.trim(),

            city:
                document.getElementById("city").value.trim(),

            state:
                document.getElementById("state").value.trim(),

            pinCode:
                document.getElementById("pinCode").value.trim(),

            items: orderItems

        };


        try {

            message.textContent =
                "Placing your order...";


            const response = await fetch(
                "/api/orders",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(data)
                }
            );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Order failed"
                );
            }


            /*
            Remove cart
            */

            localStorage.removeItem(
                "luxoraCart"
            );


            /*
            Show confirmation
            */

            message.innerHTML = `
                <strong>
                    Order placed successfully!
                </strong>

                <br><br>

                Order Number:
                <strong>
                    ${result.orderNumber}
                </strong>

                <br><br>

                Total:
                ₹${result.total}

                <br><br>

                We have received your order.
            `;


            form.reset();


        } catch (error) {

            console.error(error);

            message.textContent =
                error.message ||
                "Something went wrong.";
        }

    }
);