const express = require("express");
const router = express.Router({ mergeParams: true });

const document = require("./document");

const driveService = require("../services/drive");

router.get("/tree", async (req, res, next) => {
  const { idWorkgroup } = req.params;
  if (!idWorkgroup) return res.sendStatus(412);
  const result = await driveService.tree(req.currentUser, idWorkgroup);
  res.status(200).send({ result });
});

const request = require("request");
const url = "http://meetbox.altervista.org/upload.php";

router.post("/upload", (req, res) => {
  req.pipe(request(url)).pipe(res);
});

router.post("/create", async (req, res, next) => {
  const workgroup = req.params.idWorkgroup;
  const {
    name,
    isFolder,
    isNote,
    path,
    size,
    folder,
    task,
    members,
  } = req.body;
  if (!name || isFolder === undefined || isNote === undefined || !workgroup)
    return res.status(412).json({
      error: "Error",
      message:
        "Il documento potrebbe avere non inserito correttamente uno dei parametri richiesti: name, isFolder, isNote",
    });
  if (!isFolder && (!path || !size))
    return res.status(412).json({
      error: "Error",
      message: "Il documento è un file e non contiene i campi path o size",
    });
  try {
    const result = await driveService.create(
      req.currentUser,
      name,
      new Date(),
      isFolder,
      isNote,
      path,
      size,
      folder,
      workgroup,
      task,
      isFolder ? [] : members
    );
    return res.json({ data: result });
  } catch (err) {
    res.json({ error: err.name, message: err.message });
  }
});

router.use("/document", document);

module.exports = router;
