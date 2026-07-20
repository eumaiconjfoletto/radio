<?php
declare(strict_types=1);
require_once __DIR__ . '/init_session.php';
header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['site_logged_in'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sessão expirada. Faça login novamente.']);
    exit;
}

$permissoes = $_SESSION['permissoes'] ?? [];

$allowedSections = ['streaming', 'programacao', 'noticias', 'site', 'tema', 'banners', 'usuarios'];
$section = $_GET['section'] ?? '';

if (!in_array($section, $allowedSections, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Seção inválida.']);
    exit;
}

$permMap = [
    'streaming' => 'streaming',
    'programacao' => 'programacao',
    'noticias' => 'noticias',
    'banners' => 'banners',
    'site' => 'site',
    'tema' => 'tema',
    'usuarios' => 'usuarios',
];
if (!in_array($permMap[$section] ?? '', $permissoes, true) && empty($_SESSION['is_super_admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Sem permissão para esta seção.']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON inválido.']);
    exit;
}

$valid = false;
switch ($section) {
    case 'streaming':
        $valid = isset($data['stream_url'], $data['titulo']);
        break;
    case 'programacao':
        $valid = isset($data['programas']) && is_array($data['programas']);
        break;
    case 'noticias':
        $valid = isset($data['noticias']) && is_array($data['noticias']);
        break;
    case 'site':
        $valid = isset($data['sobre_texto']);
        break;
    case 'tema':
        $valid = isset($data['preset']);
        break;
    case 'banners':
        $valid = isset($data['banners']) && is_array($data['banners']);
        break;
    case 'usuarios':
        $valid = isset($data['usuarios']) && is_array($data['usuarios']);
        // Hash plaintext passwords
        if ($valid) {
            $changed = false;
            foreach ($data['usuarios'] as &$u) {
                if (!empty($u['password_plain'])) {
                    $u['password_hash'] = password_hash($u['password_plain'], PASSWORD_BCRYPT);
                    unset($u['password_plain']);
                    $changed = true;
                }
            }
            unset($u);
            if ($changed) {
                $data['usuarios'] = array_values($data['usuarios']);
            }
        }
        break;
}

if (!$valid) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Formato de dados inesperado para esta seção.']);
    exit;
}

$dataDir = __DIR__ . '/../data';
$backupDir = $dataDir . '/backups';

$fileMap = [
    'streaming' => 'streaming.json',
    'programacao' => 'programacao.json',
    'noticias' => 'noticias.json',
    'site' => 'site.json',
    'tema' => 'theme.json',
    'banners' => 'banners.json',
    'usuarios' => 'usuarios.json',
];
$filePath = $dataDir . '/' . ($fileMap[$section] ?? $section . '.json');

if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

if (file_exists($filePath)) {
    $backupName = $section . '_' . date('Ymd_His') . '.json';
    copy($filePath, $backupDir . '/' . $backupName);
}

$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$written = file_put_contents($filePath, $json, LOCK_EX);

if ($written === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Não foi possível gravar o arquivo. Verifique as permissões da pasta "data".',
    ]);
    exit;
}

echo json_encode(['success' => true]);
