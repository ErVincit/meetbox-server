const express = require('express');
const router = express.Router({ mergeParams: true });

const documentService = require('../services/document');

router.get('/:idDocument', async (req, res, next) => {
    const { idDocument, idWorkgroup } = req.params;
    const document = await documentService.get(req.currentUser, idDocument, idWorkgroup);
    res.status(200).send({data: document});
});

router.post('/:idDocument/download', async (req, res, next) => res.sendStatus(200));

router.put('/:idDocument/edit', async (req, res, next) => {
    const { idDocument, idWorkgroup } = req.params;
    const { members, name, folder } = req.body;
    const currentUser = req.currentUser;
    if (!members && !name && !folder ) 
        return res.send({message: await documentService.get(currentUser, idDocument, idWorkgroup)}).status(200);
    try {
        await documentService.edit(currentUser, idDocument, idWorkgroup, members, name, folder);
        return res.send({messsage: await documentService.get(currentUser, idDocument, idWorkgroup)});
    } catch(err) {
        console.log(err);
        return res.send({error: err.name, message: err.message}).status(500);
    }
});

router.delete('/:idDocument', async (req, res, next) => {
    // TODO: Delete file in storage
    const { idDocument, idWorkgroup } = req.params;
    try {
        await documentService.delete(req.currentUser, idDocument, idWorkgroup);
        res.sendStatus(200);
    } catch (err) {
        console.log("ERR2", err.message)
        res.send({error: err.name, message: err.message});
    }
});

module.exports = router;

`NOTE:
    Tutti possono cancellare un file.
    Folder è visibile se e solo se c'è un documento a noi visibile all'interno della cartella
`