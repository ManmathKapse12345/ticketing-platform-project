const validateRegister = (data) => {
  const { name, email, password, role, companyName, branding, payoutDetails } =
    data;
  if (!name) {
    throw new Error("Name is required");
  }
  if (!email) {
    throw new Error("Email is required");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be atleast 8 character");
  }
  if (role && !companyName) {
    throw new Error("Company Name is required");
  }
  if (role && !branding) {
    throw new Error("Branding is required");
  }
  if (role && !payoutDetails) {
    throw new Error("Payout Details is required");
  }
};

const validateLogin = (data) => {
  const { email, password } = data;
  if (!email) {
    throw new Error("Email is required");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be atleast 8 character");
  }
};

module.exports = {
  validateRegister,
  validateLogin,
};
