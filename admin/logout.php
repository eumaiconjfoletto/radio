<?php
declare(strict_types=1);
require_once __DIR__ . '/init_session.php';
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    setcookie(session_name(), '', time() - 42000, '/');
}
session_destroy();
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => true]);
