const User = require("../models/0001_user.model.js");
const Organization = require("../models/0002_organizer.model.js");
const {hashPassword} = require("../utils/password.js");
const errorHandler = require("../middleware/errorHandler.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");

const registerOwner = async (
    name,
    email,
    password,
    role,
    companyName,
    branding,
    payoutDetails
) => {
    const existingUser = await User.findOne({email});
    if(existingUser){
        throw new Error("Email already Exists");
    }

    const hashedPassword = await hashPassword(password);
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        const user = await User.create(
            [{
                name,
                email,
                password:hashedPassword,
                role:role
            }],
            {session}
        );

        const company = await Organization.findOne({name:companyName});
        if(company){
            throw new Error("Company already exists cannot create an account as an owner into this organization");
        }
        const organization = await Organization.create(
            [{
                name:companyName,
                members:[
                    {
                        userId:user[0]._id,
                        role:role
                    }
                ],
                branding,
                payoutDetails
            }],
            {session}
        )
        
        await session.commitTransaction();
    
        return {
            user:user[0],
            organization:organization[0]
        }
    }
    catch(err){
        await session.abortTransaction();
        throw err;
    }
    finally{
        await session.endSession();
    }

}

// const registerMember = async(
//     name,
//     email,
//     password,
//     role,
//     companyName
// ) => {
//     const existingUser = await User.findOne({email});
    
//     if(existingUser){
//         throw new Error("Email already Exists");
//     }

//     const hashedPassword = await hashPassword(password);

//     const session = await mongoose.startSession();

//     try{
//         await session.startTransaction();
//         const [user] = await User.create([{
//             name,
//             email,
//             password:hashedPassword,
//             role:role,
//         }],{session})
    
//         const organization = await Organization.findOne({name:companyName});
    
//         if(!organization){
//             throw new Error("Organization doesn't exists"); 
//         }
    
//         const updatedOrganization = await Organization.findOneAndUpdate(
//             {name:companyName},
//             {
//                 $push:{
//                     members:{
//                         userId:user._id,
//                         role:role
//                     }
//                 }
//             },
//             {
//                 new:true,
//                 session
//             }
//         );
//         await session.commitTransaction();
    
//         console.log("Member added successfully");
    
//         return {user,updatedOrganization};
//     }catch(err){
//         await session.abortTransaction();
//         throw err;
//     }finally{
//         await session.endSession();
//     }


// }

const registerCustomer = async (
    name,
    email,
    password,
    role
) => {
    const existingUser = await User.findOne({email});

    if(existingUser){
        throw new Error("Email already Exists");
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
        name,
        email,
        password:hashedPassword,
        role:role
    });

    return user;
};

const loginUser = async(
    email,
    password
) => {
    const user = await User.findOne({
        email
    });
    console.log(user);

    if(!user){
        throw new Error("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(
        password,
        user.password
    )

    if(!isMatch){
        throw new Error("Password not correct");
    }
    return user;
}

module.exports = {
    loginUser,
    registerCustomer,
    registerOwner,
}