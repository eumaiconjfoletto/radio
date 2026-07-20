<?php
declare(strict_types=1);
require_once __DIR__ . '/init_session.php';
header('Content-Type: application/json; charset=utf-8');

if (!empty($_SESSION['site_logged_in'])) {
    // Backward compatibility — sessőes antigas sem permissoes
    if (!isset($_SESSION['permissoes'])) {
        $_SESSION['permissoes'] = ['streaming','programacao','noticias','banners','site','tema','usuarios'];
        $_SESSION['is_super_admin'] = true;
    }
    echo json_encode([
        'authenticated' => true,
        'username' => $_SESSION['username'] ?? '',
        'permissoes' => $_SESSION['permissoes'],
        'is_super_admin' => !empty($_SESSION['is_super_admin']),
        'csrf_token' => $_SESSION['csrf_token'] ?? ''
    ]);
    exit;
}

http_response_code(401);
echo json_encode(['authenticated' => false]);
