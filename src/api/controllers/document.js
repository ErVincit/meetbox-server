const express = require("express");
const router = express.Router({ mergeParams: true });

const documentService = require("../services/document");

router.get("/:idDocument", async (req, res, next) => {
  const { idDocument, idWorkgroup } = req.params;
  const document = await documentService.get(
    req.currentUser,
    idDocument,
    idWorkgroup
  );
  res.status(200).send({ data: document });
});

const request = require("request");
const url = "http://meetbox.altervista.org/uploads/";

router.get("/:idDocument/download", async (req, res) => {
  const { idDocument, idWorkgroup } = req.params;
  const document = await documentService.get(
    req.currentUser,
    idDocument,
    idWorkgroup
  );
  if (document.path === "")
    res.send({ error: "Errore", message: "Path non presente" });
  else {
    res.attachment(document.name);
    request.post(url + document.path).pipe(res);
  }
});

router.put("/:idDocument/edit", async (req, res, next) => {
  const { idDocument, idWorkgroup } = req.params;
  const { members, name, folder } = req.body;
  const currentUser = req.currentUser;
  try {
    if (members || name | folder)
      await documentService.edit(
        currentUser,
        idDocument,
        idWorkgroup,
        members,
        name,
        folder
      );
    const data = await documentService.get(
      currentUser,
      idDocument,
      idWorkgroup
    );
    return res.send({ data });
  } catch (err) {
    return res.send({ error: err.name, message: err.message }).status(500);
  }
});

router.delete("/:idDocument", async (req, res, next) => {
  const { idDocument, idWorkgroup } = req.params;
  try {
    const data = await documentService.delete(
      req.currentUser,
      idDocument,
      idWorkgroup
    );
    res.send({ data });
  } catch (err) {
    res.send({ error: err.name, message: err.message });
  }
});

module.exports = router;

`NOTE:
    Tutti possono cancellare un file.
    Folder è visibile se e solo se c'è un documento a noi visibile all'interno della cartella
    Il creatore può vedere sempre il Folder anche se vuoto
`;
