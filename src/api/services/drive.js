const pool = require("../../database");

const documentService = require("./document");

const ROOT = "root";

exports.tree = async (currentUser, workgroup) => {
	const sqlOwner = `SELECT d.id, d.name, d.creationdate, d.isfolder, d.isnote, d.path, d.size, d.owner, d.folder, d.workgroup, d.task
    FROM "Document" d
    WHERE d.owner = $1 AND d.workgroup = $2;`;

	const sqlMembers = `SELECT d.id, d.name, d.creationdate, d.isfolder, d.isnote, d.path, d.size, d.owner, d.folder, d.workgroup, d.task
	FROM "Document" d, "UserDocument" ud
    WHERE ud.document = d.id AND ud.userid = $1 AND d.workgroup = $2`;

  const sqlFolder = `SELECT d.id, d.name, d.creationdate, d.isfolder, d.isnote, d.path, d.size, d.owner, d.folder, d.workgroup, d.task
	FROM "Document" d
    WHERE d.isfolder = true AND d.workgroup = $1`;
  
	var resultO = {};
  var resultM = {};
  var resultF = {};
	try {
		resultO = await pool.query(sqlOwner, [currentUser, workgroup]);
		resultM = await pool.query(sqlMembers, [currentUser, workgroup]);
		resultF = await pool.query(sqlFolder, [workgroup]);
	} catch (err) {
		throw new Error(err.name);
  }
  const members = await documentService.getAllDocumentsMember(workgroup);
  const folders = {};
  for (let i = 0; i < resultF.rows.length; i++) {
    if (!resultF.rows[i].folder) resultF.rows[i].folder = "root";
    folders[resultF.rows[i].id] = resultF.rows[i];
  }
  
	var list = [];
	if (resultO.rowCount > 0) {
		if (resultM.rowCount > 0) {
			const totalId = [];
			resultO.rows.forEach((element) => {
				list.push(element);
        element.members = members[element.id];
				totalId.push(element.id);
			});
			resultM.rows.forEach((element) => {
				if (!totalId.includes(element.id)) {
          element.members = members[element.id];
					totalId.push(element.id);
					list.push(element);
				}
			});
		} else {
      for (let i = 0; i < resultO.rowCount; i++)
        if (!resultO.rows[i].isfolder)
          resultO.rows[i]["members"] = members[resultO.rows[i].id];
      list = resultO.rows;
    }
	} else {
    for (let i = 0; i < resultM.rowCount; i++)
      if (!resultM.rows[i].isfolder)
        resultM.rows[i]["members"] = members[resultM.rows[i].id];
    list = resultM.rows;
  }
  
  const listOfDirectory = {};
  listOfDirectory[ROOT] = [];
	if (list.length === 0) listOfDirectory[ROOT] = [];
	for (var i = 0; i < list.length; i++) {
    let document = list[i];
    if (document.folder === null || document.folder === undefined) document.folder = ROOT;
    // Permette visione delle proprie cartelle
		if (document.isfolder && !Object.keys(listOfDirectory).includes("" + document.id)) listOfDirectory[document.id] = []; 
    if (!document.task) {
      // Permette l'aggiunta di cartelle non proprie ma che contengono documenti visibili
      if (!Object.keys(listOfDirectory).includes("" + document.folder)) {
        listOfDirectory[document.folder] = [];
        var tempDirectory = folders[document.folder];
        if (tempDirectory.folder !== ROOT) {
          while(!Object.keys(listOfDirectory).includes("" + tempDirectory.folder)) {
            listOfDirectory[tempDirectory.folder] = [];
            listOfDirectory[tempDirectory.folder].push(tempDirectory);
            tempDirectory = folders[tempDirectory.folder];
            if (
              tempDirectory.folder === ROOT &&
              listOfDirectory[tempDirectory.folder].filter(d => d.id === tempDirectory.id).length === 0
            )
              listOfDirectory[tempDirectory.folder].push(tempDirectory);
          }
        } 
        else if (listOfDirectory[tempDirectory.folder].filter(d => d.id === tempDirectory.id).length === 0)
          listOfDirectory[tempDirectory.folder].push(tempDirectory);
      }
      if (listOfDirectory[document.folder].filter(d => d.id === document.id).length === 0)
        listOfDirectory[document.folder].push(document);
    }
	}
	return listOfDirectory;
};

exports.create = async (currentUser, name, creationDate, isFolder, isNote, path, size, folder, workgroup, task, members) => {
	//Verificare se l'utente appartiene al workgroup
	if (folder === undefined) folder = null;
	if (task === undefined) task = null;
	try {
		const fatherFolder = await this.getDocument(folder);
		if (Object.keys(fatherFolder).length > 0 && !fatherFolder.isfolder) throw new Error("La cartella padre non è una cartella");
		if (await documentService.isNameUsed(name, isFolder, folder)) throw new Error("Il nome del file viola in vincolo di unique");
		const sqlFolder = `INSERT INTO "Document"(name, creationdate, isfolder, isnote, size, folder, workgroup, owner) 
        VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
		try {
			const res = await pool.query(sqlFolder, [name, creationDate, isFolder, isNote, size, folder, workgroup, currentUser]);
			const idDocument = res.rows[0].id;
			if (!isFolder) {
				try {
					await pool.query(`UPDATE "Document" SET path = $1, size = $2 WHERE id = $3`, [path, size, idDocument]);
				} catch (err) {
					// Cancellare query precedente?
					throw new Error("Errore setaggio parametri path and size nel database");
				}
			}
			if (task) {
				const sqlControlTask = `SELECT *
                FROM "UserWorkGroup" uwg, "Section" s, "Task" t
                WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND s.workgroup = uwg.workgroup AND t.section = s.id AND t.id = $3`;
				const resultControlTask = await pool.query(sqlControlTask, [currentUser, workgroup, task]);
				if (resultControlTask.rowCount > 0 && resultControlTask.rows[0].id === task)
					await pool.query('UPDATE "Document" SET task = $1 WHERE id = $2', [task, idDocument]);
			}
			await documentService.setAllMembers(currentUser, idDocument, members, workgroup);
			return res.rowCount > 0 ? res.rows[0] : "";
		} catch (err) {
			throw new Error(err.message);
		}
	} catch (err) {
		throw new Error(err.message);
	}
};

exports.getDocument = async (idDocument) => {
	try {
		const res = await pool.query('SELECT * FROM "Document" d WHERE d.id = $1;', [idDocument]);
		if (res.rowCount > 0) return res.rows[0];
	} catch (err) {
		throw new Error("Il documento proposto non esiste");
	}
	return {};
};
