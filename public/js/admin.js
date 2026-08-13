let currentProducts = [];


/*
==================================================
HELPERS
==================================================
*/

function money(value) {

    return "₹" +
        Number(value || 0)
            .toLocaleString("en-IN");

}


function showMessage(
    text,
    type = "success"
) {

    const message =
        document.getElementById("message");

    message.textContent = text;

    message.className =
        "message " + type;


    setTimeout(() => {

        message.className =
            "message";

    }, 4000);

}


/*
==================================================
API
==================================================
*/

async function api(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            {
                credentials: "include",
                ...options,
                headers: {
                    "Content-Type":
                        "application/json",
                    ...(options.headers || {})
                }
            }
        );


    const text =
        await response.text();


    let data = {};

    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    } catch {

        throw new Error(
            "Server returned an invalid response"
        );

    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            "Request failed"
        );

    }


    return data;

}


/*
==================================================
NAVIGATION
==================================================
*/

document
    .querySelectorAll(".nav-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".nav-button"
                    )
                    .forEach(item => {

                        item.classList.remove(
                            "active"
                        );

                    });


                button.classList.add(
                    "active"
                );


                document
                    .querySelectorAll(
                        ".admin-section"
                    )
                    .forEach(section => {

                        section.classList.remove(
                            "active"
                        );

                    });


                const section =
                    document.getElementById(
                        button.dataset.section
                    );


                section.classList.add(
                    "active"
                );


                if (
                    button.dataset.section ===
                    "dashboard"
                ) {

                    loadDashboard();

                }


                if (
                    button.dataset.section ===
                    "products"
                ) {

                    loadProducts();

                }


                if (
                    button.dataset.section ===
                    "orders"
                ) {

                    loadOrders();

                }


                if (
                    button.dataset.section ===
                    "customers"
                ) {

                    loadCustomers();

                }

            }
        );

    });


/*
==================================================
DASHBOARD
==================================================
*/

async function loadDashboard() {

    try {

        const data =
            await api(
                "/api/admin/dashboard"
            );


        document.getElementById(
            "totalProducts"
        ).textContent =
            data.stats.totalProducts;


        document.getElementById(
            "totalCustomers"
        ).textContent =
            data.stats.totalCustomers;


        document.getElementById(
            "totalOrders"
        ).textContent =
            data.stats.totalOrders;


        document.getElementById(
            "totalRevenue"
        ).textContent =
            money(
                data.stats.totalRevenue
            );


        renderRecentOrders(
            data.recentOrders
        );

    } catch (error) {

        showMessage(
            error.message,
            "error"
        );

    }

}


function renderRecentOrders(
    orders
) {

    const container =
        document.getElementById(
            "recentOrders"
        );


    if (!orders.length) {

        container.innerHTML =
            "<p>No orders yet.</p>";

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>ORDER</th>

                    <th>CUSTOMER</th>

                    <th>TOTAL</th>

                    <th>STATUS</th>

                    <th>DATE</th>

                </tr>

            </thead>

            <tbody>

                ${orders.map(order => `

                    <tr>

                        <td>
                            ${order.orderNumber}
                        </td>

                        <td>
                            ${order.customer.name}
                        </td>

                        <td>
                            ${money(order.total)}
                        </td>

                        <td>
                            ${order.orderStatus}
                        </td>

                        <td>
                            ${formatDate(
                                order.createdAt
                            )}
                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}


/*
==================================================
PRODUCTS
==================================================
*/

async function loadProducts() {

    try {

        const data =
            await api(
                "/api/admin/products"
            );


        currentProducts =
            data.products;


        renderProducts(
            currentProducts
        );

    } catch (error) {

        showMessage(
            error.message,
            "error"
        );

    }

}


function renderProducts(
    products
) {

    const container =
        document.getElementById(
            "productsTable"
        );


    if (!products.length) {

        container.innerHTML =
            "<p>No products found.</p>";

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>IMAGE</th>

                    <th>PRODUCT</th>

                    <th>PRICE</th>

                    <th>STOCK</th>

                    <th>STATUS</th>

                    <th>ACTIONS</th>

                </tr>

            </thead>

            <tbody>

                ${products.map(product => `

                    <tr>

                        <td>

                            <img
                                src="${
                                    product.image ||
                                    "/images/default-perfume.jpg"
                                }"
                                class="product-image"
                                onerror="
                                    this.src='/images/default-perfume.jpg'
                                "
                            >

                        </td>

                        <td>
                            ${escapeHtml(
                                product.name
                            )}
                        </td>

                        <td>
                            ${money(product.price)}
                        </td>

                        <td>
                            ${product.stock}
                        </td>

                        <td>
                            ${
                                product.active
                                    ? "Active"
                                    : "Hidden"
                            }
                        </td>

                        <td>

                            <button
                                class="action-button edit-button"
                                onclick="
                                    editProduct('${product._id}')
                                "
                            >
                                Edit
                            </button>

                            <button
                                class="action-button delete-button"
                                onclick="
                                    deleteProduct('${product._id}')
                                "
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}


/*
ADD PRODUCT
*/

document
    .getElementById(
        "addProductButton"
    )
    .addEventListener(
        "click",
        () => {

            resetProductForm();

            document
                .getElementById(
                    "productFormContainer"
                )
                .style.display =
                "block";

        }
    );


/*
CANCEL PRODUCT
*/

document
    .getElementById(
        "cancelProductButton"
    )
    .addEventListener(
        "click",
        resetProductForm
    );


function resetProductForm() {

    document
        .getElementById(
            "productForm"
        )
        .reset();


    document
        .getElementById(
            "productId"
        )
        .value = "";


    document
        .getElementById(
            "productCategory"
        )
        .value =
        "Perfume";


    document
        .getElementById(
            "productSize"
        )
        .value =
        "50ml";


    document
        .getElementById(
            "productActive"
        )
        .checked =
        true;


    document
        .getElementById(
            "productFormTitle"
        )
        .textContent =
        "Add Product";


    document
        .getElementById(
            "productFormContainer"
        )
        .style.display =
        "none";

}


/*
SAVE PRODUCT
*/

document
    .getElementById(
        "productForm"
    )
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const id =
                document
                    .getElementById(
                        "productId"
                    )
                    .value;


            const product = {

                name:
                    document
                        .getElementById(
                            "productName"
                        )
                        .value
                        .trim(),

                description:
                    document
                        .getElementById(
                            "productDescription"
                        )
                        .value
                        .trim(),

                price:
                    Number(
                        document
                            .getElementById(
                                "productPrice"
                            )
                            .value
                    ),

                image:
                    document
                        .getElementById(
                            "productImage"
                        )
                        .value
                        .trim(),

                category:
                    document
                        .getElementById(
                            "productCategory"
                        )
                        .value
                        .trim(),

                size:
                    document
                        .getElementById(
                            "productSize"
                        )
                        .value
                        .trim(),

                stock:
                    Number(
                        document
                            .getElementById(
                                "productStock"
                            )
                            .value
                    ),

                active:
                    document
                        .getElementById(
                            "productActive"
                        )
                        .checked

            };


            try {

                if (id) {

                    await api(
                        `/api/admin/products/${id}`,
                        {
                            method: "PUT",

                            body:
                                JSON.stringify(
                                    product
                                )
                        }
                    );


                    showMessage(
                        "Product updated successfully."
                    );

                } else {

                    await api(
                        "/api/admin/products",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    product
                                )
                        }
                    );


                    showMessage(
                        "Product created successfully."
                    );

                }


                resetProductForm();

                loadProducts();

                loadDashboard();

            } catch (error) {

                showMessage(
                    error.message,
                    "error"
                );

            }

        }
    );


/*
EDIT PRODUCT
*/

function editProduct(id) {

    const product =
        currentProducts.find(
            item => item._id === id
        );


    if (!product) return;


    document
        .getElementById(
            "productId"
        )
        .value =
        product._id;


    document
        .getElementById(
            "productName"
        )
        .value =
        product.name;


    document
        .getElementById(
            "productDescription"
        )
        .value =
        product.description || "";


    document
        .getElementById(
            "productPrice"
        )
        .value =
        product.price;


    document
        .getElementById(
            "productImage"
        )
        .value =
        product.image || "";


    document
        .getElementById(
            "productCategory"
        )
        .value =
        product.category || "Perfume";


    document
        .getElementById(
            "productSize"
        )
        .value =
        product.size || "50ml";


    document
        .getElementById(
            "productStock"
        )
        .value =
        product.stock || 0;


    document
        .getElementById(
            "productActive"
        )
        .checked =
        product.active;


    document
        .getElementById(
            "productFormTitle"
        )
        .textContent =
        "Edit Product";


    document
        .getElementById(
            "productFormContainer"
        )
        .style.display =
        "block";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/*
DELETE PRODUCT
*/

async function deleteProduct(id) {

    if (
        !confirm(
            "Are you sure you want to delete this product?"
        )
    ) {

        return;

    }


    try {

        await api(
            `/api/admin/products/${id}`,
            {
                method: "DELETE"
            }
        );


        showMessage(
            "Product deleted successfully."
        );


        loadProducts();

        loadDashboard();

    } catch (error) {

        showMessage(
            error.message,
            "error"
        );

    }

}


/*
==================================================
ORDERS
==================================================
*/

async function loadOrders() {

    try {

        const data =
            await api(
                "/api/admin/orders"
            );


        renderOrders(
            data.orders
        );

    } catch (error) {

        showMessage(
            error.message,
            "error"
        );

    }

}


function renderOrders(
    orders
) {

    const container =
        document.getElementById(
            "ordersTable"
        );


    if (!orders.length) {

        container.innerHTML =
            "<p>No orders found.</p>";

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>ORDER</th>

                    <th>CUSTOMER</th>

                    <th>ITEMS</th>

                    <th>TOTAL</th>

                    <th>PAYMENT</th>

                    <th>STATUS</th>

                    <th>DATE</th>

                </tr>

            </thead>

            <tbody>

                ${orders.map(order => `

                    <tr>

                        <td>
                            <strong>
                                ${order.orderNumber}
                            </strong>
                        </td>

                        <td>

                            ${escapeHtml(
                                order.customer.name
                            )}

                            <br>

                            <small>
                                ${escapeHtml(
                                    order.customer.phone
                                )}
                            </small>

                        </td>

                        <td>
                            ${order.items.length}
                        </td>

                        <td>
                            ${money(order.total)}
                        </td>

                        <td>
                            ${escapeHtml(
                                order.paymentMethod
                            )}
                        </td>

                        <td>

                            <select
                                class="status-select"
                                onchange="
                                    updateOrderStatus(
                                        '${order._id}',
                                        this.value
                                    )
                                "
                            >

                                ${statusOptions(
                                    order.orderStatus
                                )}

                            </select>

                        </td>

                        <td>
                            ${formatDate(
                                order.createdAt
                            )}
                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}


function statusOptions(
    current
) {

    const statuses = [

        "pending",

        "confirmed",

        "processing",

        "shipped",

        "delivered",

        "cancelled"

    ];


    return statuses.map(
        status => `

            <option
                value="${status}"
                ${status === current
                    ? "selected"
                    : ""}
            >
                ${status}
            </option>

        `
    ).join("");

}


async function updateOrderStatus(
    id,
    status
) {

    try {

        await api(
            `/api/admin/orders/${id}/status`,
            {
                method: "PATCH",

                body:
                    JSON.stringify({
                        status
                    })
            }
        );


        showMessage(
            "Order status updated."
        );


        loadOrders();

        loadDashboard();

    } catch (error) {

        showMessage(
            error.message,
            "error"
        );

    }

}


/*
==================================================
CUSTOMERS
==================================================
*/

async function loadCustomers() {

    try {

        const data =
            await api(
                "/api/admin/customers"
            );


        renderCustomers(
            data.customers
        );

    } catch (error) {

        showMessage(
            error.message,
            "error"
        );

    }

}


function renderCustomers(
    customers
) {

    const container =
        document.getElementById(
            "customersTable"
        );


    if (!customers.length) {

        container.innerHTML =
            "<p>No customers found.</p>";

        return;

    }


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>NAME</th>

                    <th>EMAIL</th>

                    <th>PHONE</th>

                    <th>VERIFIED</th>

                    <th>JOINED</th>

                </tr>

            </thead>

            <tbody>

                ${customers.map(customer => `

                    <tr>

                        <td>
                            ${escapeHtml(
                                customer.name
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                customer.email
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                customer.phone || "-"
                            )}
                        </td>

                        <td>
                            ${
                                customer.isVerified
                                    ? "Yes"
                                    : "No"
                            }
                        </td>

                        <td>
                            ${formatDate(
                                customer.createdAt
                            )}
                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}


/*
==================================================
LOGOUT
==================================================
*/

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        async () => {

            try {

                await api(
                    "/api/auth/logout",
                    {
                        method: "POST"
                    }
                );

            } catch (error) {

                console.error(error);

            }


            window.location.href =
                "/login.html";

        }
    );


/*
==================================================
UTILITIES
==================================================
*/

function formatDate(
    date
) {

    if (!date) return "-";

    return new Date(date)
        .toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/*
==================================================
INITIAL LOAD
==================================================
*/

loadDashboard();