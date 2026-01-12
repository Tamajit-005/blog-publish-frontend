require('dotenv').config({ path: '.env.local' });
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in .env.local");
  console.log("Make sure .env.local exists and contains MONGODB_URI");
  process.exit(1);
}

async function promoteUser(email, role) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const User = mongoose.model(
      "User",
      new mongoose.Schema({
        auth0Id: String,
        username: String,
        email: String,
        role: String,
      })
    );

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      console.log("💡 Make sure the user has registered first!");
      process.exit(1);
    }

    console.log(`Found user: ${user.username} (${user.email})`);
    console.log(`Current role: ${user.role}`);

    const validRoles = ["user", "admin", "superadmin"];
    if (!validRoles.includes(role)) {
      console.error(`❌ Invalid role: ${role}`);
      console.log(`Valid roles: ${validRoles.join(", ")}`);
      process.exit(1);
    }

    user.role = role;
    await user.save();

    console.log(`✅ ${user.username} (${user.email}) promoted to ${role.toUpperCase()}`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

const email = process.argv[2];
const role = process.argv[3] || "admin";

if (!email) {
  console.error("❌ Usage: npm run promote-user <email> [role]");
  console.log("Example: npm run promote-user user@example.com admin");
  console.log("Valid roles: user, admin, superadmin");
  process.exit(1);
}

promoteUser(email, role);
