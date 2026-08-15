const { registerCustomer,loginUser, registerOwner,registerMember } = require("../services/auth.service.js");
const {generateToken} = require("../utils/generateToken.js");

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, companyName, branding, payoutDetails } = req.body;
    if(role === "customer"){
      const user = await registerCustomer(name, email, password, role);
      const token = await generateToken(user._id);
      res.status(201).json({
        success: true,
        message:"Registration successful",
        token:token
      });
    }
    else if(role === "owner"){
      const {user, organization} = await registerOwner(name,email,password,role,companyName,branding,payoutDetails);
      const token = await generateToken(user._id);
      res.status(201).json({
        success:true,
        message:"Registration successful",
        token:token
      }) 
    }
    else{
      throw new Error("Cannot create account through other domains, you can either create account as a customer or as an organization");
    }
  } catch (error) {
    next(error);
  }
};

const login = async (req,res,next) => {
  try{
    const { email, password } = req.body;
    const user = await loginUser(email,password);
    const token = await generateToken(user._id);
    console.log(token);
    res.status(200).json({
      success:true,
      message:"Login successful",
      token:token
    })
  }
  catch(error){  
    next(error);
  }
}


module.exports = {
    register,
    login
};