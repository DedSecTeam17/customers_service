const mongoose = require('mongoose');
const timestamp = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');

var profileSchema = new mongoose.Schema({
    job: {type: String},
    profile_image_path: {type: String},
    about: {type: String},
    phone_number: {type: String}
});






var userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    password_reset_token:{type: String},
    email: {type: String, required: true, email: true,unique: true,},
    password: {type: String, required: true},
    profile:profileSchema,
});




userSchema.plugin(uniqueValidator);


userSchema.plugin(timestamp);


var userModule = mongoose.model("User", userSchema);
// expert the model

module.exports = userModule;