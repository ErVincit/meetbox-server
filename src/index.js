// Initialize dotenv
require("dotenv").config();

const express = require("express");
const serveStatic = require("serve-static");
const path = require("path");
const cookieSession = require("cookie-session");
const cors = require("cors");
const main = express();

main.use(cors({ credentials: true, origin: (_origin, callback) => callback(null, true) }));
main.use(express.urlencoded({ extended: true }));
main.use(express.json());
main.use(
	cookieSession({
		name: "token",
		secret: process.env.SESSION_SECRET,
	})
);

// main.get("/creaDB", async (req, res) => {
// 	const pool = require("./database");
// 	const client = await pool.connect();
// 	let query;
// 	query = `CREATE TABLE public."User"
// 	(
// 	    id serial NOT NULL,
// 	    email character varying(500) NOT NULL,
// 	    firstname character varying(100) NOT NULL,
// 	    lastname character varying(100) NOT NULL,
// 	    PRIMARY KEY (id),
// 		UNIQUE(email)
// 	);`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."UserCredential"
// 	(
// 	    userid integer NOT NULL,
// 	    password character varying(256) NOT NULL,
// 	    PRIMARY KEY (userid),
// 	    FOREIGN KEY (userid)
// 	        REFERENCES public."User" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	)`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."WorkGroup"
// 	(
// 	    id serial NOT NULL,
// 	    name character varying(100) NOT NULL,
// 	    image character varying(500),
// 	    owner integer NOT NULL,
// 	    PRIMARY KEY (id),
// 	    FOREIGN KEY (owner)
// 	        REFERENCES public."User" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	);`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."Section"
// 	(
// 	    id serial NOT NULL,
// 	    title character varying(100) NOT NULL,
// 	    workgroup integer NOT NULL,
// 	    index integer NOT NULL,
// 	    PRIMARY KEY (id),
// 	    FOREIGN KEY (workgroup)
// 	        REFERENCES public."WorkGroup" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	);`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."Label"
// 	(
// 	    id serial NOT NULL,
// 	    name character varying(100),
// 	    color character varying(6) NOT NULL,
// 	    workgroup integer,
// 	    PRIMARY KEY (id),
// 	    FOREIGN KEY (workgroup)
// 	        REFERENCES public."WorkGroup" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	);`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."Task"
// 	(
// 	    id serial NOT NULL,
// 	    title character varying(100) NOT NULL,
// 	    description character varying(1000),
// 	    section integer NOT NULL,
// 	    label integer,
// 	    deadline timestamp with time zone,
// 	    owner integer NOT NULL,
// 	    index integer NOT NULL,
// 	    completed boolean NOT NULL,
// 	    PRIMARY KEY (id),
// 	    FOREIGN KEY (section)
// 	        REFERENCES public."Section" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID,
// 	    FOREIGN KEY (label)
// 	        REFERENCES public."Label" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID,
// 	    FOREIGN KEY (owner)
// 	        REFERENCES public."User" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	);`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."Event"
// 	(
// 	    id serial NOT NULL,
// 	    title character varying(100) NOT NULL,
// 	    description character varying(1000),
// 	    "timestampBegin" timestamp with time zone NOT NULL,
// 	    "timestampEnd" timestamp with time zone,
// 	    workgroup integer NOT NULL,
// 	    owner integer NOT NULL,
// 	    PRIMARY KEY (id),
// 	    FOREIGN KEY (workgroup)
// 	        REFERENCES public."WorkGroup" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID,
// 	    FOREIGN KEY (owner)
// 	        REFERENCES public."User" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	);`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."UserTask"
// 	(
// 	    userid integer NOT NULL,
// 	    task integer NOT NULL,
// 	    PRIMARY KEY (userid, task),
// 	    FOREIGN KEY (userid)
// 	        REFERENCES public."User" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID,
// 	    FOREIGN KEY (task)
// 	        REFERENCES public."Task" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	);`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."UserEvent"
// 	(
// 	    userid integer NOT NULL,
// 	    event integer NOT NULL,
// 	    PRIMARY KEY (userid, event),
// 	    FOREIGN KEY (userid)
// 	        REFERENCES public."User" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID,
// 	    FOREIGN KEY (event)
// 	        REFERENCES public."Event" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	);`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."UserWorkGroup"
// 	(
// 	    userid integer NOT NULL,
// 	    workgroup integer NOT NULL,
// 	    PRIMARY KEY (userid, workgroup),
// 	    FOREIGN KEY (userid)
// 	        REFERENCES public."User" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID,
// 	    FOREIGN KEY (workgroup)
// 	        REFERENCES public."WorkGroup" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	);`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."Document"
// 	(
// 	    id serial NOT NULL,
// 	    name character varying(500) NOT NULL,
// 	    creationdate timestamp with time zone NOT NULL,
// 	    isfolder boolean NOT NULL,
// 	    isnote boolean NOT NULL,
// 	    path character varying(1000),
// 	    size integer,
// 	    owner integer NOT NULL,
// 	    folder integer,
// 	    workgroup integer NOT NULL,
// 	    task integer,
// 	    PRIMARY KEY (id),
// 	    UNIQUE (name, folder, isfolder)
// 	        INCLUDE(name, folder, isfolder),
// 		FOREIGN KEY (folder)
// 	        REFERENCES public."Document" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID,
// 	    FOREIGN KEY (owner)
// 	        REFERENCES public."User" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID,
// 	    FOREIGN KEY (workgroup)
// 	        REFERENCES public."WorkGroup" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID,
// 	    FOREIGN KEY (task)
// 	        REFERENCES public."Task" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	);`;
// 	await client.query(query);
// 	query = `CREATE TABLE public."UserDocument"
// 	(
// 	    userid integer NOT NULL,
// 	    document integer NOT NULL,
// 	    PRIMARY KEY (userid, document),
// 	    FOREIGN KEY (userid)
// 	        REFERENCES public."User" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID,
// 	    FOREIGN KEY (document)
// 	        REFERENCES public."Document" (id) MATCH SIMPLE
// 	        ON UPDATE NO ACTION
// 	        ON DELETE NO ACTION
// 	        NOT VALID
// 	);`;
// 	await client.query(query);
// 	res.sendStatus(200);
// });

// main.get("/info", async (req, res) => {
// 	const pool = require("./database");
// 	const result = await pool.query("select * from information_schema.tables");
// 	const data = [];
// 	for (const row of result.rows) data.push(row.table_name);
// 	res.send({ data });
// });

const api = require("./api/api");
main.use("/api", api);

main.use("/", serveStatic(path.join(__dirname, "/dist")));
main.get("*", (req, res)  =>  res.sendFile(path.join(__dirname, "/dist/index.html")));

main.listen(process.env.PORT, () => {
	console.log("Server created");
});
