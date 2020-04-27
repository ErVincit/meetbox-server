const pool = require("../../database");

const workgroupServices = require('./workgroup');

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
    if (list.length > 0) return list;
    return {};
}

exports.setAllMembers = async (currentUser, documentid, members, workgroup) => {
    if (members === undefined) { // Oppure errore?
        members = [];
        const res = await workgroupServices.getAllMembers(currentUser, workgroup);
        for (var i = 0; i < res.length; i++) 
            members.push(res[i].id);
    } else if (members === null) throw new Error("Non è possibile settare a null il parametro members");
    else if (members === []) members = [currentUser];

    // Controllare se utenti appartengono al workgroup

    for (var j = 0; j < members.length; j++) 
        await pool.query('INSERT INTO "UserDocument" VALUES($1, $2)', [members[j], documentid]);
}

exports.edit = async (currentUser, idDocument, idWorkgroup, members, name, folder) => {
    //Se documento esiste e fa parte di quel workgroup
    if (members) await this.editMembers(currentUser, idDocument, idWorkgroup, members);
    if (name) await this.editName(currentUser, idDocument, idWorkgroup, name);
    if (folder) await this.editFolder(currentUser, idDocument, idWorkgroup, folder);
};

exports.delete = async (currentUser, idDocument, idWorkgroup) => {
    //Se documento esiste
    //Se documento fa parte dello stesso stesso workgroup di cui fai parte
    //Se puoi vedere il documento
    try {
        const exists = await this.get(currentUser, idDocument, idWorkgroup);
        if (Object.keys(exists).length === 0) 
            throw new Error("Il documento non esiste");
        if (!this.enabledToWatch(currentUser, idDocument, idWorkgroup)) 
            throw new Error("Non è possibile editare questo documento");
        //Allora elimina il documento
        await pool.query('DELETE FROM "UserDocument" WHERE document = $1', [idDocument]);
        await pool.query('DELETE FROM "Document" WHERE id = $1', [idDocument]);
    } catch (err) {
        console.log(err.message)
        throw new Error(err.message);
    }
};

exports.editMembers = async (currentUser, idDocument, idWorkgroup, members) => {
    //Se documento esiste
    //Se documento fa parte dello stesso stesso workgroup di cui fai parte
    //Se puoi vedere il documento
    if (!await this.enabledToWatch(currentUser, idDocument, idWorkgroup)) 
        throw new Error("Non è possibile editare questo documento");
    if (!(await workgroupServices.checkWorkgroupMembers(members, idWorkgroup, currentUser)))
        throw new Error("Ci sono dei membri forniti che non fanno parte del workgroup");
    // Delete old members
    await pool.query('DELETE FROM "UserDocument" WHERE document = $1', [idDocument]);
    // Add new members
    for (const member of members) await pool.query('INSERT INTO "UserDocument" (user, document) VALUES ($1, $2)', [member, idDocument]);
}

exports.editName = async (currentUser, idDocument, idWorkgroup, name) => {
    //Se documento esiste
    //Se documento fa parte dello stesso stesso workgroup di cui fai parte
    //Se puoi vedere il documento
    if (!await this.enabledToWatch(currentUser, idDocument, idWorkgroup)) 
        throw new Error("Non è possibile editare questo documento");
    //Allora edit il documento
    await pool.query('UPDATE "Document" SET name = $1 WHERE id = $2', [name, idDocument]);
}

exports.editFolder = async (currentUser, idDocument, idWorkgroup, folder) => {
    //Se documento esiste
    //Se documento fa parte dello stesso stesso workgroup di cui fai parte
    //Se puoi vedere il documento
    if (!await this.enabledToWatch(currentUser, idDocument, idWorkgroup)) 
        throw new Error("Non è possibile editare questo documento");
    //Allora edit il documento
    await pool.query('UPDATE "Document" SET name = $1 WHERE id = $2', [name, idDocument]);
}

exports.enabledToWatch = async (currentUser, idDocument, idWorkgroup) => {
    const documentOwner = await pool.query(`SELECT * FROM "Document" d WHERE d.id = $1 AND d.owner = $2 AND d.workgroup = $3`, [idDocument, currentUser, idWorkgroup]);
    const sqlDocumentMembers = `SELECT *
    FROM "Document" d, "UserDocument" ud, "UserWorkGroup" uw
    WHERE d.id = $1 AND ud.document = d.id AND ud.userid = $2 AND d.workgroup = $3;`;
    const documentMember = await pool.query(sqlDocumentMembers, [idDocument, currentUser, idWorkgroup]);

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
    if (list.length > 0 && list[0].id == idDocument /*&& !list[0].isfolder*/) return true;
    // else if (list.length > 0 && list[0].id === idDocument && list[0].isfolder) {
    //     const sons = await pool.query(
    //         `SELECT
    //         FROM "Document"
    //         WHERE`,
    //         []
    //     );
    // }
    else return false;
}