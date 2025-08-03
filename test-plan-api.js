const axios = require("axios");

const API_BASE_URL = "http://localhost:5000/api/v1";

async function testPlanAPI() {
  try {
    console.log("🧪 Testing Plan API endpoints...\n");

    // Test 1: Get all plans
    console.log("1. Testing GET /plans");
    const plansResponse = await axios.get(`${API_BASE_URL}/plans`);
    console.log("✅ Success:", plansResponse.data.success);
    console.log("📊 Plans count:", plansResponse.data.data.length);
    console.log("");

    if (plansResponse.data.data.length > 0) {
      const firstPlan = plansResponse.data.data[0];
      console.log("📋 First plan:", {
        id: firstPlan.id,
        name: firstPlan.name,
        basePrice: firstPlan.basePrice,
        isActive: firstPlan.isActive,
      });
      console.log("");

      // Test 2: Get specific plan
      console.log("2. Testing GET /plans/:id");
      const planResponse = await axios.get(
        `${API_BASE_URL}/plans/${firstPlan.id}`
      );
      console.log("✅ Success:", planResponse.data.success);
      console.log("📋 Plan name:", planResponse.data.data.name);
      console.log("");

      // Test 3: Calculate price
      console.log("3. Testing POST /plans/:id/calculate-price");
      const priceResponse = await axios.post(
        `${API_BASE_URL}/plans/${firstPlan.id}/calculate-price`,
        {
          deviceCount: 3,
        }
      );
      console.log("✅ Success:", priceResponse.data.success);
      console.log(
        "💰 Calculated price:",
        priceResponse.data.data.calculatedPrice
      );
      console.log("");

      // Test 4: Update plan (this will fail without auth, but we can test the endpoint)
      console.log("4. Testing PUT /plans/:id (without auth - should fail)");
      try {
        await axios.put(`${API_BASE_URL}/plans/${firstPlan.id}`, {
          name: "Updated Test Plan",
        });
      } catch (error) {
        console.log("✅ Expected failure (no auth):", error.response?.status);
      }
      console.log("");

      // Test 5: Toggle plan status (this will fail without auth)
      console.log(
        "5. Testing PATCH /plans/:id/toggle (without auth - should fail)"
      );
      try {
        await axios.patch(`${API_BASE_URL}/plans/${firstPlan.id}/toggle`);
      } catch (error) {
        console.log("✅ Expected failure (no auth):", error.response?.status);
      }
      console.log("");
    } else {
      console.log("⚠️  No plans found in database");
    }

    console.log("🎉 API tests completed!");
    console.log("");
    console.log("💡 To test authenticated endpoints:");
    console.log("   1. Login as admin: POST /auth/login");
    console.log("   2. Use the returned token in Authorization header");
    console.log("   3. Test PUT, DELETE, PATCH endpoints");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
}

// Run the test
testPlanAPI();
