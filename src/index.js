// Initialize dotenv
require("dotenv").config();

const express = require("express");
const cookieSession = require("cookie-session");
const cors = require("cors");
const main = express();

main.use(cors({ preflightContinue: true, credentials: true, origin: (_origin, callback) => callback(null, true) }));
main.use(express.urlencoded({ extended: true }));
main.use(express.json());
main.use(
	cookieSession({
		name: "token",
		secret: process.env.SESSION_SECRET,
	})
);

const api = require("./api/api");
main.use("/api", api);

// const admin = require("firebase-admin");
// const serviceAccount = {
//   project_id: process.env.PROJECT_ID,
//   private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
//   client_email: process.env.CLIENT_EMAIL,
// };

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   storageBucket: process.env.STORAGE,
// });

// const bucket = admin.storage().bucket();

// const fileUpload = require("express-fileupload");

// main.use(fileUpload());

// main.get("/", (req, res) => {
//   res.writeHead(200, { "Content-Type": "text/html" });
//   res.write(
//     '<form action="upload" method="post" enctype="multipart/form-data">'
//   );
//   res.write('<input type="file" name="filetoupload"><br>');
//   res.write('<input type="submit">');
//   res.write("</form>");
//   return res.end();
// });

// main.post("/upload", async (req, res) => {
//   for (const name in req.files) {
//     const file = req.files[name];
//     const filename = file.name;
//     const data = file.data;
//     const fbFile = bucket.file(filename);
//     await fbFile.save(data);
//   }
//   res.send({ msg: "Ok" });
// });

// main.get("/download", async (req, res) => {
//   const file = bucket.file("ciao.txt");
//   const stream = file.createReadStream();
//   res.attachment("ciao.txt");
//   stream.pipe(res);
// });

// main.get("/db", async (req, res) => {
//   const result = await client.query("select * from ciao");
//   client.release();
//   res.status(200).send({ data: result.rows });
// });

main.listen(process.env.PORT, () => {
	console.log("Server created");
});
