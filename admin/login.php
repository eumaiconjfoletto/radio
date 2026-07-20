<?php
declare(strict_types=1);
require_once __DIR__ . '/init_session.php';
header('Content-Type: application/json; charset=utf-8');

$credentials = require __DIR__ . '/../config/credentials.php';
$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = (string) ($input['password'] ?? '');

usleep(300000);

if ($username !== '') {
    // Super admin (config/credentials.php)
    if (
        hash_equals($credentials['username'], $username) &&
        password_verify($password, $credentials['password_hash'])
    ) {
        session_regenerate_id(true);
        $_SESSION['site_logged_in'] = true;
        $_SESSION['username'] = $username;
        $_SESSION['is_super_admin'] = true;
        $_SESSION['permissoes'] = ['streaming','programacao','noticias','banners','site','tema','usuarios'];
        echo json_encode(['success' => true, 'csrf_token' => $_SESSION['csrf_token'], 'permissoes' => $_SESSION['permissoes']]);
        exit;
    }

    // Multi-user (data/usuarios.json)
    $usersPath = __DIR__ . '/../data/usuarios.json';
    if (file_exists($usersPath)) {
        $usersData = json_decode(file_get_contents($usersPath), true);
        if (is_array($usersData)) {
            foreach (($usersData['usuarios'] ?? []) as $user) {
                if (
                    isset($user['username'], $user['password_hash']) &&
                    hash_equals($user['username'], $username) &&
                    password_verify($password, $user['password_hash'])
                ) {
                    session_regenerate_id(true);
                    $_SESSION['site_logged_in'] = true;
                    $_SESSION['username'] = $username;
                    $_SESSION['is_super_admin'] = false;
                    $_SESSION['permissoes'] = $user['permissoes'] ?? [];
                    echo json_encode(['success' => true, 'csrf_token' => $_SESSION['csrf_token'], 'permissoes' => $_SESSION['permissoes']]);
                    exit;
                }
            }
        }
    }
}

http_response_code(401);
echo json_encode(['success' => false, 'message' => 'Usuário ou senha inválidos.']);
