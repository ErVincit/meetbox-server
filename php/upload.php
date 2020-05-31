<?php

$resp = json_decode("{}");

// 0. Autenticazione con il server
// $url = "https://meetbox-server.herokuapp.com/api/login/validate";

// $ch = curl_init($url);
// curl_setopt($ch, CURLOPT_HTTPHEADER, array("Cookie: token=" . $_COOKIE["token"] . ";token.sig=" . $_COOKIE["token_sig"]));
// curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// $rawResponse = curl_exec($ch);
// curl_close($ch);

// $response = json_decode($rawResponse);

// if (!isset($response->data)) {
  // $resp->error = "Errore";
  // $resp->message = "Devi essere autenticato per caricare il file";
  // echo json_encode($resp);
  // exit;
// }

// 1. Controlla se il file è stato caricato dalla form correttamente
// if (!isset($_FILES['fileToUpload']) || !is_uploaded_file($_FILES['fileToUpload']['tmp_name'])) {
  // $resp->error="Errore";
  // $resp->message="Nessun file inviato";
  // echo json_encode($resp);
  // exit;
// }

// 2. Controlla che il file non ecceda la dimensione massima specifica
$size = $_FILES["fileToUpload"]["size"];
$maxsize = 5000000;
if ($size > $maxsize) {
  $resp->error="Errore";
  $resp->message="La dimensione del file non può superare i 5MB";
  echo json_encode($resp);
  exit;
}

$dir = "uploads/";
$temp = $_FILES["fileToUpload"]["tmp_name"];
$name = $_FILES["fileToUpload"]["name"];

// 3. Sposta il file dalla sua posizione temporanea alla sua posizione finale
if (move_uploaded_file($temp, $dir . $name)) {
  // 4. Ritorna la path e la dimensione del file caricato
  $resp->path = $name;
  $resp->size = filesize($dir . $name);
  echo json_encode($resp);
} else {
  $resp->error = "Errore";
  $resp->message = "Caricamento fallito";
  echo json_encode($resp);
}

?>
