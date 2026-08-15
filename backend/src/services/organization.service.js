const User = require("../models/0001_user.model");
const Organization = require("../models/0002_organizer.model");
const {hashPassword} = require("../utils/password.js");
const mongoose = require("mongoose");


const registerMember = async(
    name,
    email,
    password,
    role,
    companyName
) => {
    const existingUser = await User.findOne({email});
    
    if(existingUser){
        throw new Error("Email already Exists");
    }

    const hashedPassword = await hashPassword(password);

    const session = await mongoose.startSession();

    try{
        await session.startTransaction();
        const [user] = await User.create([{
            name,
            email,
            password:hashedPassword,
            role:role,
        }],{session})
    
        const organization = await Organization.findOne({name:companyName});
    
        if(!organization){
            throw new Error("Organization doesn't exists"); 
        }
    
        const updatedOrganization = await Organization.findOneAndUpdate(
            {name:companyName},
            {
                $push:{
                    members:{
                        userId:user._id,
                        role:role
                    }
                }
            },
            {
                new:true,
                session
            }
        );
        await session.commitTransaction();
    
        console.log("Member added successfully");
    
        return {user,updatedOrganization};
    }catch(err){
        await session.abortTransaction();
        throw err;
    }finally{
        await session.endSession();
    }


}

module.exports = registerMember;