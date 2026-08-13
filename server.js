require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");


const app = express();


/*
DATABASE
*/

connectDB();


/*
MIDDLEWARE
*/

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(cookieParser());


/*
API ROUTES
*/

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/products",
    productRoutes
);

app.use(
    "/api/orders",
    orderRoutes
);
app.use(
    "/api/admin",
    adminRoutes
);


/*
FRONTEND
*/

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/*
HOME PAGE
*/

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});


/*
404
*/

app.use((req, res) => {

    if (req.path.startsWith("/api/")) {

        return res.status(404).json({
            message: "API endpoint not found"
        });
    }

    res.status(404).send("Page not found");
});


/*
ERROR HANDLER
*/

app.use((error, req, res, next) => {

    console.error(error);

    res.status(500).json({
        message: "Internal server error"
    });
});


const PORT =
    process.env.PORT || 5000;


app.listen(
    PORT,
    () => {

        console.log(
            `LUXORA running at http://localhost:${PORT}`
        );

    }
);