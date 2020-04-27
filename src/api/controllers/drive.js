const express = require("express");
const router = express.Router({ mergeParams: true });

const document = require('./document');

const driveService = require('../services/drive');

router.get('/tree', async (req, res, next) => {
    const { idWorkgroup } = req.params;
    if (!idWorkgroup) return res.sendStatus(412);
    const result = await driveService.tree(req.currentUser, idWorkgroup);
    res.status(200).send({result});
});

router.post('/upload', (req, res, next) => res.sendStatus(200));

router.post('/create', async (req, res, next) => {
    const workgroup = req.params.idWorkgroup;
    const { name, creationDate, isFolder, isNote, path, size, folder, task, members } = req.body;
    if (!name || !creationDate || isFolder === undefined || isNote === undefined || !workgroup) 
        return res.status(412).json({error: "Error", message: "Il documento potrebbe avere non inserito correttamente uno dei paramwetri richisti: name, creationDate, isFolder, isNote"});
    if (!isFolder && (!path || !size)) 
        return res.status(412).json({error: "Error", message: "Il documento è un file e non contiene i campi path o size"});
    try { 
        const result = await driveService.create(req.currentUser, name, creationDate, isFolder, isNote, path, size, folder, workgroup, task, members);
        return res.status(201).send({id: result});
    } catch (err) {
        res.json({error: err.name, message: err.message});
    }
});

router.post('/document', document);

module.exports = router;
