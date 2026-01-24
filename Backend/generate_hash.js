import pkg from 'bcryptjs';
// Destructure the hash function from the imported package
const { hash } = pkg; 

// The password you are sending in Postman
const plainPassword = 'Admin123'; 

// 10 is the salt rounds you use in your register function
// Now using the corrected 'hash' function
hash(plainPassword, 10).then(hashValue => { 
    console.log("==================================================");
    console.log("COPY THIS HASH AND USE IT TO UPDATE YOUR DATABASE:");
    console.log(hashValue); // This is your new, valid hash
    console.log("==================================================");
}).catch(err => {
    console.error("Error generating hash:", err);
});