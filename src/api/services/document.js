const pool = require("../../database");

const workgroupServices = require('./workgroup');

exports.setAllMembers = async (currentUser, documentid, members, workgroup) => {
    // if (members.len) { //Se non ci sono membri allora impostare i diritti della cartella
            
    // } else { //Impostare i diritti ad ogni singolo doc

    // }

    if (members === undefined) { // Oppure errore?
        members = [];
        const res = await workgroupServices.getAllMembers(currentUser, workgroup);
        for (var i = 0; i < res.length; i++) members.push(res[i].id);
    } else if (members === null) throw new Error("Non è possibile settare a null il parametro members");
    else if (members === []) members = [currentUser];

    // Controllare se utenti appartengono al workgroup

    for (var j = 0; j < members.length; j++) {
        console.log("Imposto a", members[j], "il documento", documentid)
        await pool.query('INSERT INTO "UserDocument" VALUES($1, $2)', [members[j], documentid]);
    }
}