const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const loginService = require('../services/login');

app.post('/', async (req, res, next) => {
    // if (req.session.token === undefined) next(); //Redirect to homepage -> Quando saranno implementati i cookie
    const { email, password } = req.body;
    const result = await loginService.login(email, password);
    if (result) return res.sendStatus(200); //Set a good cookie
    return res.sendStatus(401);
});

app.post('/registration', async (req, res) => {
    const { email, firstName, lastName, password } = req.body;
    if (email || firstName || lastName || password) res.status(418);
    const result = await loginService.registration(email, firstName, lastName, password);
    if (result === -1) return res.status(412).send({message: "Registration failed. Please check your data and try again"});
    if (result === -2) return res.status(412).send({message: "This email is already registered"})
    res.send({msg: result}).status(200);
});

module.exports = app;