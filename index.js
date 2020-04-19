const express = require("express");
const main = express();

const { Pool } = require("pg");

const admin = require("firebase-admin");

// Initialize dotenv
require("dotenv").config();

const serviceAccount = {
	project_id: process.env.PROJECT_ID,
	private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
	client_email: process.env.CLIENT_EMAIL,
};

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	storageBucket: process.env.STORAGE,
});

const bucket = admin.storage().bucket();

const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");

main.use(bodyParser.urlencoded({ extended: true }));
main.use(fileUpload());

main.get("/", (req, res) => {
	res.writeHead(200, { "Content-Type": "text/html" });
	res.write('<form action="upload" method="post" enctype="multipart/form-data">');
	res.write('<input type="file" name="filetoupload"><br>');
	res.write('<input type="submit">');
	res.write("</form>");
	return res.end();
});

main.post("/upload", async (req, res) => {
	for (const name in req.files) {
		const file = req.files[name];
		const filename = file.name;
		const data = file.data;
		const fbFile = bucket.file(filename);
		await fbFile.save(data);
	}
	res.send({ msg: "Ok" });
});

main.get("/download", async (req, res) => {
	const file = bucket.file("ciao.txt");
	const stream = file.createReadStream();
	res.attachment("ciao.txt");
	stream.pipe(res);
});

main.get("/db", async (req, res) => {
	const pool = new Pool({ connectionString: process.env.DB_CONNECTION, ssl: true });
	const client = await pool.connect();
	const result = await client.query("select * from ciao");
	client.release();
	res.status(200).send({ data: result.rows });
});

main.listen(process.env.PORT, () => {
	console.log("Server created");
});
