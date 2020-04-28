const pool = require("../../database");

const workgroupServices = require('./workgroup');
const driveService = require('./drive');

exports.get = async (currentUser, idDocument, idWorkgroup) => {
    const sql = `SELECT d.id, d.name, d.creationdate, d.isfolder, d.isnote, d.path, d.size, d.owner, d.folder, d.workgroup, d.task
    FROM "Document" d, "UserDocument" ud, "UserWorkGroup" uw
    WHERE d.id = $1 AND ud.userid = $2 AND uw.userid = ud.userid AND d.workgroup = $3`

    const sqlOwner = `SELECT d.id, d.name, d.creationdate, d.isfolder, d.isnote, d.path, d.size, d.owner, d.folder, d.workgroup, d.task
    FROM "Document" d
    WHERE d.id = $1 AND d.owner = $2 AND d.workgroup = $3` 
    const resOwner = await pool.query(sqlOwner, [idDocument, currentUser, idWorkgroup]);
    const res = await pool.query(sql, [idDocument, currentUser, idWorkgroup]);

    var list = [];
    if (resOwner.rowCount > 0) {
        if (res.rowCount > 0) {
            const totalId = [];
            resOwner.rows.forEach((element) => {
                list.push(element);
                totalId.push(element.id);
            });
            res.rows.forEach((element) => {
                if (!totalId.includes(element.id)){ 
                    totalId.push(element.id);
                    list.push(element);
                }
            });
        } else list = resOwner.rows;
    } else list = res.rows;
    if (list.length > 0) return list[0];
    return {};
}

exports.setAllMembers = async (currentUser, documentid, members, idWorkgroup) => {
    if (members === undefined) {
        members = [];
        const res = await workgroupServices.getAllMembers(currentUser, idWorkgroup);
        for (var i = 0; i < res.length; i++) 
            members.push(res[i].id);
    } else if (members === null) throw new Error("Non è possibile impostare a null il parametro members");
    else if (members === []) members = [currentUser];

    try {
        if (!await workgroupServices.checkWorkgroupMembers(members, idWorkgroup, currentUser)) 
            throw new Error("Uno o piu membri non appartengono a questo workgroup");
    
        for (var j = 0; j < members.length; j++) 
            await pool.query('INSERT INTO "UserDocument" VALUES($1, $2)', [members[j], documentid]);
    } catch (err) {
        throw err;
    }
}

exports.edit = async (currentUser, idDocument, idWorkgroup, members, name, folder) => {
    //Se documento esiste e fa parte di quel workgroup -> controlli delegati alle singole funzioni
    try {
        if (members) await this.editMembers(currentUser, idDocument, idWorkgroup, members);
        if (name) await this.editName(currentUser, idDocument, idWorkgroup, name);
        if (folder) await this.editFolder(currentUser, idDocument, idWorkgroup, folder);
    } catch (err) {
        throw err;
    }
};

exports.delete = async (currentUser, idDocument, idWorkgroup) => {
    const deleteElement = async (document, tree) => {
        if (document.isfolder) {
            const figlioletti = tree[document.id];
            console.log("Figlioletti", figlioletti);
            if (figlioletti)
                for (var i = 0; i < figlioletti.length; i++) {
                    deleteElement(figlioletti[i], tree);
                }
            if (await isFolderEmpty(document.id, idWorkgroup)) {
                console.log("Cancello cartella:", document.id);
                await pool.query('DELETE FROM "UserDocument" WHERE document = $1', [document.id]);
                await pool.query('DELETE FROM "Document" WHERE id = $1', [document.id]);
            }
        } else {
            console.log("Cancello file:", document.id);
            await pool.query('DELETE FROM "UserDocument" WHERE document = $1', [document.id]);
            await pool.query('DELETE FROM "Document" WHERE id = $1', [document.id]);
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
            throw new Error("Non è possibile eliminare questo documento poichè non ti è accessibile");
        if (exists.isfolder) { //Cancellare prima tutti i file sottostanti ricorsivamente
            const files = await driveService.tree(currentUser, idWorkgroup);
            deleteElement(exists, files);
        } else deleteElement(exists);
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
    console.log("Numero figli rimanenti", resultO.rowCount);
    if (resultO.rowCount > 0) 
        return false;
    else return true;
}

exports.editMembers = async (currentUser, idDocument, idWorkgroup, members) => {
    //Se documento esiste
    //Se documento fa parte dello stesso stesso workgroup di cui fai parte
    //Se puoi vedere il documento
    if (!await this.enabledToWatch(currentUser, idDocument, idWorkgroup)) 
        throw new Error("Accesso al documento negato");
    if (!(await workgroupServices.checkWorkgroupMembers(members, idWorkgroup, currentUser)))
        throw new Error("Ci sono dei membri forniti che non fanno parte del workgroup");
    // Delete old members
    await pool.query('DELETE FROM "UserDocument" WHERE document = $1', [idDocument]);
    // Add new members
    for (const member of members) 
        await pool.query('INSERT INTO "UserDocument" (user, document) VALUES ($1, $2)', [member, idDocument]);
}

exports.editName = async (currentUser, idDocument, idWorkgroup, name) => {
    //Se documento esiste
    //Se documento fa parte dello stesso stesso workgroup di cui fai parte
    //Se puoi vedere il documento
    if (!await this.enabledToWatch(currentUser, idDocument, idWorkgroup)) 
        throw new Error("Accesso al documento negato");
    //Verificare che non esistono altri file con lo stesso nome
    const doc = await this.get(currentUser, idDocument, idWorkgroup);
    if (await this.isNameUsed(name, doc.isfolder, doc.folder))
        throw new Error("Esiste gia un documento con lo stesso nome");
    //Allora edit il documento
    await pool.query('UPDATE "Document" SET name = $1 WHERE id = $2', [name, idDocument]);
}

exports.editFolder = async (currentUser, idDocument, idWorkgroup, folder) => {
    //Se documento esiste
    //Se documento fa parte dello stesso stesso workgroup di cui fai parte
    //Se puoi vedere il documento
    if (!await this.enabledToWatch(currentUser, idDocument, idWorkgroup)) 
        throw new Error("Accesso al documento negato");
    //Se il documento è una cartella, verificare che la cartella padre non sia proprio questa cartella
    if (idDocument == folder)
        throw new Error("Non puoi spostare la cartella in se stessa");
    //Se la cartella padre è visibile all'utente corrente
    if (!await this.enabledToWatch(currentUser, folder, idWorkgroup))
        throw new Error("Non puoi spostare il documento in una cartella non accessibile");
    //Verificare che non esistono altri file con lo stesso nome
    const doc = await this.get(currentUser, idDocument, idWorkgroup);
    if (await this.isNameUsed(doc.name, doc.isfolder, folder))
        throw new Error("Esiste gia un documento con lo stesso nome");
    //Allora cambia padre al documento
    await pool.query(
        `UPDATE "Document" SET folder = $1 WHERE id = $2`, 
        [folder, idDocument]
    );
}

exports.enabledToWatch = async (currentUser, idDocument, idWorkgroup) => {
    const documentOwner = await pool.query( //Verifichiamo se documento appartenga a quel workgroup e se l'utente corrente ne è il proprietario
        `SELECT * FROM "Document" d WHERE d.id = $1 AND d.owner = $2 AND d.workgroup = $3`, 
        [idDocument, currentUser, idWorkgroup]
    );
    const documentMember = await pool.query( //Verifichiamo che il documento appartenga correttamente al workgroup e che l'utente corrente ne sia membro (doc e workG)
        `SELECT *
        FROM "Document" d, "UserDocument" ud, "UserWorkGroup" uw
        WHERE d.id = $1 AND ud.document = d.id AND ud.userid = $2 AND d.workgroup = $3;`, 
        [idDocument, currentUser, idWorkgroup]
    );

    var list = [];
    if (documentOwner.rowCount > 0) {
        if (documentMember.rowCount > 0) {
            const totalId = [];
            documentOwner.rows.forEach((element) => {
                list.push(element);
                totalId.push(element.id);
            });
            documentMember.rows.forEach((element) => {
                if (!totalId.includes(element.id)){ 
                    totalId.push(element.id);
                    list.push(element);
                }
            });
        } else list = documentOwner.rows;
    } else list = documentMember.rows;
    
    if (list.length > 0 && list[0].id == idDocument && !list[0].isfolder) return true;
    else if (list.length > 0 && list[0].id == idDocument && list[0].isfolder) {
        if (list[0].owner == currentUser) return true;  //Se cartella vuota e sei owner, visualizza
        //Se esiste un file al suo interno che puoi visualizzare
        const documentOwner = await pool.query( //Prendiamo i file figli della cartella che di cui l'utente corrente e il creatore
            `SELECT * FROM "Document" d WHERE d.folder = $1 AND d.owner = $2 AND d.workgroup = $3`, 
            [idDocument, currentUser, idWorkgroup]
        );
        const documentMember = await pool.query( //Prendiamo i file figli della cartella che l'utente corrente può visualizzare
            `SELECT *
            FROM "Document" d, "UserDocument" ud, "UserWorkGroup" uw
            WHERE d.folder = $1 AND ud.document = d.id AND ud.userid = $2 AND uw.userid = ud.userid AND d.workgroup = $3;`,
            [idDocument, currentUser, idWorkgroup]
        );

        if (documentOwner.rowCount > 0 || documentMember.rowCount > 0)
            return true;
        return false;
    }
    else return false;
}

exports.isNameUsed = async (name, isFolder, idFolder) => {
    console.log(name, isFolder, idFolder)
    try {
        const res = await pool.query(
            `SELECT * FROM "Document" d WHERE d.name = $1 AND d.isfolder = $2 AND d.folder = $3;`, 
            [name, isFolder, idFolder]
        );
        console.log(res.rows)
        if (res.rowCount > 0)
            return true;
        return false;
    } catch (err) {
        throw new Error("Errore esecuzione query di controllo");
    }
}

exports.folderChildren = async (idDocument, currentUser) => {
    const sons = await pool.query(
        `SELECT
        FROM "Document" d
        WHERE d.folder = $1 AND `,
        []
    );
}