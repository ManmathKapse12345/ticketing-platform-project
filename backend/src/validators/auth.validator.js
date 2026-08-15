const validateRegister = (data) => {
    const {name,email,password} = data;
    if(!name){
        throw new Error("Name is required");
    }
    if(!email){
        throw new Error("Email is required");
    }
    if(password.length < 8){
        throw new Error("Password must be atleast 8 character");
    }
}

module.exports = {
    validateRegister
};