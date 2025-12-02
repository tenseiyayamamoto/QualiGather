<?php
require_once 'db_access_ora.php';
try {
  $conn = oracle_con($_GET['base']);

  $sql = "
           SELECT
                M3412.FLWCNTRLNUM,
                M3412.OCCURRDT,
                M3412.MODELNUM,
                M0413.PHNMNDTILCD,
                M0413.PHNMNDTILNM,
                M0417.CAUSEDTILCD,
                M0417.CAUSEDTILNM,
                M0324.STTNNM AS DISPRO,
                TABLE_ANALYSIS.STTNNM AS OCCPRO,
                M3412.QRAFLAG,
                M3412.RMRKS AS P_RMRKS,
                M3413.RMRKS AS C_RMRKS,
                M3412.QRNO,
                M3412.IDNTID,
                M3412.LINECD,
                M0100.JCNAME,
                M3412.LINDROPNO,
                M3412.REENTRYDT,
                TABLE_REENTRY.STTNNM AS REENTRY_STATION,
                M3412.REENTRYRMRKS,
                NVL(M3433.QRA_FLAG, 0) AS QRA_FLAG,
                NVL(M3433.SPCL_CHR_FLAG, 0) AS SPCL_CHR_FLAG
            FROM
                M3412
            LEFT OUTER JOIN M0413 ON
                M3412.PHNMNDTILCD = M0413.PHNMNDTILCD
            LEFT OUTER JOIN M0100 ON
                M3412.RGSTCD = M0100.JC
            LEFT OUTER JOIN M3413 ON
                M3412.LINDROPNO = M3413.LINDROPNO
            LEFT OUTER JOIN M0417 ON
                M3413.CAUSEDTILCD = M0417.CAUSEDTILCD
            INNER JOIN M0324 ON
                M3412.STTNCD = M0324.STTNCD
            INNER JOIN M0331 ON
                M0324.LINECD = M0331.LINECD
            LEFT OUTER JOIN M0324 TABLE_ANALYSIS ON
                M3413.STTNCD = TABLE_ANALYSIS.STTNCD
            LEFT OUTER JOIN M0324 TABLE_REENTRY ON
                M3412.REENTRYSTTNCD = TABLE_REENTRY.STTNCD
            LEFT OUTER JOIN M3433 ON
                M3412.LINDROPNO = M3433.LINDROPNO
            WHERE
                M3412.OCCURRDT >= :B3
                AND M3412.OCCURRDT <= :B4
                AND M3412.AVLFLG = 1";

    // QRA・重品の条件追加
    $isQRA = isset($_GET['qra']) ? filter_var($_GET['qra'], FILTER_VALIDATE_BOOLEAN) : false;
    $isCQI = isset($_GET['cqi']) ? filter_var($_GET['cqi'], FILTER_VALIDATE_BOOLEAN) : false;

    if ($isQRA && !$isCQI) {
        $sql .= " AND M3433.QRA_FLAG = 1 ";
    } elseif (!$isQRA && $isCQI) {
        $sql .= " AND M3433.SPCL_CHR_FLAG = 1 ";
    } elseif ($isQRA && $isCQI) {
        $sql .= " AND M3433.QRA_FLAG = 1 AND M3433.SPCL_CHR_FLAG = 1 ";
    }

    // ラインのチェックボックスがONの場合、ラインを部分一致で検索する条件を追加
    if (!empty($_GET['line'])) {
        $sql .= " AND M3412.LINECD LIKE :B1 ";
    }

    // モデルのチェックボックスがONの場合、モデルを部分一致で検索する条件を追加
    if (!empty($_GET['model'])) {
        $sql .= " AND M3412.MODELNUM LIKE :B2 ";
    }

  $sql .= " ORDER BY occurrdt DESC";

  $stmt = oci_parse($conn, $sql);
  
// ライン
if (!empty($_GET['line'])) {
     $likeLine = '%' . $_GET['line'] . '%';
    oci_bind_by_name($stmt, ":B1", $likeLine);
}

// モデル
if (!empty($_GET['model'])) {
     $likeModel = '%' . $_GET['model'] . '%';
    oci_bind_by_name($stmt, ":B2", $likeModel);
}

// 開始日と終了日
oci_bind_by_name($stmt, ":B3", $_GET['start_date']);
oci_bind_by_name($stmt, ":B4", $_GET['end_date']);


// SQL全文をログファイルに出力
error_log("[SQL] " . $sql);

oci_execute($stmt);

  $json_array = [];
  while ($row = oci_fetch_assoc($stmt)) {
    $json_array[] = $row;
  }

  oci_free_statement($stmt);
  oci_close($conn);
} catch (Exception $e) {
    header('Content-type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
    exit;
}

header('Content-type: application/json');
echo json_encode($json_array, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
exit;
