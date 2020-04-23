const express = require('express');
const app = express();


const login = require('./controllers/login');
app.use('/login', login);

module.exports = app;