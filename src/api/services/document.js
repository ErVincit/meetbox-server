const pool = require("../../database");

const workgroupServices = require("./workgroup");
const driveService = require("./drive");

exports.get = async (currentUser, idDocument, idWorkgroup) => {
  const client = await pool.connect();
  try {
    const sqlOwner = `SELECT * FROM "Document" WHERE id = $1 AND owner = $2 AND workgroup = $3`;
    const resOwner = await client.query(sqlOwner, [
      idDocument,
      currentUser,
      idWorkgroup,
    ]);

    if (resOwner.rowCount !== 0) {
      const document = resOwner.rows[0];
      document.members = await this.getDocumentMembers(idDocument);
      client.release();
      return document;
    }

    const sqlMember = `SELECT d.*
      FROM "Document" d, "UserDocument" ud, "UserWorkGroup" uw
      WHERE d.id = $1 AND ud.userid = $2 AND uw.userid = ud.userid AND d.workgroup = $3`;
    const resMember = await client.query(sqlMember, [
      idDocument,
      currentUser,
      idWorkgroup,
    ]);

    if (resMember.rowCount !== 0) {
      const document = resMember.rows[0];
      document.members = await this.getDocumentMembers(idDocument);
      client.release();
      return document;
    }

    client.release();
    return {};
  } catch (err) {
    client.release();
    throw err;
  }
};

exports.getDocumentMembers = async (idDocument) => {
  const result = await pool.query(
    `SELECT userid FROM "UserDocument" WHERE document = $1`,
    [idDocument]
  );
  const list = [];
  result.rows.forEach((row) => list.push(row.userid));
  return list;
};

exports.setAllMembers = async (
  currentUser,
  documentid,
  members,
  idWorkgroup
) => {
  if (members === undefined) {
    members = [];
    const res = await workgroupServices.getAllMembers(currentUser, idWorkgroup);
    for (var i = 0; i < res.length; i++) members.push(res[i].id);
  } else if (members === null)
    throw new Error("Non è possibile impostare a null il parametro members");

  try {
    if (
      !(await workgroupServices.checkWorkgroupMembers(
        members,
        idWorkgroup,
        currentUser
      ))
    )
      throw new Error("Uno o piu membri non appartengono a questo workgroup");

    for (const member of members)
      await pool.query('INSERT INTO "UserDocument" VALUES($1, $2)', [
        member,
        documentid,
      ]);
    return members;
  } catch (err) {
    throw err;
  }
};

exports.getAllDocumentsMember = async (idWorkgroup) => {
  const documentMember = await pool.query(
    //Verifichiamo che il documento appartenga correttamente al workgroup e che l'utente corrente ne sia membro (doc e workG)
    `SELECT *
        FROM "UserDocument" ud, "UserWorkGroup" uw
        WHERE ud.userid = uw.userid AND uw.workgroup = $1;`,
    [idWorkgroup]
  );
  const membersDocument = {};
  for (let i = 0; i < documentMember.rowCount; i++) {
    let document = documentMember.rows[i].document;
    let user = documentMember.rows[i].userid;
    if (!Object.keys(membersDocument).includes(document.toString()))
      membersDocument[document] = [];
    membersDocument[document].push(user);
  }
  return membersDocument;
};

exports.edit = async (
  currentUser,
  idDocument,
  idWorkgroup,
  members,
  name,
  folder
) => {
  //Se documento esiste e fa parte di quel workgroup -> controlli delegati alle singole funzioni
  try {
    if (members)
      await this.editMembers(currentUser, idDocument, idWorkgroup, members);
    if (name) await this.editName(currentUser, idDocument, idWorkgroup, name);
    if (folder)
      await this.editFolder(currentUser, idDocument, idWorkgroup, folder);
  } catch (err) {
    throw err;
  }
};

const deleteURL = "http://meetbox.altervista.org/delete.php";
const request = require("request");

exports.delete = async (currentUser, idDocument, idWorkgroup) => {
  const deleteElement = async (document, tree) => {
    if (document.isfolder) {
      const figlioletti = tree[document.id];
      if (figlioletti)
        for (var i = 0; i < figlioletti.length; i++)
          await deleteElement(figlioletti[i], tree);
      if (await isFolderEmpty(document.id, idWorkgroup)) {
        // Non dovrebbe servire visto che i membri delle cartelle non ci sono
        await pool.query('DELETE FROM "UserDocument" WHERE document = $1', [
          document.id,
        ]);
        const results = await pool.query(
          'DELETE FROM "Document" WHERE id = $1 RETURNING *',
          [document.id]
        );
        return results.rows[0];
      }
    } else {
      await pool.query('DELETE FROM "UserDocument" WHERE document = $1', [
        document.id,
      ]);
      const results = await pool.query(
        'DELETE FROM "Document" WHERE id = $1 RETURNING *',
        [document.id]
      );
      if (document.path)
        request.post(deleteURL, { form: { path: document.path } });
      return results.rows[0];
    }
  };
  //Se documento esiste
  //Se documento fa parte dello stesso stesso workgroup di cui fai parte
  //Se puoi vedere il documento
  try {
    const exists = await this.get(currentUser, idDocument, idWorkgroup);
    if (Object.keys(exists).length === 0)
      throw new Error("Il documento non esiste");
    if (!this.enabledToWatch(currentUser, idDocument, idWorkgroup))
      throw new Error(
        "Non è possibile eliminare questo documento poichè non ti è accessibile"
      );
    if (exists.isfolder) {
      //Cancellare prima tutti i file sottostanti ricorsivamente
      const files = await driveService.tree(currentUser, idWorkgroup);
      const folder = await deleteElement(exists, files);
      return folder;
    }
    const doc = await deleteElement(exists);
    return doc;
  } catch (err) {
    throw err;
  }
};

isFolderEmpty = async (idFolder, idWorkgroup) => {
  var resultO = {};
  try {
    resultO = await pool.query(
      `SELECT d.id, d.name, d.creationdate, d.isfolder, d.isnote, d.path, d.size, d.owner, d.folder, d.workgroup, d.task
            FROM "Document" d
            WHERE d.workgroup = $1 AND d.folder = $2;`,
      [idWorkgroup, idFolder]
    );
  } catch (err) {
    throw err;
  }
  if (resultO.rowCount > 0) return false;
  else return true;
};

exports.editMembers = async (currentUser, idDocument, idWorkgroup, members) => {
  //Se documento esiste
  //Se documento fa parte dello stesso stesso workgroup di cui fai parte
  //Se puoi vedere il documento
  if (!(await this.enabledToWatch(currentUser, idDocument, idWorkgroup)))
    throw new Error("Accesso al documento negato");
  if (
    !(await workgroupServices.checkWorkgroupMembers(
      members,
      idWorkgroup,
      currentUser
    ))
  )
    throw new Error(
      "Ci sono dei membri forniti che non fanno parte del workgroup"
    );
  // Delete old members
  await pool.query('DELETE FROM "UserDocument" WHERE document = $1', [
    idDocument,
  ]);
  // Add new members
  for (const member of members)
    await pool.query(
      'INSERT INTO "UserDocument" (userid, document) VALUES ($1, $2)',
      [member, idDocument]
    );
};

exports.editName = async (currentUser, idDocument, idWorkgroup, name) => {
  //Se documento esiste
  //Se documento fa parte dello stesso stesso workgroup di cui fai parte
  //Se puoi vedere il documento
  if (!(await this.enabledToWatch(currentUser, idDocument, idWorkgroup)))
    throw new Error("Accesso al documento negato");
  //Verificare che non esistono altri file con lo stesso nome
  const doc = await this.get(currentUser, idDocument, idWorkgroup);
  // if (await this.isNameUsed(name, doc.isfolder, doc.folder))
  //   throw new Error("Esiste gia un documento con lo stesso nome");
  //Allora edit il documento
  await pool.query('UPDATE "Document" SET name = $1 WHERE id = $2', [
    name,
    idDocument,
  ]);
};

exports.editFolder = async (currentUser, idDocument, idWorkgroup, folder) => {
  //Se documento esiste
  //Se documento fa parte dello stesso stesso workgroup di cui fai parte
  //Se puoi vedere il documento
  if (!(await this.enabledToWatch(currentUser, idDocument, idWorkgroup)))
  throw new Error("Accesso al documento negato");
  //Se il documento è una cartella, verificare che la cartella padre non sia proprio questa cartella
  if (idDocument == folder)
  throw new Error("Non puoi spostare la cartella in se stessa");
  //Se la cartella padre è visibile all'utente corrente
  if (folder !== "root" && !(await this.enabledToWatch(currentUser, folder, idWorkgroup)))
    throw new Error(
      "Non puoi spostare il documento in una cartella non accessibile"
    );
  //Verificare che non esistono altri file con lo stesso nome
  const doc = await this.get(currentUser, idDocument, idWorkgroup);
  if (folder === "root") folder = null;
  // if (await this.isNameUsed(doc.name, doc.isfolder, folder))
  //   throw new Error("Esiste gia un documento con lo stesso nome");
  //Allora cambia padre al documento
  await pool.query(`UPDATE "Document" SET folder = $1 WHERE id = $2`, [
    folder,
    idDocument,
  ]);
};

exports.enabledToWatch = async (currentUser, idDocument, idWorkgroup) => {
  const tree = await driveService.tree(currentUser, idWorkgroup);
  for (let key of Object.keys(tree)) 
    for (let doc of tree[key]) 
      if (idDocument == doc.id)
        return true;
  return false;
};

// exports.isNameUsed = async (name, isFolder, idFolder) => {
//   try {
//     var res = {};
//     if (idFolder) {
//       await pool.query(
//         `SELECT * FROM "Document" d WHERE d.name = $1 AND d.isfolder = $2 AND d.folder = $3;`,
//         [name, isFolder, idFolder]
//       );
//     } else {
//       res = await pool.query(
//         `SELECT * FROM "Document" d WHERE d.name = $1 AND d.isfolder = $2 AND d.folder is NULL;`,
//         [name, isFolder]
//       );
//     }
//     if (res.rowCount > 0) return true;
//     return false;
//   } catch (err) {
//     throw new Error("Errore esecuzione query di controllo");
//   }
// };
