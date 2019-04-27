const restify = require('restify');
const mongoose = require('mongoose');
const  restify_jwt=require('restify-jwt-community');
require('dotenv').config()
const express = require('express');
const app = express();
const  cors=require('cors');

var  user_route=require('./routes/user');





const bodyParser = require('body-parser');


app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));





const server = restify.createServer();
server.use(restify.plugins.bodyParser());


// protect all routes unless registration and login entry point
// server.use(restify_jwt({secret: process.env.JWT_SECRET}).unless({path:['/auth']}));

// when server listen connect to the data base
app.listen(process.env.PORT || 5000, () => {
    mongoose.set('useFindAndModify',false);
    mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true}).then(()=>{


        console.log("Connected")
    });
});


const db = mongoose.connection;


db.on('error', (error) => {
    console.log(error)
});


db.on('open', () => {


    app.use('/api',user_route);





    console.log(`server start on port ---> ${process.env.PORT}`);
});
