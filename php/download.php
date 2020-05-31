<?php

$resp = json_decode("{}");

// 0. Verificare i parametri siano forniti
if (!isset($_POST["workgroupId"]) || !isset($_POST["documentId"])) {
    $resp->error = "Errore";
    $resp->message = "E' necessario specificare il workgroup e documento che si vuole scaricare";
    echo json_encode($resp);
    exit;
}

$workgroupId = $_POST["workgroupId"];
$documentId = $_POST["documentId"];

// 0. Verifica autorizzazione a scaricare il documento
$url = "https://meetbox-server.herokuapp.com/api/workgroup/$workgroupId/drive/document/$documentId";

$ch = curl_init($url);
// curl_setopt($ch, CURLOPT_HTTPHEADER, array("Cookie: token=" . $_COOKIE["token"] . ";token.sig=" . $_COOKIE["token_sig"]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$rawResponse = curl_exec($ch);
if (curl_errno($ch)) { 
   print curl_error($ch); 
} 
curl_close($ch);

$response = json_decode($rawResponse);
echo "Resp: " . $rawResponse;

if (!isset($response->data)) {
    echo json_encode($response);
    exit;
}

// 1. Verificare che il documento abbiamo un file associato
if (!isset($response->data->path)) {
    $resp->error = "Errore";
    $resp->message = "Nessun file risulta associato a questo documento";
    echo json_encode($resp);
    exit;
}

$name = $response->data->path;
$path = "uploads/" . $response->data->path;

// 2. Avviare il download del file
if (file_exists($path)) {
    header("Content-Type: application/octet-stream");
    header("Content-Length: " . filesize($path));
    header("Content-Disposition: attachment; filename=$name");
    readfile($path);
    exit;
} else {
    $resp->error = "Errore";
    $resp->message = "La path del documento sembra non esistere";
    echo json_encode($resp);
    exit;
}

?>