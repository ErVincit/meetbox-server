const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const loginService = require('../services/login');

app.post('/', (req, res, next) => {
    // if (req.session.token === undefined) next(); //Redirect to homepage -> Quando saranno implementati i cookie
    const username = req.body.email;
    const password = req.body.password;
    const result = loginService.login(username, password);
    if (result) res.sendStatus(200); //Set a good cookie
    return res.sendStatus(401);
});


module.exports = app;