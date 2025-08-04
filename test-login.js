const axios = require("axios");

async function testLogin() {
  try {
    const response = await axios.post(
      "http://localhost:5000/api/v1/auth/login",
      {
        email: "admin@vukawifi.online",
        password: "admin1234",
      }
    );

    console.log("Login Response:", JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log("✅ Login successful!");
      console.log("Token:", response.data.data.token);
      console.log("Admin:", response.data.data.admin.email);
    } else {
      console.log("❌ Login failed:", response.data.error);
    }
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

testLogin();
