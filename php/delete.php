<?php
	
	$path = $_POST["path"];
    
    if (!isset($path)) {
    	echo json_encode(["error" => "Error", "message" => "E' necessario fornire una path per cancellare un file"]);
    	exit;
    }
    $dir = "uploads/";
    
    $result = unlink($dir . $path);
    echo json_encode(["data" => $result]);
?>
