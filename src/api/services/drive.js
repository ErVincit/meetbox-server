const pool = require("../../database");

const documentService = require('./document');

exports.tree = async (currentUser, workgroup) => {
    const sqlOwner = `SELECT d.id, d.name, d.creationdate, d.isfolder, d.isnote, d.path, d.size, d.owner, d.folder, d.workgroup, d.task
    FROM "Document" d
    WHERE d.owner = $1 AND d.workgroup = $2;`;

    const sqlMembers = `SELECT d.id, d.name, d.creationdate, d.isfolder, d.isnote, d.path, d.size, d.owner, d.folder, d.workgroup, d.task
	FROM "Document" d, "UserDocument" ud
    WHERE ud.document = d.id AND ud.userid = $1 AND d.workgroup = $2`
    var resultO = {};
    var resultM = {};
    try {
        resultO = await pool.query(sqlOwner, [currentUser, workgroup]);
        resultM = await pool.query(sqlMembers, [currentUser, workgroup]);
    } catch (err) {
        throw new Error(err.name);
    }
    
    const list = [];
    if (resultO.rowCount > 0) {
        if (resultM.rowCount > 0) {
            const totalId = [];
            resultO.rows.forEach((element) => {
                list.push(element);
                totalId.push(element.id);
            });
            resultM.rows.forEach((element) => {
                if (!totalId.includes(element.id)){ 
                    totalId.push(element.id);
                    list.push(element);
                }
            });
        } else list = resultO.rows;
    } else list = resultM.rows;

    listOfDirectory = {};
    for (var i = 0; i < list.length; i++) {
        const document = list[i];
        if (document.folder === null || document.folder === undefined) document.folder = "root";
        if (!Object.keys(listOfDirectory).includes("" + document.folder)) listOfDirectory[document.folder] = [];
        listOfDirectory[document.folder].push(document);
    }
    return listOfDirectory;
}

exports.create = async (currentUser, name, creationDate, isFolder, isNote, path, size, folder, workgroup, task, members) => {
    if (folder === undefined) folder = null;
    if (task === undefined) task = null;
    try {
        const fatherFolder = await this.getDocument(folder);
        if (Object.keys(fatherFolder).length > 0 && !fatherFolder.isfolder) throw new Error("La cartella padre non è una cartella");
        if (await this.isNameUsed(name, isFolder, folder)) throw new Error("Il nome del file viola in vincolo di unique");
        const sqlFolder = `INSERT INTO "Document"(name, creationdate, isfolder, isnote, size, folder, workgroup, owner) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`;
        try {
            const res = await pool.query(sqlFolder, [name, creationDate, isFolder, isNote, size, folder, workgroup, currentUser]);
            const idDocument = res.rows[0].id;
            if (!isFolder) {
                const sqlIsFolder = `UPDATE "Document" SET path = $1, size = $2 WHERE id = $3`;
                try {
                    await pool.query(sqlIsFolder, [path, size, idDocument]);
                } catch (err) {
                    // Cancellare query precedente?
                    console.log(err)
                    throw new Error("Errore setaggio parametri path and size nel database");
                }
            }
            await documentService.setAllMembers(currentUser, idDocument, members, workgroup);
            return res.rowCount > 0 ? idDocument : "";
        } catch (err) {
            console.log(err)
            throw new Error(err.message);
        }
    } catch (err) {
        console.log(err)
        throw new Error(err.message);
    }
}

exports.getDocument = async (idDocument) => {
    try {
        const res = await pool.query('SELECT * FROM "Document" d WHERE d.id = $1;', [idDocument]);
        if (res.rowCount > 0) return res.rows[0];
    } catch (err) {
        console.log(err);
        throw new Error("Il documento proposto non esiste");
    }
    return {};
}

exports.isNameUsed = async (name, isFolder, idFolder) => {
    try {
        const res = await pool.query(`SELECT * FROM "Document" d WHERE d.name = $1 AND d.isfolder = $2 AND d.folder = $3;`, [name, isFolder, idFolder]);
        if (res.rowCount > 0) return true;
        return false;
    } catch (err) {
        console.log(err)
        throw new Error("Errore esecuzione query di controllo");
    }
}