const express = require('express');
const router = express.Router();



router.post('/:idDocument/setAllMembers', (req, res, next) => res.sendStatus(200));

router.post('/:idDocument/addMembers', (req, res, next) => res.sendStatus(200));

router.post('/:idDocument/deleteMembers', (req, res, next) => res.sendStatus(200));

router.post('/:idDocument/properties', (req, res, next) => res.sendStatus(200));

router.post('/:idDocument/rename', (req, res, next) => res.sendStatus(200));

router.post('/:idDocument/delete', (req, res, next) => res.sendStatus(200));

module.exports = router;