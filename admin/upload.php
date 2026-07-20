<?php
declare(strict_types=1);
require_once __DIR__ . '/init_session.php';
header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['site_logged_in'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sessão expirada.']);
    exit;
}

$uploadsDir = __DIR__ . '/../uploads';

if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

// GET — listar imagens
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $files = glob($uploadsDir . '/{*.jpg,*.jpeg,*.png,*.gif,*.webp}', GLOB_BRACE);
    $images = [];
    foreach ($files as $f) {
        $images[] = basename($f);
    }
    echo json_encode(['success' => true, 'images' => $images]);
    exit;
}

// POST — upload
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Erro no upload do arquivo.']);
        exit;
    }

    $allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $_FILES['image']['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, $allowed, true)) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Formato não permitido. Use JPG, PNG, GIF ou WebP.']);
        exit;
    }

    $maxSize = 5 * 1024 * 1024; // 5MB
    if ($_FILES['image']['size'] > $maxSize) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Arquivo muito grande. Máximo 5MB.']);
        exit;
    }

    $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
    $name = uniqid() . '.' . $ext;
    $dest = $uploadsDir . '/' . $name;

    if (move_uploaded_file($_FILES['image']['tmp_name'], $dest)) {
        echo json_encode(['success' => true, 'filename' => $name, 'url' => '../uploads/' . $name]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Falha ao salvar o arquivo.']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
