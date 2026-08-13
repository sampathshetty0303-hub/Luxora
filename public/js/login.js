const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document
        .getElementById("email")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;

    if (!email || !password) {
        loginMessage.textContent =
            "Please enter your email and password.";

        return;
    }

    loginMessage.textContent = "Logging in...";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Login failed"
            );
        }

        loginMessage.textContent =
            "Login successful!";

        localStorage.setItem(
            "luxoraUser",
            JSON.stringify(data.user)
        );

        setTimeout(() => {
            window.location.href = "/";
        }, 700);

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        loginMessage.textContent =
            error.message ||
            "Unable to connect to server.";
    }
});