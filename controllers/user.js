const errors = require('restify-errors');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const restify_jwt = require('restify-jwt-community');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const {authentication} = require('../auth');
const path = require('path');
const multer = require('multer');

var hbs = require('nodemailer-express-handlebars');
var nodemailer = require('nodemailer');
var randtoken = require('rand-token');


const storage = multer.diskStorage(
    {
        destination: './public/uploads/profiles_images',
        filename: function (req, file, cb) {
            const file_name = "app_books_provider" + '_' + Date.now() + path.extname(file.originalname);
            console.log("shit")
            cb(null, file_name);
        }
    }
);
//
const upload = multer({
    storage: storage,
    limits: {fileSize: (1024 * 1024) * 200},
    fileFilter: function (req, file, cp) {
        checkForType(cp, file);
    }
}).single('profile_image');


function checkForType(cp, file) {
    console.log("CHECK ")
    const type = /jpeg|png|jpg|gif|/;
    const extname = type.test(path.extname(file.originalname).toLowerCase());
    const mimeType = type.test(file.mimetype);

    if (extname && mimeType) {
        cp(null, true);
    } else {
        cp('Error invalid image', false);
    }
}


module.exports.signIn = async function (req, res, next) {

    const {email, password} = req.body;
    try {

        const user = await authentication(email, password);

        // signing process using user object and client secret

        const user_token = jwt.sign(user.toJSON(), process.env.JWT_SECRET, {expiresIn: '1500m'});
        const {iat, exp} = jwt.decode(user_token);

        sendJsonResponse(res, {iat, exp, user_token}, 200);


    } catch (e) {
        sendJsonResponse(res, e, 404);

    }

};
module.exports.signUp = async (req, res, next) => {
    const {email, password, name, about} = req.body;
    const newUser = new User({
        email,
        password,
        name,
        profile: {
            about: '',
            phone_number: '',
            job: ''
        }
    });
    //password length 10
    bcrypt.genSalt(10, (err, salt) => {
        //hash password
        bcrypt.hash(newUser.password, salt, async (err, hashedPassword) => {
            // replace old password with hashed password
            newUser.password = hashedPassword;
            try {
                // save user with hashed password
                var savedUser = await newUser.save();
                sendJsonResponse(res, savedUser, 201);

            } catch (e) {
                return sendJsonResponse(res, e.message, 404);

            }
        });
    });
}
module.exports.getUser = async (req, res, next) => {
    if (req.headers && req.headers.authorization) {
        const authorization_header = req.headers.authorization;
        const size = authorization_header.length;

        // substring JWT string from header  with space to get clean token
        const user_token = authorization_header.substr(4, size);


        try {

            // decode user model using jwt verify using client secret and and clean token
            const decoded_user = jwt.verify(user_token, process.env.JWT_SECRET);

            // find user using id from decoded user
            const user = await User.findById(decoded_user._id);
            sendJsonResponse(res, user, 200);


        } catch (e) {
            sendJsonResponse(res, e, 404);

        }
    } else {
        sendJsonResponse(res, {'message': 'Authorization header required'}, 200);
    }
};
module.exports.createProfile = async (req, res, next) => {
    try {
        const {about, phone_number, job} = req.body;
        const user = await User.findById({_id: req.params.user_id})

        if (typeof user.profile != 'undefined') {
            user.profile.about = about;
            user.profile.phone_number = phone_number;
            user.profile.job = job;

        } else {
            user.profile = {
                about: about,
                phone_number: phone_number,
                job: job
            };
        }

        const savedUser = await user.save();
        sendJsonResponse(res, savedUser, 200);

    } catch (e) {
        sendJsonResponse(res, e, 404);
    }
};


module.exports.uploadProfileImage = async (req, res, next) => {


    if (req.headers && req.headers.authorization) {
        const authorization_header = req.headers.authorization;
        const size = authorization_header.length;

        // substring JWT string from header  with space to get clean token
        const user_token = authorization_header.substr(4, size);
        const decoded_user = jwt.verify(user_token, process.env.JWT_SECRET);


        upload(req, res, async (err) => {
            if (err) {
                sendJsonResponse(res, {"message": err}, 200);
            } else {
                const user = await User.findById(decoded_user._id);
                if (typeof user.profile != 'undefined') {

                    user.profile.profile_image_path = "https://young-tor-63067.herokuapp.com/api/users/profile_image/" + req.file.filename.toString()
                } else {
                    user.profile = {
                        about: '',
                        profile_image_path: "https://young-tor-63067.herokuapp.com/api/users/profile_image/" + req.file.filename.toString(),
                        phone_number: '',
                        job: ''
                    }
                }
                const saved_user = await user.save();
                sendJsonResponse(res, {"image_path": saved_user.profile.profile_image_path}, 200);
            }
        });
    } else {
        sendJsonResponse(res, {'message': 'Authorization header required'}, 200);
    }


};
module.exports.getProfileImage = (req, res) => {
    res.status(200);
    res.sendfile('./public/uploads/profiles_images/' + req.params.image_name);
};


module.exports.updateUser = async (req, res) => {
    if (req.headers && req.headers.authorization) {
        const authorization_header = req.headers.authorization;
        const size = authorization_header.length;

        // substring JWT string from header  with space to get clean token
        const user_token = authorization_header.substr(4, size);


        try {

            // decode user model using jwt verify using client secret and and clean token
            const decoded_user = jwt.verify(user_token, process.env.JWT_SECRET);
            const oldUserDate = await User.findById({_id: decoded_user._id});
            const user = await User.findOneAndUpdate({_id: decoded_user._id}, {
                name: req.body.name === undefined ? oldUserDate.name : req.body.name,
                email: req.body.email === undefined ? oldUserDate.email : req.body.email,
                profile: {
                    profile_image_path: oldUserDate.profile.profile_image_path,
                    job: req.body.job === undefined ? oldUserDate.profile.job : req.body.job,
                    about: req.body.about === undefined ? oldUserDate.profile.about : req.body.about,
                    phone_number: req.body.phone_number === undefined ? oldUserDate.profile.phone_number : req.body.phone_number
                }
            });

            sendJsonResponse(res, user, 200);

        } catch (e) {
            sendJsonResponse(res, e, 404);

        }
    } else {
        sendJsonResponse(res, {'message': 'Authorization header required'}, 200);
    }
}
module.exports.passwordReset = async (req, res) => {
    const user_email = req.body.email;


    try {
        const user = await User.findOne({email: user_email});
        if (typeof user.email != "undefined") {
            var token = randtoken.generate(16);

            const updated_user = await User.findOneAndUpdate({email: user_email}, {
                password_reset_token: token
            });
            sendEmail(user_email, `http://localhost:8080/#/password_change?token=${token}`);
            sendJsonResponse(res, {"message": "check your email to reset your password"}, 200);
        } else {
            sendJsonResponse(res, {"message": 'User with this email not found'}, 200);
        }
    } catch (e) {
        sendJsonResponse(res, {"message": e}, 404);
    }

}

function sendEmail(email, link) {
    var transport = nodemailer.createTransport({
        service: 'gmail',

        auth: {
            user: "melamin23.me@gmail.com",
            pass: "mohamed1337"
        }
    });
    let mailOptions = {
        from: "melamin23.me@gmail.com", // sender address
        to: email, // list of receivers
        subject: 'Node Contact Request', // Subject line
        text: 'Hello world?', // plain text body
        html: `
    <p>You have a new contact request</p>
    <h3>Contact Details</h3>
    <ul>  
      <li>Message: please reset your password using this link <a href="${link}" >mail</a></li>
    </ul>
    <a  href="${link}" style="border-radius: 10px; padding: 1%; color: white; background-color: cornflowerblue; ">Change My Password</a>
  ` // html body
    };
    transport.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

    });
}

module.exports.passwordChange = async (req, res) => {

    var user = await User.findOne({password_reset_token: req.params.token})


    if (user) {
        var newPassword = req.body.new_password;
        bcrypt.genSalt(10, (err, salt) => {
            //hash password
            bcrypt.hash(newPassword, salt, async (err, hashedPassword) => {
                // replace old password with hashed password
                newPassword = hashedPassword;
                try {
                    // save user with hashed password
                    var updatedUser = await User.findOneAndUpdate({password_reset_token: req.params.token}, {
                        password: newPassword,
                        password_reset_token: null
                    });
                    sendJsonResponse(res, {"message": "password updated successfully"}, 201);

                } catch (e) {
                    return sendJsonResponse(res, {"message": "Send your email again"}, 400);

                }
            });
        });
    } else {
        return sendJsonResponse(res, {"message": "Send your email again"}, 201);
    }


}
module.exports.passwordUpdate = async (req, res) => {
    if (req.headers && req.headers.authorization) {
        const authorization_header = req.headers.authorization;
        const size = authorization_header.length;

        // substring JWT string from header  with space to get clean token
        const user_token = authorization_header.substr(4, size);
        var newPassword = req.body.new_password;
        var oldPassword = req.body.old_password;
        const decoded_user = jwt.verify(user_token, process.env.JWT_SECRET);

        const user = await User.findById({_id: decoded_user._id});


        bcrypt.compare(oldPassword, user.password, (err, isMatch) => {
            if (err) {
                // throw err;
                return sendJsonResponse(res, {"message": err}, 404);

            }
            if (isMatch) {
                bcrypt.genSalt(10, (err, salt) => {
                    //hash password
                    bcrypt.hash(newPassword, salt, async (err, hashedPassword) => {
                        // replace old password with hashed password
                        newPassword = hashedPassword;
                        try {
                            // save user with hashed password
                            var updatedUser = await User.findOneAndUpdate({_id: decoded_user._id}, {
                                password: newPassword,
                            });
                            sendJsonResponse(res, {"message": "Updated Successfully", "status": 200}, 200);

                        } catch (e) {
                            return sendJsonResponse(res, {"message": "Fail to change password", "status": 400}, 200);

                        }
                    });
                });
                //   save new password
            } else {
                //   your old password wrong
                return sendJsonResponse(res, {"message": "Password is wrong", "status": 400}, 200);

            }
        });


        // decode user model using jwt verify using client secret and and clean token

    } else {
        sendJsonResponse(res, {'message': 'Authorization header required'}, 200);
    }

}

function sendJsonResponse(res, data, status) {
    res.status(status);
    res.send(data);
}

async function deleteFile(path) {
    try {
        await fs.remove(path)
        console.log('success!')
    } catch (err) {
        console.error(err)
    }
}